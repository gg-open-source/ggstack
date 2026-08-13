# Apps

Apps are optional. You can scaffold packages and tooling with no apps.

Each selected app is copied from a static template shipped with the CLI. Every app depends on `@<project>/env`.

## Vanilla Vite

TypeScript Vite app (`vite` ^8). Scripts: `dev`, `build`, `preview`.

`vite.config.ts` calls `createViteEnv(import.meta.env)` so client vars with the `VITE_` prefix are validated at config load.

```bash
pnpm --filter @my-app/vite dev
```

Default port: `5173`.

## Next.js

Next.js 16 + React 19 App Router. Scripts: `dev`, `build`, `start`.

`next.config.ts` imports `@<project>/env/server` so server env is validated when Next starts.

```bash
pnpm --filter @my-app/next dev
```

## Expo Router

Expo SDK 57 + Expo Router. Scripts: `start`, `ios`, `android`, `web`. There is **no** `dev` script, so this app does not join root `pnpm dev`.

`app/_layout.tsx` imports `expoEnv` from `@<project>/env/client`.

```bash
pnpm --filter @my-app/expo start
```

## Electron + Vite

Electron + Vite + vanilla TypeScript. Scripts: `dev` (Vite), `build` (`tsc && vite build && electron-builder`), `preview`.

The main process reads optional `VITE_DEV_SERVER_URL` from `serverEnv`. Vite injects that URL during desktop `dev`.

```bash
pnpm --filter @my-app/electron dev
```

## Auth and database

App templates do **not** wrap `AuthProvider` or import `@<project>/db`. After you add those packages, import them in the app yourself. See [Packages](./packages.md).
