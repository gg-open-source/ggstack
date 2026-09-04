# ggstack

Interactive CLI that scaffolds a **pnpm + Turborepo** monorepo in the T3/Turbo style. Pick Vite, Next.js, Astro, Expo Router, Electron, Express, Fastify, TanStack Start, and/or React Router, then optionally add shadcn/ui, tRPC, Better Auth / Clerk / WorkOS, Stripe / Polar / Autumn, Resend + React Email, Drizzle or Prisma (PostgreSQL, MySQL, or SQLite). Every project gets a typed `packages/env` and a root `.env.example`.

## Requirements

- Node.js >= 22
- [pnpm](https://pnpm.io) (generated workspaces are always pnpm)

## Usage

Build a stack visually, copy the command, paste it in a terminal:

```bash
pnpm create ggstack@latest my-app --stack g1e30
```

The `--stack` code comes from the docs [Create](./apps/docs/create.md) page. It applies that exact config with no prompts. Inspect one with `pnpm create ggstack --decode g1e30`.

Or run the CLI interactively:

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
pnpm --filter @apps/docs dev
```

- [Getting started](./apps/docs/guide/getting-started.md)
- [CLI](./apps/docs/guide/cli.md)
- [Generated project](./apps/docs/guide/project.md)

For language models: [`llms.txt`](./llms.txt) (index) and [`llms-full.txt`](./llms-full.txt) (full guide in one file). The docs site serves those plus a Markdown copy of each page at the same URL with a `.md` suffix (see [llmstxt.org](https://llmstxt.org/)).

## This repository

| Path | What |
| --- | --- |
| `apps/create-ggstack` | Published CLI (`create-ggstack`) |
| `apps/docs` | VitePress site (Vercel) |
| `packages/ui` | Placeholder workspace package for this repo |
| `tooling/` | Shared Oxc + TypeScript config |

MIT. See [LICENSE](./LICENSE).
