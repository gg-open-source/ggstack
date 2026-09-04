import type {
  PaymentProvider,
  ProjectBuilder,
  StackConfig,
} from "../../types.js";

type SupportedPaymentProvider = Exclude<PaymentProvider, "none">;

function isSupportedPaymentProvider(
  provider: string,
): provider is SupportedPaymentProvider {
  return ["stripe", "polar", "autumn"].includes(provider);
}

export function generatePaymentsPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const provider = config.payments.provider;

  if (!isSupportedPaymentProvider(provider)) {
    return;
  }

  builder.addFile(
    "packages/payments/package.json",
    JSON.stringify(getPackageJson(provider), null, 2),
  );

  builder.addFile(
    "packages/payments/tsconfig.json",
    JSON.stringify(
      {
        extends: "@tooling/tsconfig/base.json",
        compilerOptions: {
          outDir: "dist",
          rootDir: "src",
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );

  switch (provider) {
    case "stripe":
      generateStripeFiles(builder);
      break;
    case "polar":
      generatePolarFiles(builder);
      break;
    case "autumn":
      generateAutumnFiles(builder);
      break;
  }
}

function getPackageJson(
  provider: SupportedPaymentProvider,
): Record<string, unknown> {
  return {
    name: "@packages/payments",
    version: "0.0.0",
    private: true,
    type: "module",
    main: "./src/index.ts",
    types: "./src/index.ts",
    scripts: {
      build: ":",
      lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
      format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
      "check-types": "tsc --noEmit",
      ...(provider === "autumn" ? { "autumn:push": "atmn push" } : {}),
    },
    dependencies: {
      "@packages/env": "workspace:*",
      ...getSdkDependencies(provider),
    },
    devDependencies: {
      "@tooling/tsconfig": "workspace:*",
      typescript: "^5.8.0",
    },
  };
}

function getSdkDependencies(
  provider: SupportedPaymentProvider,
): Record<string, string> {
  switch (provider) {
    case "stripe":
      return {
        stripe: "^22.0.0",
        "@upstash/redis": "^1.34.0",
      };
    case "polar":
      return { "@polar-sh/sdk": "^0.49.0" };
    case "autumn":
      return {
        "autumn-js": "^1.2.0",
        atmn: "^1.1.0",
      };
  }
}

function generateStripeFiles(builder: ProjectBuilder): void {
  builder.addFile("packages/payments/src/client.ts", generateStripeClient());
  builder.addFile("packages/payments/src/kv.ts", generateStripeKv());
  builder.addFile("packages/payments/src/types.ts", generateStripeTypes());
  builder.addFile("packages/payments/src/sync.ts", generateStripeSync());
  builder.addFile(
    "packages/payments/src/checkout.ts",
    generateStripeCheckout(),
  );
  builder.addFile("packages/payments/src/webhook.ts", generateStripeWebhook());
  builder.addFile("packages/payments/src/index.ts", generateStripeIndex());
  builder.addFile("packages/payments/README.md", generateStripeReadme());
}

function generateStripeClient(): string {
  return `import Stripe from "stripe";
import { serverEnv } from "@packages/env/server";

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);
`;
}

function generateStripeKv(): string {
  return `import { Redis } from "@upstash/redis";
import { serverEnv } from "@packages/env/server";

export const kv = new Redis({
  url: serverEnv.UPSTASH_REDIS_REST_URL,
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
});

export function stripeUserKey(userId: string): string {
  return \`stripe:user:\${userId}\`;
}

export function stripeCustomerKey(customerId: string): string {
  return \`stripe:customer:\${customerId}\`;
}
`;
}

function generateStripeTypes(): string {
  return `import type Stripe from "stripe";

export type STRIPE_SUB_CACHE =
  | {
      subscriptionId: string | null;
      status: Stripe.Subscription.Status;
      priceId: string | null;
      currentPeriodStart: number | null;
      currentPeriodEnd: number | null;
      cancelAtPeriodEnd: boolean;
      paymentMethod: {
        brand: string | null;
        last4: string | null;
      } | null;
    }
  | {
      status: "none";
    };
`;
}

function generateStripeSync(): string {
  return `import type Stripe from "stripe";
import { stripe } from "./client";
import { kv, stripeCustomerKey, stripeUserKey } from "./kv";
import type { STRIPE_SUB_CACHE } from "./types";

type SubscriptionItemPeriod = Stripe.SubscriptionItem & {
  current_period_start?: number;
  current_period_end?: number;
};

function periodUnix(
  item: SubscriptionItemPeriod | undefined,
  key: "current_period_start" | "current_period_end",
): number | null {
  const value = item?.[key];
  return typeof value === "number" ? value : null;
}

export async function syncStripeDataToKV(
  customerId: string,
): Promise<STRIPE_SUB_CACHE> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
    expand: ["data.default_payment_method"],
  });

  if (subscriptions.data.length === 0) {
    const subData: STRIPE_SUB_CACHE = { status: "none" };
    await kv.set(stripeCustomerKey(customerId), subData);
    return subData;
  }

  const subscription = subscriptions.data[0];
  if (!subscription) {
    const subData: STRIPE_SUB_CACHE = { status: "none" };
    await kv.set(stripeCustomerKey(customerId), subData);
    return subData;
  }

  const item = subscription.items.data[0] as SubscriptionItemPeriod | undefined;
  const paymentMethod = subscription.default_payment_method;

  const subData: STRIPE_SUB_CACHE = {
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId: item?.price.id ?? null,
    currentPeriodStart: periodUnix(item, "current_period_start"),
    currentPeriodEnd: periodUnix(item, "current_period_end"),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paymentMethod:
      paymentMethod && typeof paymentMethod !== "string"
        ? {
            brand: paymentMethod.card?.brand ?? null,
            last4: paymentMethod.card?.last4 ?? null,
          }
        : null,
  };

  await kv.set(stripeCustomerKey(customerId), subData);
  return subData;
}

export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  const customerId = await kv.get<string>(stripeUserKey(userId));
  return customerId ?? null;
}

export async function getSubscription(
  userId: string,
): Promise<STRIPE_SUB_CACHE> {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) {
    return { status: "none" };
  }

  const cached = await kv.get<STRIPE_SUB_CACHE>(stripeCustomerKey(customerId));
  return cached ?? { status: "none" };
}

export async function syncAfterSuccess(
  userId: string,
): Promise<STRIPE_SUB_CACHE | null> {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) {
    return null;
  }

  return syncStripeDataToKV(customerId);
}
`;
}

function generateStripeCheckout(): string {
  return `import { serverEnv } from "@packages/env/server";
import { stripe } from "./client";
import { kv, stripeUserKey } from "./kv";

export async function getOrCreateStripeCustomer(input: {
  userId: string;
  email?: string;
}): Promise<string> {
  const existing = await kv.get<string>(stripeUserKey(input.userId));
  if (existing) {
    return existing;
  }

  const customer = await stripe.customers.create({
    email: input.email,
    metadata: {
      userId: input.userId,
    },
  });

  await kv.set(stripeUserKey(input.userId), customer.id);
  return customer.id;
}

export async function createCheckoutSession(input: {
  userId: string;
  email?: string;
  successUrl: string;
  cancelUrl?: string;
  priceId?: string;
}): Promise<{ url: string }> {
  const customerId = await getOrCreateStripeCustomer({
    userId: input.userId,
    email: input.email,
  });

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: input.priceId ?? serverEnv.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!checkout.url) {
    throw new Error("Stripe checkout session is missing a URL");
  }

  return { url: checkout.url };
}

export async function createBillingPortalSession(input: {
  userId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const customerId = await kv.get<string>(stripeUserKey(input.userId));
  if (!customerId) {
    throw new Error("No Stripe customer for this user");
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: input.returnUrl,
  });

  return { url: portal.url };
}
`;
}

function generateStripeWebhook(): string {
  return `import type Stripe from "stripe";
import { serverEnv } from "@packages/env/server";
import { stripe } from "./client";
import { syncStripeDataToKV } from "./sync";

const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

async function tryCatch<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: unknown }> {
  try {
    return { data: await fn(), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function processEvent(event: Stripe.Event): Promise<void> {
  if (!allowedEvents.includes(event.type)) {
    return;
  }

  const { customer: customerId } = event.data.object as {
    customer?: unknown;
  };

  if (typeof customerId !== "string") {
    throw new Error(
      \`[STRIPE HOOK] Customer id isn't a string. Event type: \${event.type}\`,
    );
  }

  await syncStripeDataToKV(customerId);
}

export async function handleStripeWebhook(
  body: string,
  signature: string | null,
): Promise<{ received: true; status: number }> {
  if (!signature) {
    return { received: true, status: 400 };
  }

  const { error } = await tryCatch(async () => {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET,
    );
    await processEvent(event);
  });

  if (error) {
    console.error("[STRIPE HOOK] Error processing event", error);
  }

  return { received: true, status: 200 };
}
`;
}

function generateStripeIndex(): string {
  return `export { stripe } from "./client";
export { kv } from "./kv";
export type { STRIPE_SUB_CACHE } from "./types";
export {
  getStripeCustomerId,
  getSubscription,
  syncAfterSuccess,
  syncStripeDataToKV,
} from "./sync";
export {
  createBillingPortalSession,
  createCheckoutSession,
  getOrCreateStripeCustomer,
} from "./checkout";
export { handleStripeWebhook, processEvent } from "./webhook";
`;
}

function generateStripeReadme(): string {
  return `# @packages/payments

Shared Stripe package using [Theo's Stripe recommendations](https://github.com/t3dotgg/stripe-recommendations): create the customer **before** checkout, store \`userId ↔ customerId\` in KV, and keep subscription state in sync with a single \`syncStripeDataToKV(customerId)\` function. Do not branch on \`CHECKOUT_SESSION_ID\` or individual webhook payloads.

## Setup

1. Copy the repo-root \`.env.example\` to \`.env\` and fill in the Stripe + Upstash values.
2. In the Stripe Dashboard:
   - Create a product and price, then set \`STRIPE_PRICE_ID\`.
   - **Disable Cash App Pay** (high fraud).
   - Enable **Limit customers to one subscription**.
3. Create an [Upstash Redis](https://upstash.com/) database for the KV store.
4. Point a Stripe webhook at your mounted \`/api/stripe\` route. Use the Stripe CLI locally: \`stripe listen --forward-to localhost:3000/api/stripe\`.
5. Pass your authenticated \`userId\` into \`createCheckoutSession\` / \`syncAfterSuccess\`. This package does not import auth.

### Env vars

- \`STRIPE_SECRET_KEY\`
- \`STRIPE_WEBHOOK_SECRET\`
- \`STRIPE_PRICE_ID\`
- \`UPSTASH_REDIS_REST_URL\`
- \`UPSTASH_REDIS_REST_TOKEN\`

## Flow

1. Subscribe button calls your checkout route.
2. \`createCheckoutSession\` creates a Stripe customer if needed, stores \`stripe:user:<userId>\`, then creates a checkout session **with that customer id**.
3. After payment, Stripe redirects to your \`successUrl\`.
4. That page calls \`syncAfterSuccess(userId)\` so KV is updated even if the webhook is slow.
5. The webhook handler also calls \`syncStripeDataToKV\` on the tracked events. It refetches from Stripe instead of trusting the event body.

## Usage

\`\`\`ts
import {
  createCheckoutSession,
  getSubscription,
  handleStripeWebhook,
  syncAfterSuccess,
} from "@packages/payments";
\`\`\`

App templates do not mount this package. Add the routes after scaffold.

### Next.js App Router

\`\`\`ts
// app/api/stripe/checkout/route.ts
import { createCheckoutSession } from "@packages/payments";

export async function GET(req: Request) {
  const user = await auth(req); // your auth
  const origin = new URL(req.url).origin;
  const { url } = await createCheckoutSession({
    userId: user.id,
    email: user.email,
    successUrl: \`\${origin}/success\`,
    cancelUrl: origin,
  });
  return Response.redirect(url);
}
\`\`\`

\`\`\`ts
// app/success/route.ts
import { syncAfterSuccess } from "@packages/payments";

export async function GET(req: Request) {
  const user = await auth(req);
  await syncAfterSuccess(user.id);
  return Response.redirect(new URL("/", req.url));
}
\`\`\`

\`\`\`ts
// app/api/stripe/route.ts
import { handleStripeWebhook } from "@packages/payments";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const { received, status } = await handleStripeWebhook(body, signature);
  return Response.json({ received }, { status });
}
\`\`\`

### Express

\`\`\`ts
import express from "express";
import {
  createCheckoutSession,
  handleStripeWebhook,
  syncAfterSuccess,
} from "@packages/payments";

app.get("/api/stripe/checkout", async (req, res) => {
  const user = await auth(req);
  const { url } = await createCheckoutSession({
    userId: user.id,
    email: user.email,
    successUrl: "http://localhost:3000/success",
  });
  res.redirect(url);
});

app.get("/success", async (req, res) => {
  const user = await auth(req);
  await syncAfterSuccess(user.id);
  res.redirect("/");
});

app.post(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.header("stripe-signature") ?? null;
    const { received, status } = await handleStripeWebhook(
      req.body.toString("utf8"),
      signature,
    );
    res.status(status).json({ received });
  },
);
\`\`\`

Read subscription state from KV with \`getSubscription(userId)\`.

## Still your problem

Price IDs per environment, exposing sub data to the client, usage metering, and free trials. See the [recommendations doc](https://github.com/t3dotgg/stripe-recommendations) for the full list.
`;
}

function generatePolarFiles(builder: ProjectBuilder): void {
  builder.addFile("packages/payments/src/client.ts", generatePolarClient());
  builder.addFile("packages/payments/src/checkout.ts", generatePolarCheckout());
  builder.addFile("packages/payments/src/customer.ts", generatePolarCustomer());
  builder.addFile("packages/payments/src/webhook.ts", generatePolarWebhook());
  builder.addFile("packages/payments/src/index.ts", generatePolarIndex());
  builder.addFile("packages/payments/README.md", generatePolarReadme());
}

function generatePolarClient(): string {
  return `import { Polar } from "@polar-sh/sdk";
import { serverEnv } from "@packages/env/server";

export const polar = new Polar({
  accessToken: serverEnv.POLAR_ACCESS_TOKEN,
  server: serverEnv.POLAR_SERVER ?? "sandbox",
});
`;
}

function generatePolarCheckout(): string {
  return `import { serverEnv } from "@packages/env/server";
import { polar } from "./client";

export async function createCheckoutSession(input: {
  userId: string;
  email?: string;
  successUrl: string;
  productId?: string;
}): Promise<{ url: string }> {
  const checkout = await polar.checkouts.create({
    products: [input.productId ?? serverEnv.POLAR_PRODUCT_ID],
    successUrl: input.successUrl,
    externalCustomerId: input.userId,
    customerEmail: input.email,
  });

  if (!checkout.url) {
    throw new Error("Polar checkout session is missing a URL");
  }

  return { url: checkout.url };
}

export async function createCustomerPortalSession(input: {
  userId: string;
}): Promise<{ url: string }> {
  const session = await polar.customerSessions.create({
    externalCustomerId: input.userId,
  });

  return { url: session.customerPortalUrl };
}
`;
}

function generatePolarCustomer(): string {
  return `import { polar } from "./client";

export async function getCustomerState(userId: string) {
  return polar.customers.getStateExternal({
    externalId: userId,
  });
}
`;
}

function generatePolarWebhook(): string {
  return `import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { serverEnv } from "@packages/env/server";

function webhookHeaders(
  headers: Headers | Record<string, string | string[] | undefined>,
): Record<string, string> {
  const pick = (name: string): string => {
    if (typeof Headers !== "undefined" && headers instanceof Headers) {
      return headers.get(name) ?? "";
    }

    const value = (headers as Record<string, string | string[] | undefined>)[
      name
    ];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };

  return {
    "webhook-id": pick("webhook-id"),
    "webhook-timestamp": pick("webhook-timestamp"),
    "webhook-signature": pick("webhook-signature"),
  };
}

export async function handlePolarWebhook(
  body: string,
  headers: Headers | Record<string, string | string[] | undefined>,
): Promise<{ ok: true; status: 202 } | { ok: false; status: 403 }> {
  try {
    validateEvent(body, webhookHeaders(headers), serverEnv.POLAR_WEBHOOK_SECRET);
    return { ok: true, status: 202 };
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return { ok: false, status: 403 };
    }
    throw error;
  }
}
`;
}

function generatePolarIndex(): string {
  return `export { polar } from "./client";
export {
  createCheckoutSession,
  createCustomerPortalSession,
} from "./checkout";
export { getCustomerState } from "./customer";
export { handlePolarWebhook } from "./webhook";
`;
}

function generatePolarReadme(): string {
  return `# @packages/payments

Shared Polar payments package. Polar is the merchant of record: bind your user id with \`externalCustomerId\`, then query Polar for customer state instead of mirroring webhooks into your database.

## Setup

1. Create a Polar organization (use the [sandbox](https://sandbox.polar.sh) first).
2. Create an organization access token and a product. Copy the webhook secret from Settings → Webhooks.
3. Copy the repo-root \`.env.example\` to \`.env\` and fill in the Polar values. \`POLAR_SERVER\` is \`sandbox\` or \`production\`.
4. Pass your authenticated \`userId\` into checkout. This package does not import auth.

### Env vars

- \`POLAR_ACCESS_TOKEN\`
- \`POLAR_WEBHOOK_SECRET\`
- \`POLAR_PRODUCT_ID\`
- \`POLAR_SERVER\` (\`sandbox\` or \`production\`; defaults to sandbox)

## Usage

\`\`\`ts
import {
  createCheckoutSession,
  createCustomerPortalSession,
  getCustomerState,
  handlePolarWebhook,
} from "@packages/payments";
\`\`\`

App templates do not mount this package. Add the routes after scaffold.

### Next.js App Router

\`\`\`ts
// app/api/checkout/route.ts
import { createCheckoutSession } from "@packages/payments";

export async function GET(req: Request) {
  const user = await auth(req);
  const origin = new URL(req.url).origin;
  const { url } = await createCheckoutSession({
    userId: user.id,
    email: user.email,
    successUrl: \`\${origin}/success\`,
  });
  return Response.redirect(url);
}
\`\`\`

\`\`\`ts
// app/api/portal/route.ts
import { createCustomerPortalSession } from "@packages/payments";

export async function GET(req: Request) {
  const user = await auth(req);
  const { url } = await createCustomerPortalSession({ userId: user.id });
  return Response.redirect(url);
}
\`\`\`

\`\`\`ts
// app/api/webhook/polar/route.ts
import { handlePolarWebhook } from "@packages/payments";

export async function POST(req: Request) {
  const body = await req.text();
  const { status } = await handlePolarWebhook(body, req.headers);
  return new Response(null, { status });
}
\`\`\`

Read live entitlements with \`getCustomerState(userId)\`.
`;
}

function generateAutumnFiles(builder: ProjectBuilder): void {
  builder.addFile("packages/payments/src/client.ts", generateAutumnClient());
  builder.addFile("packages/payments/src/billing.ts", generateAutumnBilling());
  builder.addFile("packages/payments/src/index.ts", generateAutumnIndex());
  builder.addFile("packages/payments/autumn.config.ts", generateAutumnConfig());
  builder.addFile("packages/payments/README.md", generateAutumnReadme());
}

function generateAutumnClient(): string {
  return `import { Autumn } from "autumn-js";
import { serverEnv } from "@packages/env/server";

export const autumn = new Autumn({
  secretKey: serverEnv.AUTUMN_SECRET_KEY,
});
`;
}

function generateAutumnBilling(): string {
  return `import { autumn } from "./client";

export async function getOrCreateCustomer(input: {
  customerId: string;
  name?: string;
  email?: string;
}) {
  return autumn.customers.getOrCreate({
    customerId: input.customerId,
    name: input.name,
    email: input.email,
  });
}

export async function attachPlan(input: {
  customerId: string;
  planId?: string;
}) {
  return autumn.billing.attach({
    customerId: input.customerId,
    planId: input.planId ?? "pro",
    redirectMode: "always",
  });
}

export async function checkFeature(input: {
  customerId: string;
  featureId: string;
  requiredBalance?: number;
}) {
  return autumn.check({
    customerId: input.customerId,
    featureId: input.featureId,
    requiredBalance: input.requiredBalance ?? 1,
  });
}

export async function trackUsage(input: {
  customerId: string;
  featureId: string;
  value?: number;
}) {
  return autumn.track({
    customerId: input.customerId,
    featureId: input.featureId,
    value: input.value ?? 1,
  });
}

export async function openCustomerPortal(input: {
  customerId: string;
  returnUrl?: string;
}) {
  return autumn.billing.openCustomerPortal({
    customerId: input.customerId,
    returnUrl: input.returnUrl,
  });
}
`;
}

function generateAutumnIndex(): string {
  return `export { autumn } from "./client";
export {
  attachPlan,
  checkFeature,
  getOrCreateCustomer,
  openCustomerPortal,
  trackUsage,
} from "./billing";
`;
}

function generateAutumnConfig(): string {
  return `import { feature, item, plan } from "atmn";

export const messages = feature({
  id: "messages",
  name: "Messages",
  type: "metered",
  consumable: true,
});

export const free = plan({
  id: "free",
  name: "Free",
  autoEnable: true,
  items: [
    item({
      featureId: messages.id,
      included: 5,
      reset: { interval: "month" },
    }),
  ],
});

export const pro = plan({
  id: "pro",
  name: "Pro",
  price: {
    amount: 20,
    interval: "month",
  },
  items: [
    item({
      featureId: messages.id,
      included: 100,
      reset: { interval: "month" },
    }),
  ],
});
`;
}

function generateAutumnReadme(): string {
  return `# @packages/payments

Shared Autumn billing package. Autumn sits on Stripe and is the source of truth for plans, entitlements, and usage. Use your auth user id as \`customerId\` — you do not store extra Stripe ids.

## Setup

1. Create an [Autumn](https://app.useautumn.com/) account and secret key. Connect Stripe in the Autumn dashboard.
2. Copy the repo-root \`.env.example\` to \`.env\` and set \`AUTUMN_SECRET_KEY\`.
3. Edit \`autumn.config.ts\` (starter Free + Pro plans with a metered \`messages\` feature), then push:

\`\`\`bash
pnpm --filter @packages/payments autumn:push
\`\`\`

4. Call \`getOrCreateCustomer\` on signup/login with your auth user id.

### Env vars

- \`AUTUMN_SECRET_KEY\`

## Usage

\`\`\`ts
import {
  attachPlan,
  checkFeature,
  getOrCreateCustomer,
  openCustomerPortal,
  trackUsage,
} from "@packages/payments";

await getOrCreateCustomer({
  customerId: user.id,
  email: user.email,
});

const checkout = await attachPlan({ customerId: user.id, planId: "pro" });
// redirect(checkout.paymentUrl)

const { allowed } = await checkFeature({
  customerId: user.id,
  featureId: "messages",
});

if (allowed) {
  await trackUsage({ customerId: user.id, featureId: "messages" });
}
\`\`\`

App templates do not mount this package. Add a checkout route after scaffold that calls \`attachPlan\` and redirects to \`paymentUrl\`.
`;
}
