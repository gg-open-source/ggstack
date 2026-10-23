---
description: Requirements, how to run create-ggstack, and the post-scaffold steps.
---

# Getting Started

`create-ggstack` is an interactive CLI. It writes a pnpm workspace with Turborepo, a typed env package, and the apps and packages you select.

## Requirements

- Node.js 22 or newer
- [pnpm](https://pnpm.io) — the generated monorepo uses pnpm workspaces even if you pass `--npm`, `--yarn`, or `--bun`

## Create a project

The fastest path is the visual builder: pick your stack, copy the command, paste it in a terminal.

1. Open [Create](/create)
2. Choose apps, packages, auth, database, payments, email, and tooling
3. Copy the generated command. It looks like this:

```bash
pnpm create ggstack@latest my-app --stack g1e30
```

`--stack` packs the whole config into a short code and skips every prompt. Share the builder URL to send someone the same setup. Inspect a code with `pnpm create ggstack --decode <code>`.

You can still run the CLI interactively:

```bash
pnpm create ggstack
```

Or pass a directory name:

```bash
pnpm create ggstack my-app
```

Other runners:

```bash
npx create-ggstack my-app --pnpm
pnpm dlx create-ggstack my-app
```

Without `--stack`, the CLI prompts for apps, package extras (including a shadcn base and, if you want one, a preset when shadcn/ui is on), tooling, auth, a database ORM, a payment provider (Stripe, Polar, or Autumn), an email provider (Resend), and — when you pick Drizzle or Prisma — which database to use. You can also pass a shadcn preset on the command line with `--preset <code>`. See [CLI](./cli.md).

## After the CLI finishes

```bash
cd my-app
cp .env.example .env
pnpm install
pnpm dev
```

`pnpm dev` runs Turbo `dev` across apps that define that script (Vite, Next.js, Astro, Electron, Express, Fastify, TanStack Start, React Router). Expo uses `start` instead — run it from the app package. Fill in `.env` before anything that reads `packages/env`; validation fails on empty required values unless you skip it. Details are in [Environment](./environment.md).

The scaffolded repo also gets a `README.md` that lists what you selected and the same next steps.

## Add to an existing ggstack project

From the root of a workspace previously created by ggstack, run:

```bash
pnpm create ggstack@latest --add
```

Select the new apps, packages, providers, or tooling you want. The command checks for collisions, adds the new component directories, and merges required environment configuration. See [Add to an Existing Project](./adding.md) for the complete behavior and limitations.
