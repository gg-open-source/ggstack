import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import {
  APP_CHOICES,
  DEFAULT_PACKAGE_MANAGER,
  DEFAULT_PROJECT_NAME,
  PACKAGE_CHOICES,
  TOOLING_CHOICES,
} from "./config.js";
import { buildProject } from "./runner.js";
import type {
  AppConfig,
  PackageConfig,
  PackageManager,
  StackConfig,
  ToolingConfig,
} from "./types.js";
import { ProjectBuilder } from "./types.js";
import { execa } from "execa";
import { runCommands } from "./utils/exec.js";
import { writeProjectFiles } from "./utils/files.js";
import {
  intro,
  log,
  multiSelect,
  outro,
  spinner,
  text,
} from "./utils/prompts.js";

export function parsePackageManagerFlag(
  args: string[],
): PackageManager | undefined {
  for (const arg of args) {
    if (arg === "--npm") return "npm";
    if (arg === "--pnpm") return "pnpm";
    if (arg === "--yarn") return "yarn";
    if (arg === "--bun") return "bun";
  }
  return undefined;
}

export function getProjectNameArg(args: string[]): string | undefined {
  return args.find((arg) => !arg.startsWith("-"));
}

export function sanitizeAppName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export async function isPackageManagerInstalled(
  packageManager: PackageManager,
): Promise<boolean> {
  try {
    await execa(packageManager, ["--version"], { stdio: "ignore" });
    return true;
    // eslint-disable-next-line no-unused-vars
  } catch (_error) {
    return false;
  }
}

export function warnAboutPnpmWorkspace(packageManager: PackageManager): void {
  if (packageManager !== "pnpm") {
    log(
      pc.yellow(
        `Warning: ${packageManager} was selected for running external CLIs, but the generated monorepo still uses pnpm workspaces. Make sure pnpm is installed before running the project.`,
      ),
    );
  }
}

export async function collectConfig(args: string[]): Promise<StackConfig> {
  intro(pc.bgCyan(pc.black(" create-ggstack ")));

  const projectNameArg = getProjectNameArg(args);
  const projectName =
    projectNameArg ??
    (await text({
      message: "Project name?",
      defaultValue: DEFAULT_PROJECT_NAME,
      validate: (value) => {
        if (value.trim().length === 0) return "Project name is required";
        return undefined;
      },
    }));

  const packageManager =
    parsePackageManagerFlag(args) ?? DEFAULT_PACKAGE_MANAGER;

  const packageManagerInstalled =
    await isPackageManagerInstalled(packageManager);
  if (!packageManagerInstalled) {
    log(
      pc.red(`Package manager "${packageManager}" is not installed. Aborting.`),
    );
    process.exit(1);
  }

  warnAboutPnpmWorkspace(packageManager);

  const selectedApps = await multiSelect({
    message: "Which apps do you want to add?",
    options: APP_CHOICES.map((choice) => ({ ...choice })),
    required: false,
  });

  const apps: AppConfig[] = [];
  for (const appType of selectedApps) {
    const name = await text({
      message: `Name for the ${appType} app?`,
      defaultValue: appType === "vite" ? "web" : "next",
      validate: (value) => {
        if (value.trim().length === 0) return "App name is required";
        if (apps.some((a) => a.name === sanitizeAppName(value)))
          return "App name must be unique";
        return undefined;
      },
    });
    apps.push({
      type: appType as "vite" | "next",
      name: sanitizeAppName(name),
    });
  }

  const selectedPackages = await multiSelect({
    message: "Which packages do you want to add?",
    options: PACKAGE_CHOICES.map((choice) => ({ ...choice })),
    required: false,
  });

  const packages: PackageConfig[] = selectedPackages.map((type) => ({
    type: type as "shadcn",
  }));

  const shadcnSelected = packages.some((pkg) => pkg.type === "shadcn");

  const availableTooling = TOOLING_CHOICES.map((choice) => ({
    ...choice,
    hint:
      choice.value === "tailwind" && shadcnSelected
        ? "auto-selected because shadcn/ui is enabled"
        : choice.hint,
  }));

  const initialToolingValues = shadcnSelected ? ["tailwind"] : [];
  const selectedTooling = await multiSelect({
    message: "Which tooling do you want to add?",
    options: availableTooling,
    required: false,
    initialValues: initialToolingValues,
  });

  const tooling: ToolingConfig[] = [
    ...new Set([...(shadcnSelected ? ["tailwind"] : []), ...selectedTooling]),
  ].map((type) => ({
    type: type as "tailwind" | "oxc" | "prettier" | "eslint",
  }));

  return {
    projectName: sanitizeAppName(projectName),
    targetDir: path.resolve(process.cwd(), projectName),
    packageManager,
    apps,
    packages,
    tooling,
  };
}

export async function createProject(config: StackConfig): Promise<void> {
  if (existsSync(config.targetDir)) {
    log(pc.yellow(`Directory ${config.targetDir} already exists. Aborting.`));
    process.exit(1);
  }

  const s = spinner();
  s.start("Scaffolding project...");

  await mkdir(config.targetDir, { recursive: true });

  const builder = new ProjectBuilder();
  buildProject(config, builder);

  await writeProjectFiles(config.targetDir, builder);

  s.stop("Project files written.");

  if (builder.commands.length > 0) {
    log(pc.blue("Running official app CLIs..."));
    await runCommands(builder.commands);
  }

  log(pc.green(`\nCreated ${config.projectName} at ${config.targetDir}`));
  log(pc.gray("Next steps:"));
  log(pc.gray(`  cd ${config.projectName}`));
  log(pc.gray(`  ${config.packageManager} install`));
  if (config.apps.length > 0) {
    log(pc.gray(`  ${config.packageManager} dev`));
  }
}

export async function cli(args: string[]): Promise<void> {
  const config = await collectConfig(args);
  await createProject(config);
  outro(pc.green("Done! Happy hacking."));
}
