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

## Express

Express 5 + TypeScript. Scripts: `dev` (`tsx watch`), `start` (`tsx`), `build` (`tsc --noEmit`).

`src/index.ts` imports `@<project>/env/server` so server env is validated when the process starts. Default port: `3001` (`process.env.PORT` overrides it). Routes: `GET /`, `GET /health`.

```bash
pnpm --filter @my-app/express dev
```

## Fastify

Fastify 5 + TypeScript. Scripts: `dev` (`tsx watch`), `start` (`tsx`), `build` (`tsc --noEmit`).

`src/index.ts` imports `@<project>/env/server` so server env is validated when the process starts. Default port: `3002` (`process.env.PORT` overrides it). Routes: `GET /`, `GET /health`.

```bash
pnpm --filter @my-app/fastify dev
```

## TanStack Start

TanStack Start + Vite + React 19. Scripts: `dev` (`vite dev`), `build` (`vite build`), `preview`.

`vite.config.ts` imports `@<project>/env/server` and calls `createViteEnv(import.meta.env)` so both server and `VITE_` client vars are validated at config load.

```bash
pnpm --filter @my-app/tanstack-start dev
```

Default port: `3003`.

## React Router

React Router 8 framework mode + Vite + React 19. Scripts: `dev` (`react-router dev`), `build` (`react-router build`), `start` (`react-router-serve`).

`vite.config.ts` imports `@<project>/env/server` and calls `createViteEnv(import.meta.env)` so both server and `VITE_` client vars are validated at config load.

```bash
pnpm --filter @my-app/react-router dev
```

Default port: `5174`.

## Auth and database

App templates do **not** wrap `AuthProvider` or import `@<project>/db`. After you add those packages, import them in the app yourself. See [Packages](./packages.md).
