# CLI

```text
create-ggstack [project-name] [options]
```

## Options

| Flag | Description |
| --- | --- |
| `--pnpm` | Use pnpm to run official app CLIs (default) |
| `--npm` | Use npm to run official app CLIs |
| `--yarn` | Use yarn to run official app CLIs |
| `--bun` | Use bun to run official app CLIs |
| `-h`, `--help` | Print help |
| `-v`, `--version` | Print the package version |

There are no flags for apps, packages, auth, database, or tooling. Those choices are interactive only.

`--npm`, `--yarn`, and `--bun` only affect package-manager invocations the CLI runs during scaffold. The generated repo is still a **pnpm workspace**. The CLI warns when the flag is not `--pnpm`. You still need pnpm installed to work in the project.

## Interactive flow

1. **Project name** — positional argument, or a prompt (default `project`). The default is shown as grey placeholder text and is used if you press Enter without typing.
2. **Apps** — multi-select, optional: Vite, Next.js, Astro, Expo Router, Electron + Vite, Express, Fastify, TanStack Start, React Router.
3. **App names** — one prompt per selected app. Defaults: `vite`, `next`, `astro`, `expo`, `electron`, `express`, `fastify`, `tanstack-start`, `react-router`. Same grey placeholder as the project name.
4. **Vite framework** — if you selected Vite: Vanilla, Vue, React, Preact, Lit, Svelte, Solid, or Qwik. TypeScript only; JavaScript variants are not offered.
5. **Vite variant** — if the Vite framework is React: TypeScript, or TypeScript + React Compiler. Other frameworks skip this prompt.
6. **Packages** — multi-select, optional: shadcn/ui, tRPC.
7. **Tooling** — multi-select: Tailwind CSS, Oxc, Prettier, ESLint. Tailwind is pre-selected (and always kept) if shadcn/ui is on.
8. **Authentication** — Better Auth, Clerk, WorkOS, or none (default none).
9. **Database ORM** — none (default), Drizzle, or Prisma. Choosing an ORM adds `packages/db`.
10. **Database** — if you chose Drizzle or Prisma: PostgreSQL (default), MySQL, or SQLite. Drizzle hints name the driver (`node-postgres`, `mysql2`, `libsql`). Prisma hints name the `schema.prisma` `provider`.

`packages/env`, `tooling/tsconfig`, and a root `.env.example` are always written.

## Names

Project and app names go through the same sanitizer: lowercase, spaces become hyphens, characters outside `a-z`, `0-9`, and `-` are stripped, leading and trailing hyphens are removed. App names in one project must be unique after sanitizing.

## Abort conditions

The CLI exits without writing files when:

- The chosen package manager is not installed
- The target directory already exists
