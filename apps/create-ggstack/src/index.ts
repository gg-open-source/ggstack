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
create-ggstack <project-name> [options]

Scaffold a pnpm monorepo in the T3/Turbo style.

Options:
  --pnpm, --npm, --yarn, --bun   Package manager to use for running official CLIs
  -h, --help                     Show this help message
  -v, --version                  Show version

Examples:
  pnpm create ggstack
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
