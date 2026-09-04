---
description: Workspace layout, root scripts, Turbo env, gitignore rules, and package names.
---

# Project

A generated repo is a pnpm workspace with Turborepo. Workspace globs are `apps/*`, `packages/*`, and `tooling/*`.

## Layout

```text
my-app/
├── .env.example          # always; copy to .env
├── .gitignore
├── .npmrc                # engine-strict=true
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
├── apps/
│   ├── vite/             # optional Vite (framework chosen in the CLI)
│   ├── next/             # optional Next.js
│   ├── astro/            # optional Astro
│   ├── expo/             # optional Expo Router
│   ├── electron/         # optional Electron + Vite
│   ├── express/          # optional Express
│   ├── fastify/          # optional Fastify
│   ├── tanstack-start/   # optional TanStack Start
│   └── react-router/     # optional React Router
├── packages/
│   ├── env/              # always
│   ├── ui/               # optional shadcn/ui
│   ├── api/              # optional tRPC
│   ├── auth/             # optional, when an auth provider is selected
│   ├── db/               # optional, when Drizzle or Prisma is selected
│   ├── payments/         # optional, when Stripe, Polar, or Autumn is selected
│   └── email/            # optional, when Resend is selected
└── tooling/
    ├── tsconfig/         # always
    ├── tailwind/         # optional
    ├── oxc/              # optional
    ├── prettier/         # optional stub
    └── eslint/           # optional stub
```

App folder names are whatever you typed (after sanitizing), not the type names above.

## `.gitignore`

The root `.gitignore` is generated from the apps, tooling, and database dialect you selected. Workspace entries are always present: `node_modules`, `dist`, `.turbo`, `**/.cache/`, `*.log`, `.env`, and `.env.local`.

Stack-specific paths are added only when that choice is on:

| Selection | Entries |
| --- | --- |
| Next.js | `.next`, `out` |
| Astro | `.astro` |
| Expo Router | `.expo`, `expo-env.d.ts`, `web-build` |
| Electron + Vite | `release` |
| TanStack Start | `.output`, `.nitro`, `.tanstack` |
| React Router | `.react-router`, `build` |
| ESLint | `.eslintcache` |
| Prettier | `.prettiercache` |
| Drizzle + SQLite | `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm` |

Vite, Express, Fastify, shadcn/ui, tRPC, auth, payments, email, PostgreSQL/MySQL Drizzle, Prisma, Tailwind, and Oxc do not add extra ignore paths — they use `dist`, `.env`, or `node_modules` already listed in the workspace section. Drizzle + SQLite also ignores `*.db`, `*.db-journal`, `*.db-wal`, and `*.db-shm`. Astro build output is `dist`; only the generated `.astro` types directory is extra.

## Root scripts

| Script | What it runs |
| --- | --- |
| `pnpm dev` | `turbo run dev` |
| `pnpm build` | `turbo run build` |
| `pnpm lint` | `turbo run lint`, or repo-wide Oxc if you selected Oxc |
| `pnpm format` | `turbo run format`, or repo-wide Oxc format if you selected Oxc |
| `pnpm check-types` | `turbo run check-types` |
| `pnpm test` | `turbo run test` |

Turbo `dev` is uncached and persistent. `check-types` depends on `^build`. Env vars from `packages/env` are listed on `turbo.json` `globalEnv` (except `NODE_ENV`).

## Package manager

Install and run scripts with **pnpm**. The generated `package.json` pins `packageManager` to `pnpm@11.2.2` when you scaffolded with pnpm. Node is declared as `>=22` (`engine-strict` is on).

Filter a single package:

```bash
pnpm --filter @apps/next dev
pnpm --filter @packages/db db:studio
```

Workspace package names follow the folder they live in: `@apps/<folder>`, `@packages/<folder>`, and `@tooling/<folder>`. The project name is not used as a scope.
