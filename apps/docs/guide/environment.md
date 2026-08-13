# Environment

Every project gets `packages/env` and a root `.env.example`. Copy that file to `.env` at the repo root and fill in values. `.env` is gitignored.

```bash
cp .env.example .env
```

The Zod schema is generated from the apps, auth provider, and ORM you selected. Empty required strings fail validation.

## Server vs client

- **Server** vars live on `serverEnv` (`@<project>/env/server`) and are read from `process.env`.
- **Client** vars use the prefix of each selected app family and are validated separately.

| App type | Client prefix | Client export |
| --- | --- | --- |
| Next.js | `NEXT_PUBLIC_` | `nextEnv` |
| Expo | `EXPO_PUBLIC_` | `expoEnv` |
| Vite or Electron | `VITE_` | `createViteEnv(runtimeEnv)` — pass `import.meta.env` |

Clerk and WorkOS also generate `getPublicAuthConfig()`, which reads the publishable key / client id from whichever of those prefixed names is set.

## Variable matrix

| When | Name | Kind | Required |
| --- | --- | --- | --- |
| Always | `NODE_ENV` | server | no (`development` \| `test` \| `production`) |
| Any database ORM | `DATABASE_URL` | server | yes (URL) |
| Better Auth | `BETTER_AUTH_SECRET` | server | yes |
| Better Auth | `BETTER_AUTH_URL` | server | yes (URL) |
| Clerk | `CLERK_SECRET_KEY` | server | yes |
| Clerk + Next | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | yes |
| Clerk + Vite/Electron | `VITE_CLERK_PUBLISHABLE_KEY` | client | yes |
| Clerk + Expo | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | yes |
| WorkOS | `WORKOS_API_KEY` | server | yes |
| WorkOS | `WORKOS_COOKIE_PASSWORD` | server | yes |
| WorkOS + Next | `NEXT_PUBLIC_WORKOS_CLIENT_ID` | client | yes |
| WorkOS + Vite/Electron | `VITE_WORKOS_CLIENT_ID` | client | yes |
| WorkOS + Expo | `EXPO_PUBLIC_WORKOS_CLIENT_ID` | client | yes |
| Electron | `VITE_DEV_SERVER_URL` | server | no (URL; injected in Electron dev) |

Better Auth extra secrets (for example `GITHUB_CLIENT_ID`) are not generated. Add them to the schema and `.env.example` if you need them.

## Skipping validation

Validation is skipped when any of these is true:

- `CI` is set
- `SKIP_ENV_VALIDATION=true`
- `npm_lifecycle_event` is `lint`

Those names, plus `NODE_ENV`, `VERCEL`, `VERCEL_ENV`, and `VERCEL_URL`, are listed on Turbo `globalPassThroughEnv`. Generated app/auth/db keys (except `NODE_ENV`) are listed on `globalEnv`.
