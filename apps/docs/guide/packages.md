---
description: env, shadcn/ui, tRPC, auth, payments, and Drizzle or Prisma. Auth, db, tRPC, and payments are not auto-wired into apps.
---

# Packages

## `packages/env` (always)

Typed env via `@t3-oss/env-core` and Zod. Exports:

| Import | Use |
| --- | --- |
| `@<project>/env/server` | `serverEnv` — Node/server variables |
| `@<project>/env/client` | `nextEnv`, `astroEnv`, `expoEnv`, and/or `createViteEnv`, plus `getPublicAuthConfig()` for Clerk/WorkOS |
| `@<project>/env` | Re-exports server and client |

Add new variables in the Zod schemas **and** in the root `.env.example`. Full matrix: [Environment](./environment.md).

```ts
import { serverEnv } from "@my-app/env/server";

const url = serverEnv.DATABASE_URL;
```

## `packages/ui` (shadcn/ui)

Created when you select shadcn/ui, or when you pass `--preset`. Tailwind is forced on. After you pick the package, the CLI asks for a **component base**, then whether you want a **preset** (unless `--preset` was already passed).

| Prompt / flag | Default | What it sets |
| --- | --- | --- |
| Component base | Base UI | Primitive library: Base UI, Radix UI, or React Aria. Written as the `style` prefix (`base-nova`, `radix-nova`, `aria-nova`). |
| Do you want to use a shadcn preset? | No | No keeps the default config (`nova`) and says so. Yes asks you to paste a named style (`nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`) or a short code from [shadcn/create](https://ui.shadcn.com/create). You can also pass `--preset <code>`. The code packs colors, theme, fonts, radius, and icon library. |

What you get:

- Latest shadcn CLI (`shadcn@^4.18.0`) plus `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react`
- `components.json` using the current schema: `{base}-{style}` (not the deprecated `default` style), CSS variables, `baseColor: neutral`, `iconLibrary: lucide`, aliases for `components` / `ui` / `utils` / `lib` / `hooks`, Tailwind v4 with empty `config`
- Theme CSS path points at `tooling/tailwind/src/theme.css` so tokens stay shared
- `src/lib/utils.ts` with `cn()`
- `src/globals.css` importing `@<project>/tailwind`
- `src/index.ts` re-exports `cn()` — no components are pre-generated

If you paste a custom preset code (not a named style), scaffold runs `shadcn@latest apply --preset <code> --yes` in `packages/ui` so the official CLI writes the theme.

Add components from the repo root:

```bash
pnpm --filter @my-app/ui add button
```

Or:

```bash
pnpm dlx shadcn@latest add button -c packages/ui
```

Then export them from `src/index.ts`. Switch themes later with `pnpm --filter @my-app/ui apply --preset <code>`. Partial apply (`--only theme` or `--only theme,font`) keeps your components and only updates tokens or fonts.

## `packages/api` (tRPC)

Created when you select tRPC. Exports:

| Import | Use |
| --- | --- |
| `@<project>/api` | `appRouter`, `AppRouter`, `createTRPCContext`, `createCaller` |
| `@<project>/api/client` | `createApiClient(url)` — vanilla HTTP client |

Starter procedure: `hello.greet({ name?: string })` → `{ greeting }`.

If you also picked Drizzle or Prisma, context includes `db` / `prisma`. Add procedures after you define your own schema.

```ts
import { createCaller, createTRPCContext } from "@my-app/api";

const caller = createCaller(await createTRPCContext());
const { greeting } = await caller.hello.greet({ name: "Ada" });
```

```ts
import { createApiClient } from "@my-app/api/client";

const api = createApiClient("http://localhost:3000/api/trpc");
const { greeting } = await api.hello.greet.query({ name: "Ada" });
```

React Query is not included. Type-only import `AppRouter` and create the React client in the app:

```ts
import type { AppRouter } from "@my-app/api";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();
```

**Not auto-wired.** Mount the router on a host after scaffold. Next.js App Router uses `@trpc/server/adapters/fetch` at `app/api/trpc/[trpc]/route.ts`. Express uses `createExpressMiddleware`. Fastify uses `fastifyTRPCPlugin`. See the generated `packages/api/README.md` for the snippets.

## `packages/auth` (optional)

Created when the auth provider is not `none`. Unified surface:

```tsx
import { AuthProvider, AuthDemo, useAuth } from "@my-app/auth";

export default function App() {
  return (
    <AuthProvider>
      <AuthDemo />
    </AuthProvider>
  );
}
```

`useAuth()` returns `{ user, isAuthenticated, isLoading, signIn, signOut }`. Each provider also re-exports its SDK helpers.

| Provider | SDK | Notes |
| --- | --- | --- |
| Better Auth | `better-auth` | Client wrapper only. Add a Next.js route such as `app/api/auth/[...all]/route.ts` yourself. `signIn` on `useAuth` is a stub — call `authClient.signIn.social()` or send users to your sign-in page. |
| Clerk | `@clerk/clerk-react` | `AuthProvider` wraps `ClerkProvider` with the publishable key from `getPublicAuthConfig()`. |
| WorkOS | `@workos-inc/authkit-react` | `AuthProvider` wraps AuthKit with the client id from `getPublicAuthConfig()`. |

**Not auto-wired.** Wrap your app root with `AuthProvider` after scaffold.

## `packages/payments` (optional)

Created when the payment provider is not `none`. Shared checkout helpers live in `@<project>/payments`. **Not auto-wired** — mount the routes after scaffold. See the generated `packages/payments/README.md` for snippets.

| Provider | SDK | What you get |
| --- | --- | --- |
| Stripe | `stripe` + `@upstash/redis` | [Theo's Stripe recommendations](https://github.com/t3dotgg/stripe-recommendations): create the customer **before** checkout, store `userId ↔ customerId` in Upstash Redis, and keep subscription state in a single `syncStripeDataToKV(customerId)` used by both the success route and the webhook. Do not use `CHECKOUT_SESSION_ID`. Disable Cash App Pay and enable **Limit customers to one subscription** in the Stripe Dashboard. |
| Polar | `@polar-sh/sdk` | Merchant of record. Checkout and customer portal bind your auth user id via `externalCustomerId`. Verify webhooks with `validateEvent`. Query live state with `getCustomerState(userId)`. |
| Autumn | `autumn-js` + `atmn` | Entitlements layer on Stripe. Starter `autumn.config.ts` (Free + Pro, metered `messages`). Use your auth user id as `customerId`. `attachPlan` returns a Stripe payment URL; `checkFeature` / `trackUsage` gate metered features. Push plans with `pnpm --filter @<project>/payments autumn:push`. |

Pass your authenticated `userId` into these helpers. The package does not import `@<project>/auth`.

Stripe and Polar:

```ts
import { createCheckoutSession } from "@my-app/payments";

const { url } = await createCheckoutSession({
  userId: user.id,
  email: user.email,
  successUrl: "http://localhost:3000/success",
});
```

Autumn:

```ts
import { attachPlan } from "@my-app/payments";

const checkout = await attachPlan({ customerId: user.id, planId: "pro" });
```

## `packages/db` (optional)

Created when you pick Drizzle or Prisma.

### Drizzle

Exports `db`. The CLI asks which database to use and scaffolds the matching driver and `drizzle.config.ts` dialect. No starter tables — add them in `src/schema.ts`.

| Database | Driver |
| --- | --- |
| PostgreSQL (default) | `pg` + `drizzle-orm/node-postgres` |
| MySQL | `mysql2` + `drizzle-orm/mysql2` |
| SQLite | `@libsql/client` + `drizzle-orm/libsql` |

```ts
import { db } from "@my-app/db";
```

### Prisma

Exports `prisma`. The CLI asks which database to use and sets `datasource.provider` in `schema.prisma` (`postgresql`, `mysql`, or `sqlite`). No starter models — add them in `prisma/schema.prisma`.

```ts
import { prisma } from "@my-app/db";
```

Scripts (run from the repo root with a filter, or inside `packages/db`):

| Script | Drizzle | Prisma |
| --- | --- | --- |
| `db:generate` | `drizzle-kit generate` | `prisma generate` |
| `db:migrate` | `drizzle-kit migrate` | `prisma migrate dev` |
| `db:push` | `drizzle-kit push` | `prisma db push` |
| `db:studio` | Drizzle Studio | Prisma Studio |

```bash
pnpm --filter @my-app/db db:push
```

Set `DATABASE_URL` first. **Not auto-wired** into app templates — import `@<project>/db` where you need a query.
