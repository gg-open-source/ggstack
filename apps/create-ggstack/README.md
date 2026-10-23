# create-ggstack

Interactive CLI that scaffolds a pnpm + Turborepo monorepo (T3/Turbo style): Vite, Next.js, Astro, Expo Router, Electron, Express, Fastify, TanStack Start, React Router, shadcn/ui, tRPC, typed env, optional auth, Stripe / Polar / Autumn, Resend + React Email, Drizzle or Prisma (PostgreSQL, MySQL, or SQLite).

## Usage

```bash
pnpm create ggstack
pnpm create ggstack my-app
pnpm create ggstack@latest --add
pnpm create ggstack my-app --preset b2D0vQ7G4
npx create-ggstack my-app --pnpm
pnpm dlx create-ggstack my-app
```

## Requirements

- Node.js >= 22
- pnpm (the generated monorepo uses pnpm workspaces)

## Options

| Flag | Description |
|------|-------------|
| `--add` | Add selected components to the ggstack project in the current directory |
| `--preset <code>` | shadcn/ui preset (named style or code from ui.shadcn.com/create) |
| `--pnpm` | Use pnpm to run official app CLIs (default) |
| `--npm` | Use npm to run official app CLIs |
| `--yarn` | Use yarn to run official app CLIs |
| `--bun` | Use bun to run official app CLIs |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

Apps, packages, tooling, auth, database, payments, and email are chosen interactively. `--preset` enables shadcn/ui and skips the preset-code prompt. `--npm` / `--yarn` / `--bun` only affect external CLIs during scaffold; you still need pnpm to work in the generated repo.

Already have a generated ggstack workspace? Run `pnpm create ggstack@latest --add` at its root to add more apps, packages, providers, or tooling. Existing component directories are never replaced.

## Docs

Full guide: [apps/docs](https://github.com/gg-open-source/ggstack/tree/main/apps/docs) in the [ggstack](https://github.com/gg-open-source/ggstack) repo.

For language models: [llms.txt](https://github.com/gg-open-source/ggstack/blob/main/llms.txt) (index) and [llms-full.txt](https://github.com/gg-open-source/ggstack/blob/main/llms-full.txt) (full guide). The docs site also serves a Markdown copy of each page.

## License

MIT
