# Packages

## `packages/env` (always)

Typed env via `@t3-oss/env-core` and Zod. Exports:

| Import | Use |
| --- | --- |
| `@<project>/env/server` | `serverEnv` — Node/server variables |
| `@<project>/env/client` | `nextEnv`, `expoEnv`, and/or `createViteEnv`, plus `getPublicAuthConfig()` for Clerk/WorkOS |
| `@<project>/env` | Re-exports server and client |

Add new variables in the Zod schemas **and** in the root `.env.example`. Full matrix: [Environment](./environment.md).

```ts
import { serverEnv } from "@my-app/env/server";

const url = serverEnv.DATABASE_URL;
```

## `packages/ui` (shadcn/ui)

Created when you select shadcn/ui. Tailwind is forced on.

What you get:

- `components.json` (shadcn default style, CSS variables, `baseColor: neutral`)
- `src/lib/utils.ts` with `cn()` (`clsx` + `tailwind-merge`)
- `src/globals.css` with the usual shadcn CSS variables
- `src/index.ts` is an empty export — no components are pre-generated

Add components with the shadcn CLI from `packages/ui`, then export them from `src/index.ts`.

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

PostgreSQL only. Created when you pick Drizzle or Prisma.

### Drizzle

Exports `db`, `schema`, and `User` / `NewUser`. Starter table: `users`.

```ts
import { db, schema } from "@my-app/db";

const allUsers = await db.select().from(schema.users);
```

### Prisma

Exports `prisma` and `User`. Starter model: `User`.

```ts
import { prisma } from "@my-app/db";

const allUsers = await prisma.user.findMany();
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
