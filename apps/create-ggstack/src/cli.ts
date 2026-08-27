import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import {
  APP_CHOICES,
  AUTH_CHOICES,
  DB_DIALECT_CHOICES,
  DB_ORM_CHOICES,
  PRISMA_DB_DIALECT_CHOICES,
  DEFAULT_APP_NAMES,
  DEFAULT_AUTH_PROVIDER,
  DEFAULT_DB_DIALECT,
  DEFAULT_DB_ORM,
  DEFAULT_PACKAGE_MANAGER,
  DEFAULT_PAYMENT_PROVIDER,
  DEFAULT_PROJECT_NAME,
  DEFAULT_SHADCN_BASE,
  DEFAULT_SHADCN_PRESET,
  DEFAULT_VITE_FRAMEWORK,
  DEFAULT_VITE_VARIANT,
  isAuthProvider,
  isDbDialect,
  isDbOrm,
  isPaymentProvider,
  isShadcnBase,
  isShadcnPreset,
  isViteFramework,
  isViteVariant,
  SHADCN_BASE_CHOICES,
  VITE_FRAMEWORK_CHOICES,
  VITE_REACT_VARIANT_CHOICES,
  PACKAGE_CHOICES,
  PAYMENT_CHOICES,
  TOOLING_CHOICES,
} from "./config.js";
import { buildProject } from "./runner.js";
import type {
  AppConfig,
  AuthConfig,
  DbConfig,
  PackageConfig,
  PackageManager,
  PackageType,
  PaymentConfig,
  StackConfig,
  ToolingConfig,
  ViteVariant,
} from "./types.js";
import { ProjectBuilder } from "./types.js";
import { execa } from "execa";
import { runCommands } from "./utils/exec.js";
import { writeProjectFiles } from "./utils/files.js";
import {
  confirm,
  intro,
  log,
  multiSelect,
  outro,
  select,
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
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--preset") {
      i += 1;
      continue;
    }
    if (!arg.startsWith("-")) return arg;
  }
  return undefined;
}

export type ParsedPresetFlag =
  | { kind: "none" }
  | { kind: "value"; value: string }
  | { kind: "error"; message: string };

