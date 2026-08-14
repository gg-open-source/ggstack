# Getting Started

`create-ggstack` is an interactive CLI. It writes a pnpm workspace with Turborepo, a typed env package, and the apps and packages you select.

## Requirements

- Node.js 22 or newer
- [pnpm](https://pnpm.io) — the generated monorepo uses pnpm workspaces even if you pass `--npm`, `--yarn`, or `--bun`

## Create a project

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

The CLI prompts for apps, package extras, tooling, auth, and a database ORM. Only the project name and the package-manager flag can be set on the command line. See [CLI](./cli.md).

## After the CLI finishes

```bash
cd my-app
cp .env.example .env
pnpm install
pnpm dev
```

`pnpm dev` runs Turbo `dev` across apps that define that script (Vite, Next.js, Electron, Express, Fastify, TanStack Start, React Router). Expo uses `start` instead — run it from the app package. Fill in `.env` before anything that reads `packages/env`; validation fails on empty required values unless you skip it. Details are in [Environment](./environment.md).

The scaffolded repo also gets a `README.md` that lists what you selected and the same next steps.
