---
description: Shared TypeScript config, Tailwind v4, Oxc lint/format, and Prettier/ESLint stubs.
---

# Tooling

`tooling/tsconfig` is always generated. Everything else is opt-in at the tooling prompt.

## TypeScript

`@tooling/tsconfig` ships `base.json`: `ES2022`, `moduleResolution: bundler`, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Apps and packages extend it.

## Tailwind CSS

Creates `tooling/tailwind` with Tailwind CSS v4 (`^4.3.3`) and a shared PostCSS plugin. `tailwindcss` is declared only in that package. Forced on when shadcn/ui is selected (the prompt pre-selects it and the generator keeps it even if you deselect it).

Frontend apps (Vite, Next.js, Astro, Electron, TanStack Start, React Router) get a `postcss.config.mjs` that re-exports `@tooling/tailwind/postcss` and an `@import "@tooling/tailwind"` in their CSS entry. They depend on `@tooling/tailwind`, not `tailwindcss`. Express and Fastify are left alone.

Expo is wired with NativeWind v5 on top of the same package: `withNativewind` in `metro.config.js`, `global.css` imported from `app/_layout.tsx`, and `lightningcss` pinned to `1.30.1` at the workspace root.

With shadcn, the shared `theme.css` includes the current CSS-variable color tokens (oklch, light and dark, charts, sidebar). `styles.css` also imports `tw-animate-css` and `shadcn/tailwind.css` from the latest `shadcn` package. A custom preset code is applied onto this file by `shadcn apply`.

## Oxc

Creates `tooling/oxc/oxlint.json` and `oxfmt.json`, and rewrites the **root** `lint` and `format` scripts to run Oxc across the repo:

```bash
pnpm lint    # oxlint --config tooling/oxc/oxlint.json .
pnpm format  # oxfmt --config tooling/oxc/oxfmt.json .
```

Default lint rule of note: `typescript/no-explicit-any` is an error. Format defaults: 2-space indent, semicolons, double quotes, trailing commas.

Selecting Oxc also adds `oxlint` and `oxfmt` to the root `devDependencies`.

## Prettier (stub)

Writes `tooling/prettier/.prettierrc.json` and installs Prettier at the repo root. It does **not** wire a root `format` script or editor integration. The CLI says “manual wiring still required.”

## ESLint (stub)

Writes `tooling/eslint/eslint.config.js` (flat config with ignore patterns only) and installs ESLint at the repo root. Same story: no root `lint` rewrite. Prefer Oxc if you want lint/format to work immediately.
