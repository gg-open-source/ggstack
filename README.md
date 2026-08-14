# ggstack

Interactive CLI that scaffolds a **pnpm + Turborepo** monorepo in the T3/Turbo style. Pick Vite, Next.js, Expo Router, Electron, Express, Fastify, TanStack Start, and/or React Router, then optionally add shadcn/ui, Better Auth / Clerk / WorkOS, and Drizzle or Prisma (PostgreSQL). Every project gets a typed `packages/env` and a root `.env.example`.

## Requirements

- Node.js >= 22
- [pnpm](https://pnpm.io) (generated workspaces are always pnpm)

## Usage

```bash
pnpm create ggstack my-app
```

Then:

```bash
cd my-app
cp .env.example .env
pnpm install
pnpm dev
```

Also: `npx create-ggstack my-app --pnpm` or `pnpm dlx create-ggstack my-app`.

## Documentation

User guide lives in [`apps/docs`](./apps/docs) (VitePress). From this repo:

```bash
pnpm --filter @ggstack/docs dev
```

- [Getting started](./apps/docs/guide/getting-started.md)
- [CLI](./apps/docs/guide/cli.md)
- [Generated project](./apps/docs/guide/project.md)

## This repository

| Path | What |
| --- | --- |
| `apps/create-ggstack` | Published CLI (`create-ggstack`) |
| `apps/docs` | VitePress site (Vercel) |
| `packages/ui` | Placeholder workspace package for this repo |
| `tooling/` | Shared Oxc + TypeScript config |

MIT. See [LICENSE](./LICENSE).
