# create-ggstack

Interactive CLI that scaffolds a pnpm + Turborepo monorepo (T3/Turbo style): Vite, Next.js, Expo Router, Electron, Express, Fastify, shadcn/ui, typed env, optional auth, and PostgreSQL (Drizzle or Prisma).

## Usage

```bash
pnpm create ggstack
pnpm create ggstack my-app
npx create-ggstack my-app --pnpm
pnpm dlx create-ggstack my-app
```

## Requirements

- Node.js >= 22
- pnpm (the generated monorepo uses pnpm workspaces)

## Options

| Flag | Description |
|------|-------------|
| `--pnpm` | Use pnpm to run official app CLIs (default) |
| `--npm` | Use npm to run official app CLIs |
| `--yarn` | Use yarn to run official app CLIs |
| `--bun` | Use bun to run official app CLIs |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

Apps, packages, tooling, auth, and database are chosen interactively. `--npm` / `--yarn` / `--bun` only affect external CLIs during scaffold; you still need pnpm to work in the generated repo.

## Docs

Full guide: [apps/docs](https://github.com/gg-open-source/ggstack/tree/main/apps/docs) in the [ggstack](https://github.com/gg-open-source/ggstack) repo.

## License

MIT
