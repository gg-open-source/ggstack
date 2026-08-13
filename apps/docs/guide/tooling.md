# Tooling

`tooling/tsconfig` is always generated. Everything else is opt-in at the tooling prompt.

## TypeScript

`@<project>/tsconfig` ships `base.json`: `ES2022`, `moduleResolution: bundler`, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Apps and packages extend it.

## Tailwind CSS

Creates `tooling/tailwind` with a shared Tailwind + PostCSS config. Forced on when shadcn/ui is selected (the prompt pre-selects it and the generator keeps it even if you deselect it).

With shadcn, the shared theme includes the CSS-variable color tokens (`background`, `primary`, `destructive`, and the rest).

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