export function parsePresetFlag(args: string[]): ParsedPresetFlag {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    let value: string | undefined;

    if (arg === "--preset") {
      value = args[i + 1];
      if (!value || value.startsWith("-")) {
        return {
          kind: "error",
          message: "The --preset flag requires a code, e.g. --preset b2D0vQ7G4",
        };
      }
    } else if (arg.startsWith("--preset=")) {
      value = arg.slice("--preset=".length);
    } else {
      continue;
    }

    if (!value || !isShadcnPreset(value)) {
      return {
        kind: "error",
        message:
          "Invalid --preset. Use a named style like nova, or a preset code from ui.shadcn.com/create",
      };
    }

    return { kind: "value", value };
  }

  return { kind: "none" };
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
      placeholder: DEFAULT_PROJECT_NAME,
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

  const presetFlag = parsePresetFlag(args);
  if (presetFlag.kind === "error") {
    log(pc.red(presetFlag.message));
    process.exit(1);
  }

  const selectedApps = await multiSelect({
    message: "Which apps do you want to add?",
    options: APP_CHOICES.map((choice) => ({ ...choice })),
    required: false,
  });

  const apps: AppConfig[] = [];
  for (const appType of selectedApps) {
    const defaultName =
      DEFAULT_APP_NAMES[appType as keyof typeof DEFAULT_APP_NAMES] ?? appType;
    const name = await text({
      message: `Name for the ${appType} app?`,
      placeholder: defaultName,
      defaultValue: defaultName,
      validate: (value) => {
        if (value.trim().length === 0) return "App name is required";
        if (apps.some((a) => a.name === sanitizeAppName(value)))
          return "App name must be unique";
        return undefined;
      },
    });
    const app: AppConfig = {
      type: appType as AppConfig["type"],
      name: sanitizeAppName(name),
    };

    if (app.type === "vite") {
      const selectedFramework = await select({
        message: "Select a Vite framework?",
        options: VITE_FRAMEWORK_CHOICES.map((choice) => ({ ...choice })),
        initialValue: DEFAULT_VITE_FRAMEWORK,
      });
      const framework = isViteFramework(selectedFramework)
        ? selectedFramework
        : DEFAULT_VITE_FRAMEWORK;

      let variant: ViteVariant = DEFAULT_VITE_VARIANT;
      if (framework === "react") {
        const selectedVariant = await select({
          message: "Select a variant?",
          options: VITE_REACT_VARIANT_CHOICES.map((choice) => ({ ...choice })),
          initialValue: DEFAULT_VITE_VARIANT,
        });
        variant = isViteVariant(selectedVariant)
          ? selectedVariant
          : DEFAULT_VITE_VARIANT;
      }

      app.vite = { framework, variant };
    }

    apps.push(app);
  }

  const selectedPackages = await multiSelect({
    message: "Which packages do you want to add?",
    options: PACKAGE_CHOICES.map((choice) => ({
      ...choice,
      hint:
        choice.value === "shadcn" && presetFlag.kind === "value"
          ? "auto-selected because --preset was passed"
          : choice.hint,
    })),
    required: false,
    initialValues: presetFlag.kind === "value" ? ["shadcn"] : undefined,
  });

  let packages: PackageConfig[] = selectedPackages.map((type) => ({
    type: type as PackageType,
  }));

  if (
    presetFlag.kind === "value" &&
    !packages.some((pkg) => pkg.type === "shadcn")
  ) {
    packages.push({ type: "shadcn" });
  }

  const shadcnSelected = packages.some((pkg) => pkg.type === "shadcn");

  if (shadcnSelected) {
    const selectedBase = await select({
      message: "Which shadcn component base?",
      options: SHADCN_BASE_CHOICES.map((choice) => ({ ...choice })),
      initialValue: DEFAULT_SHADCN_BASE,
    });
    const base = isShadcnBase(selectedBase)
      ? selectedBase
      : DEFAULT_SHADCN_BASE;

    let preset = DEFAULT_SHADCN_PRESET;
    if (presetFlag.kind === "value") {
      preset = presetFlag.value;
    } else {
      const wantsPreset = await confirm({
        message: "Do you want to use a shadcn preset?",
        initialValue: false,
      });

      if (wantsPreset) {
        const selectedPreset = await text({
          message: "Enter your shadcn preset code (from ui.shadcn.com/create)",
          placeholder: "b2D0vQ7G4",
          validate: (value) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) return "Preset code is required";
            if (!isShadcnPreset(trimmed)) {
              return "Use a named style like nova, or a preset code from ui.shadcn.com/create";
            }
            return undefined;
          },
        });
        preset = selectedPreset.trim();
      } else {
        log(
          pc.gray(
            `Using the default shadcn config (${DEFAULT_SHADCN_PRESET}).`,
          ),
        );
      }
    }

    packages = packages.map((pkg) =>
      pkg.type === "shadcn"
        ? { type: "shadcn", shadcn: { preset, base } }
        : pkg,
    );
  }

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

  const selectedAuth = await select({
    message: "Which authentication provider do you want to use?",
    options: AUTH_CHOICES.map((choice) => ({ ...choice })),
    initialValue: DEFAULT_AUTH_PROVIDER,
  });

  const auth: AuthConfig = {
    provider: isAuthProvider(selectedAuth)
      ? selectedAuth
      : DEFAULT_AUTH_PROVIDER,
  };

  const selectedDbOrm = await select({
    message: "Which database ORM do you want to use?",
    options: DB_ORM_CHOICES.map((choice) => ({ ...choice })),
    initialValue: DEFAULT_DB_ORM,
  });

  const db: DbConfig = {
    orm: isDbOrm(selectedDbOrm) ? selectedDbOrm : DEFAULT_DB_ORM,
  };

  if (db.orm !== "none") {
    const dialectChoices =
      db.orm === "prisma" ? PRISMA_DB_DIALECT_CHOICES : DB_DIALECT_CHOICES;
    const selectedDbDialect = await select({
      message: "Which database do you want to use?",
      options: dialectChoices.map((choice) => ({ ...choice })),
      initialValue: DEFAULT_DB_DIALECT,
    });
    db.dialect = isDbDialect(selectedDbDialect)
      ? selectedDbDialect
      : DEFAULT_DB_DIALECT;
  }

  if (db.orm !== "none") {
    packages.push({ type: "db" });
  }

  const selectedPayments = await select({
    message: "Which payment provider do you want to use?",
    options: PAYMENT_CHOICES.map((choice) => ({ ...choice })),
    initialValue: DEFAULT_PAYMENT_PROVIDER,
  });

  const payments: PaymentConfig = {
    provider: isPaymentProvider(selectedPayments)
      ? selectedPayments
      : DEFAULT_PAYMENT_PROVIDER,
  };

  if (payments.provider === "stripe") {
    log(
      pc.gray(
        "Stripe uses Upstash Redis as a KV store and a single syncStripeDataToKV function (Theo's pattern).",
      ),
    );
  }

  return {
    projectName: sanitizeAppName(projectName),
    targetDir: path.resolve(process.cwd(), projectName),
    packageManager,
    apps,
    packages,
    auth,
    db,
    payments,
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
  await buildProject(config, builder);

  await writeProjectFiles(config.targetDir, builder);

  s.stop("Project files written.");

  if (builder.commands.length > 0) {
    log(pc.blue("Running post-scaffold commands..."));
    await runCommands(builder.commands);
  }

  log(pc.green(`\nCreated ${config.projectName} at ${config.targetDir}`));
  log(pc.gray("Next steps:"));
  log(pc.gray(`  cd ${config.projectName}`));
  log(pc.gray("  cp .env.example .env"));
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
