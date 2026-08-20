---
layout: home
description: Interactive CLI that scaffolds a pnpm + Turborepo monorepo in the T3/Turbo style.
hero:
  name: ggstack
  text: Scaffold a pnpm monorepo
  tagline: Interactive CLI for a T3/Turbo-style workspace — Vite, Next.js, Astro, Expo, Electron, Express, Fastify, TanStack Start, React Router, typed env, optional tRPC, auth and a database.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/gg-open-source/ggstack
features:
  - title: Multi-app workspace
    details: Pick Vite (Vanilla, Vue, React, Preact, Lit, Svelte, Solid, or Qwik), Next.js, Astro, Expo Router, Electron + Vite, Express, Fastify, TanStack Start, and React Router. Name each app. The repo is always a pnpm + Turborepo monorepo.
  - title: Typed environment
    details: Every project gets packages/env (@t3-oss/env-core + Zod) and a root .env.example filled from the auth, database, and app types you chose.
  - title: Optional tRPC, auth, and a database
    details: Shared tRPC router in packages/api. Better Auth, Clerk, or WorkOS as a shared package. Drizzle or Prisma against PostgreSQL, MySQL, or SQLite. You wire them into apps yourself.
  - title: Shared tooling
    details: Shared TypeScript config always. Tailwind, Oxc, and optional Prettier/ESLint stubs when you ask for them.
---
