---
description: Server vs client prefixes, the variable matrix, and when validation is skipped.
---

# Environment

Every project gets `packages/env` and a root `.env.example`. Copy that file to `.env` at the repo root and fill in values. `.env` is gitignored.

```bash
cp .env.example .env
```

The Zod schema is generated from the apps, auth provider, payment provider, email provider, and ORM you selected. Empty required strings fail validation.

## Loading the root .env

Generated app scripts, database commands, and the email preview use `dotenv-cli` to load `../../.env` before starting. This works with `pnpm dev`, `pnpm --filter @apps/next dev`, or scripts run from inside an app directory. Variables already set in your shell or deployment environment take precedence over the root `.env`. A missing `.env` is allowed when the required variables are supplied externally.

Leave `NODE_ENV` unset in `.env` so frameworks can choose the correct mode for dev and production commands.

This applies to Next.js, Astro, Expo, Electron, Express, Fastify, TanStack Start, React Router, and every Vite framework and React variant, including apps created with `--add`. All generated app scripts except lint and format load the root file. Each stage of a chained command loads it separately.

Vite config files validate `process.env`, which is populated before Vite starts. In application code, pass `import.meta.env` to `createViteEnv`.

Turbo does not load `.env` itself. The generated `globalDependencies: [".env"]` makes changes to the root file invalidate cached tasks; `globalEnv` forwards the listed variables that are already in the process environment. Restart running dev commands after editing `.env`.

## Server vs client

- **Server** vars live on `serverEnv` (`@packages/env/server`) and are read from `process.env`.
- **Client** vars use the prefix of each selected app family and are validated separately.

| App type | Client prefix | Client export |
| --- | --- | --- |
| Next.js | `NEXT_PUBLIC_` | `nextEnv` |
| Astro | `PUBLIC_` | `astroEnv` |
| Expo | `EXPO_PUBLIC_` | `expoEnv` |
| Vite, Electron, TanStack Start, or React Router | `VITE_` | `createViteEnv(runtimeEnv)` — pass `import.meta.env` |
| Express or Fastify | — | no client export; they import `@packages/env/server` on boot |

Clerk and WorkOS also generate `getPublicAuthConfig()`, which reads the publishable key / client id from whichever of those prefixed names is set.

## Variable matrix

| When | Name | Kind | Required |
| --- | --- | --- | --- |
| Always | `NODE_ENV` | server | no (`development` \| `test` \| `production`) |
| Any database ORM (PostgreSQL or MySQL) | `DATABASE_URL` | server | yes (URL) |
| Any database ORM + SQLite | `DATABASE_URL` | server | yes (string, e.g. `file:./packages/db/local.db`) |
| Better Auth | `BETTER_AUTH_SECRET` | server | yes |
| Better Auth | `BETTER_AUTH_URL` | server | yes (URL) |
| Clerk | `CLERK_SECRET_KEY` | server | yes |
| Clerk + Next | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | yes |
| Clerk + Astro | `PUBLIC_CLERK_PUBLISHABLE_KEY` | client | yes |
| Clerk + Vite/Electron/TanStack Start/React Router | `VITE_CLERK_PUBLISHABLE_KEY` | client | yes |
| Clerk + Expo | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | yes |
| WorkOS | `WORKOS_API_KEY` | server | yes |
| WorkOS | `WORKOS_COOKIE_PASSWORD` | server | yes |
| WorkOS + Next | `NEXT_PUBLIC_WORKOS_CLIENT_ID` | client | yes |
| WorkOS + Astro | `PUBLIC_WORKOS_CLIENT_ID` | client | yes |
| WorkOS + Vite/Electron/TanStack Start/React Router | `VITE_WORKOS_CLIENT_ID` | client | yes |
| WorkOS + Expo | `EXPO_PUBLIC_WORKOS_CLIENT_ID` | client | yes |
| Electron | `VITE_DEV_SERVER_URL` | server | no (URL; injected in Electron dev) |
| Stripe | `STRIPE_SECRET_KEY` | server | yes |
| Stripe | `STRIPE_WEBHOOK_SECRET` | server | yes |
| Stripe | `STRIPE_PRICE_ID` | server | yes |
| Stripe | `UPSTASH_REDIS_REST_URL` | server | yes (URL; Upstash Redis used as the Stripe KV store) |
| Stripe | `UPSTASH_REDIS_REST_TOKEN` | server | yes |
| Polar | `POLAR_ACCESS_TOKEN` | server | yes |
| Polar | `POLAR_WEBHOOK_SECRET` | server | yes |
| Polar | `POLAR_PRODUCT_ID` | server | yes |
| Polar | `POLAR_SERVER` | server | no (`sandbox` \| `production`; defaults to sandbox in code) |
| Autumn | `AUTUMN_SECRET_KEY` | server | yes |
| Resend | `RESEND_API_KEY` | server | yes |
| Resend | `EMAIL_FROM` | server | yes (`Name <address@yourdomain.com>`) |

Better Auth extra secrets (for example `GITHUB_CLIENT_ID`) are not generated. Add them to the schema and `.env.example` if you need them.

## Skipping validation

Validation is skipped when any of these is true:

- `CI` is set
- `SKIP_ENV_VALIDATION=true`
- `npm_lifecycle_event` is `lint`

Those names, plus `NODE_ENV`, `VERCEL`, `VERCEL_ENV`, and `VERCEL_URL`, are listed on Turbo `globalPassThroughEnv`. Generated app/auth/db keys (except `NODE_ENV`) are listed on `globalEnv`.
