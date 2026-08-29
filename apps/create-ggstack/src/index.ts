#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cli } from "./cli.js";

function getPackageJsonVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  return pkg.version;
}

function printHelp(): void {
  console.log(`
create-ggstack [project-name] [options]

Scaffold a pnpm monorepo in the T3/Turbo style.

Build a stack visually on the docs /create page, copy the command, and paste it
in a terminal. --stack applies that config with no prompts.

Options:
  --stack <code>                 Full stack from the docs /create page. Skips prompts
  --decode [code]                Print the decoded --stack config and exit
  --preset <code>                shadcn/ui preset (named style or code from ui.shadcn.com/create)
  --pnpm, --npm, --yarn, --bun   Package manager to use for running external CLIs
  -h, --help                     Show this help message
  -v, --version                  Show version

Examples:
  pnpm create ggstack
  pnpm create ggstack my-app
  pnpm create ggstack@latest my-app --stack g1e30
  pnpm create ggstack my-app --preset b2D0vQ7G4
  pnpm create ggstack --decode g1e30
  npx create-ggstack my-app --pnpm
  pnpm dlx create-ggstack my-app
`);
}

function printVersion(): void {
  console.log(getPackageJsonVersion());
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  printVersion();
  process.exit(0);
}

cli(args).catch((error) => {
  console.error(error);
  process.exit(1);
});
