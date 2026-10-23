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

To add another app, package, provider, or tool to an existing generated workspace:

```bash
cd my-app
pnpm create ggstack@latest --add
```

## Documentation

User guide lives in [`apps/docs`](./apps/docs) (VitePress). From this repo:

```bash
pnpm --filter @apps/docs dev
```

- [Getting started](./apps/docs/guide/getting-started.md)
- [Add to an existing project](./apps/docs/guide/adding.md)
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

## Publishing

[`.github/workflows/publish.yml`](./.github/workflows/publish.yml) runs CI, then deploys docs or publishes `create-ggstack` when requested. Publishing uses npm trusted publishing with these settings:

| Setting | Value |
| --- | --- |
| Organization | `gg-open-source` |
| Repository | `ggstack` |
| Workflow filename | `publish.yml` |
| Environment | `Production` |

Keep `publish.yml` as the entry workflow: [npm validates the calling workflow's filename](https://docs.npmjs.com/trusted-publishers/#troubleshooting), so calling it from another workflow changes the identity npm checks. A mismatch can cause the OIDC token exchange and publish to fail with HTTP 404.

To retry an unpublished version, run **CI** in GitHub Actions with **Run workflow → delivery: publish**. All checks must pass before publishing; versions already on npm are skipped.

MIT. See [LICENSE](./LICENSE).
