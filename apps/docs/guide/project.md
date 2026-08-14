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
│   ├── vite/             # optional Vanilla Vite
│   ├── next/             # optional Next.js
│   ├── expo/             # optional Expo Router
│   ├── electron/         # optional Electron + Vite
│   ├── express/          # optional Express
│   └── fastify/          # optional Fastify
├── packages/
│   ├── env/              # always
│   ├── ui/               # optional shadcn/ui
│   ├── auth/             # optional, when an auth provider is selected
│   └── db/               # optional, when Drizzle or Prisma is selected
└── tooling/
    ├── tsconfig/         # always
    ├── tailwind/         # optional
    ├── oxc/              # optional
    ├── prettier/         # optional stub
    └── eslint/           # optional stub
```

App folder names are whatever you typed (after sanitizing), not the type names above.

## `.gitignore`

The root `.gitignore` is generated from the apps and tooling you selected. Workspace entries are always present: `node_modules`, `dist`, `.turbo`, `**/.cache/`, `*.log`, `.env`, and `.env.local`.

Stack-specific paths are added only when that choice is on:

| Selection | Entries |
| --- | --- |
| Next.js | `.next`, `out` |
| Expo Router | `.expo`, `expo-env.d.ts`, `web-build` |
| Electron + Vite | `release` |
| ESLint | `.eslintcache` |
| Prettier | `.prettiercache` |

Vite, Express, Fastify, shadcn/ui, auth, Drizzle, Prisma, Tailwind, and Oxc do not add extra ignore paths — they use `dist`, `.env`, or `node_modules` already listed in the workspace section.

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
pnpm --filter @my-app/next dev
pnpm --filter @my-app/db db:studio
```

Workspace package names are `@<project-name>/<folder>`.
