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

Created when you select shadcn/ui. Tailwind is forced on.

What you get:

- `components.json` (shadcn default style, CSS variables, `baseColor: neutral`, Tailwind v4 with empty `config`)
- `src/lib/utils.ts` with `cn()` (`clsx` + `tailwind-merge`)
- `src/globals.css` importing `@<project>/tailwind` (tokens live in `tooling/tailwind`)
- `src/index.ts` is an empty export — no components are pre-generated

Add components with the shadcn CLI from `packages/ui`, then export them from `src/index.ts`.

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
