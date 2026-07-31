# create-ggstack

An interactive CLI to scaffold a pnpm monorepo in the style of T3 Turbo, with support for Vite, Next.js, Expo Router, Electron, shadcn/ui, and shared tooling packages.

## Usage

```bash
# pnpm (recommended)
pnpm create ggstack

# with an optional project name
pnpm create ggstack my-app

# npx
npx create-ggstack my-app --pnpm

# pnpm dlx
pnpm dlx create-ggstack my-app
```

## Requirements

- Node.js >= 22
- pnpm (the generated monorepo uses pnpm workspaces)

## What it scaffolds

```
my-app/
├── apps/
│   ├── web/          # optional Vanilla Vite app
│   ├── next/         # optional Next.js app
│   ├── mobile/       # optional Expo Router app
│   └── desktop/      # optional Electron + Vite app
├── packages/
│   └── ui/           # optional shadcn/ui package
├── tooling/
│   ├── oxc/          # lint + format config
│   ├── tailwind/     # shared Tailwind config
│   ├── tsconfig/     # shared TypeScript config
│   ├── prettier/     # optional Prettier stub
│   └── eslint/       # optional ESLint stub
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── .gitignore
```

## Options

| Flag | Description |
|------|-------------|
| `--pnpm` | Use pnpm to run official app CLIs (default) |
| `--npm` | Use npm to run official app CLIs |
| `--yarn` | Use yarn to run official app CLIs |
| `--bun` | Use bun to run official app CLIs |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Interactive flow

1. Project name (optional positional argument, otherwise prompted)
2. Select apps (Vanilla Vite, Next.js, Expo Router, Electron + Vite)
3. Name each app
4. Select packages (shadcn/ui)
5. Select tooling (Tailwind CSS, Oxc, Prettier, ESLint)
   - Tailwind is auto-selected if shadcn/ui is chosen

## Templates

Apps are generated from static templates shipped with the CLI:

- **Vanilla Vite**: Vite + TypeScript starter
- **Next.js**: Next.js 15 + React 19 + TypeScript
- **Expo Router**: Expo SDK + Expo Router + TypeScript
- **Electron + Vite**: Electron + Vite + vanilla TypeScript

## License

MIT
