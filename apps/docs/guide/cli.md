---
description: Flags, interactive prompt order, name sanitizing, and abort conditions.
---

# CLI

```text
create-ggstack [project-name] [options]
```

## Options

| Flag | Description |
| --- | --- |
| `--preset <code>` | shadcn/ui preset: a named style (`nova`, `luma`, …) or a code from [ui.shadcn.com/create](https://ui.shadcn.com/create). Enables shadcn/ui. |
| `--pnpm` | Use pnpm to run official app CLIs (default) |
| `--npm` | Use npm to run official app CLIs |
| `--yarn` | Use yarn to run official app CLIs |
| `--bun` | Use bun to run official app CLIs |
| `-h`, `--help` | Print help |
| `-v`, `--version` | Print the package version |

```bash
pnpm create ggstack my-app --preset b2D0vQ7G4
```

Also accepted: `--preset=b2D0vQ7G4`. Apps, other packages, auth, database, payments, and tooling stay interactive. `--preset` skips the preset-code prompt and keeps shadcn/ui on even if you deselect it in the packages list.

`--npm`, `--yarn`, and `--bun` only affect package-manager invocations the CLI runs during scaffold. The generated repo is still a **pnpm workspace**. The CLI warns when the flag is not `--pnpm`. You still need pnpm installed to work in the project.

## Interactive flow

1. **Project name** — positional argument, or a prompt (default `project`). The default is shown as grey placeholder text and is used if you press Enter without typing.
2. **Apps** — multi-select, optional: Vite, Next.js, Astro, Expo Router, Electron + Vite, Express, Fastify, TanStack Start, React Router.
3. **App names** — one prompt per selected app. Defaults: `vite`, `next`, `astro`, `expo`, `electron`, `express`, `fastify`, `tanstack-start`, `react-router`. Same grey placeholder as the project name.
4. **Vite framework** — if you selected Vite: Vanilla, Vue, React, Preact, Lit, Svelte, Solid, or Qwik. TypeScript only; JavaScript variants are not offered.
5. **Vite variant** — if the Vite framework is React: TypeScript, or TypeScript + React Compiler. Other frameworks skip this prompt.
6. **Packages** — multi-select, optional: shadcn/ui, tRPC.
7. **shadcn component base** — if you selected shadcn/ui (or passed `--preset`): Base UI (default), Radix UI, or React Aria.
8. **shadcn preset** — if you selected shadcn/ui and did not pass `--preset`: "Do you want to use a shadcn preset?" Default no. No prints that the CLI is using the default config (`nova`) and continues. Yes asks for a named style (`nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`) or a code from [ui.shadcn.com/create](https://ui.shadcn.com/create). Skipped when `--preset` is already on the command line.
9. **Tooling** — multi-select: Tailwind CSS, Oxc, Prettier, ESLint. Tailwind is pre-selected (and always kept) if shadcn/ui is on. Selecting Tailwind installs Tailwind CSS v4 once in `tooling/tailwind` and wires it into frontend apps. Expo also gets NativeWind.
10. **Authentication** — Better Auth, Clerk, WorkOS, or none (default none).
11. **Database ORM** — none (default), Drizzle, or Prisma. Choosing an ORM adds `packages/db`.
12. **Database** — if you chose Drizzle or Prisma: PostgreSQL (default), MySQL, or SQLite. Drizzle hints name the driver (`node-postgres`, `mysql2`, `libsql`). Prisma hints name the `schema.prisma` `provider`.
13. **Payments** — none (default), Stripe, Polar, or Autumn. Choosing a provider adds `packages/payments`. Stripe prints that it uses Upstash Redis and a single `syncStripeDataToKV` function.

`packages/env`, `tooling/tsconfig`, and a root `.env.example` are always written.

## Names

Project and app names go through the same sanitizer: lowercase, spaces become hyphens, characters outside `a-z`, `0-9`, and `-` are stripped, leading and trailing hyphens are removed. App names in one project must be unique after sanitizing.

## Abort conditions

The CLI exits without writing files when:

- The chosen package manager is not installed
- `--preset` is passed with no value, or with a value that is not a named style or preset code
- The target directory already exists
