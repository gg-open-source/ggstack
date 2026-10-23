---
description: Add ggstack apps, packages, providers, or tooling to an existing generated workspace.
---

# Add to an Existing Project

Run the CLI with `--add` from the root of a project created by ggstack:

```bash
cd my-app
pnpm create ggstack@latest --add
```

The CLI inspects the existing workspace, then opens the usual selectors. Choose only what you want to add. It can add:

- Apps: Vite, Next.js, Astro, Expo Router, Electron, Express, Fastify, TanStack Start, and React Router
- Shared packages: shadcn/ui and tRPC
- Authentication, database, payments, and email packages
- Tailwind CSS, Oxc, Prettier, and ESLint tooling

After it finishes, install the new dependencies:

```bash
pnpm install
```

## What the command updates

`--add` creates only the component directories you selected. It preserves the root README and other unrelated project files. When needed, it also makes focused updates to:

- The root `package.json`, for tooling scripts or dependencies
- `packages/env/src/server.ts` and `packages/env/src/client.ts`, for new typed environment variables and app-specific client helpers
- `.env.example`, for new provider keys
- `turbo.json`, for new global environment variables

If Tailwind is already present, newly added frontend apps are connected to the existing shared Tailwind package. Adding shadcn/ui to standalone Tailwind merges the required dependencies and CSS imports; ggstack replaces its untouched placeholder theme with the shadcn theme but preserves a theme you have customized. If you add Tailwind by itself, existing apps are not rewritten; follow the setup in [Tooling](./tooling.md) for any existing app you want to connect.

## Collision safety

Before writing, the CLI checks every selected component directory. If any already exists—such as `apps/web`, `packages/db`, or `tooling/oxc`—the command stops without writing files. Choose a unique name for a new app and do not reselect packages or tooling already in the workspace.

The command recognizes a ggstack project by its root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `packages/env`, and `tooling/tsconfig`. Run it at the workspace root. It intentionally refuses to retrofit an unrelated monorepo.

## Add from a stack code

You can apply the selections in a stack code to the current project without prompts:

```bash
pnpm create ggstack@latest --add --stack <code>
```

Every component in the code is treated as an addition. If one of its app names or fixed package/tooling directories already exists, the collision check stops the command. For most established projects, interactive `--add` is more convenient because you can select only the missing pieces.
