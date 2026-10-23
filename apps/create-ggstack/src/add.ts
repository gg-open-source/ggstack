import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { generateApp } from "./generators/apps/index.js";
import { generateAuthPackage } from "./generators/packages/auth.js";
import { generateEmailPackage } from "./generators/packages/email.js";
import { getEnvVarSpecs, type EnvVarSpec } from "./generators/packages/env.js";
import { generatePackage } from "./generators/packages/index.js";
import { generatePaymentsPackage } from "./generators/packages/payments.js";
import { generateTooling } from "./generators/tooling/index.js";
import { generateTailwindTooling } from "./generators/tooling/tailwind.js";
import type {
  AppConfig,
  PackageConfig,
  ProjectBuilder,
  StackConfig,
  ToolingConfig,
} from "./types.js";

export class AddToProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AddToProjectError";
  }
}

function uniqueByType<T extends { type: string }>(
  existing: T[],
  added: T[],
): T[] {
  const result = [...existing];
  for (const item of added) {
    const index = result.findIndex((current) => current.type === item.type);
    if (index >= 0) result[index] = item;
    else result.push(item);
  }
  return result;
}

export function mergeStackConfig(
  existing: StackConfig,
  additions: StackConfig,
): StackConfig {
  return {
    ...existing,
    packageManager: additions.packageManager,
    apps: [...existing.apps, ...additions.apps],
    packages: uniqueByType(existing.packages, additions.packages),
    auth: additions.auth.provider === "none" ? existing.auth : additions.auth,
    db: additions.db.orm === "none" ? existing.db : additions.db,
    payments:
      additions.payments.provider === "none"
        ? existing.payments
        : additions.payments,
    email:
      additions.email.provider === "none" ? existing.email : additions.email,
    tooling: uniqueByType(existing.tooling, additions.tooling),
  };
}

function componentDirectories(config: StackConfig): string[] {
  const dirs = config.apps.map((app) => `apps/${app.name}`);
  for (const pkg of config.packages) {
    if (pkg.type === "shadcn") dirs.push("packages/ui");
    if (pkg.type === "trpc") dirs.push("packages/api");
    if (pkg.type === "db") dirs.push("packages/db");
  }
  if (config.auth.provider !== "none") dirs.push("packages/auth");
  if (config.payments.provider !== "none") dirs.push("packages/payments");
  if (config.email.provider !== "none") dirs.push("packages/email");
  for (const tooling of config.tooling) dirs.push(`tooling/${tooling.type}`);
  return dirs;
}

export function findAdditionCollisions(config: StackConfig): string[] {
  return componentDirectories(config).filter((relativePath) =>
    existsSync(path.join(config.targetDir, relativePath)),
  );
}

function configForNewComponents(
  effective: StackConfig,
  additions: StackConfig,
): StackConfig {
  return {
    ...effective,
    apps: additions.apps,
    targetDir: additions.targetDir,
    packageManager: additions.packageManager,
  };
}

export async function buildProjectAdditions(
  additions: StackConfig,
  effective: StackConfig,
  builder: ProjectBuilder,
): Promise<void> {
  const context = configForNewComponents(effective, additions);

  for (const app of additions.apps) {
    await generateApp(context, builder, app);
  }
  for (const pkg of additions.packages) {
    generatePackage(context, builder, pkg);
  }
  if (additions.auth.provider !== "none") generateAuthPackage(context, builder);
  if (additions.payments.provider !== "none")
    generatePaymentsPackage(context, builder);
  if (additions.email.provider !== "none")
    generateEmailPackage(context, builder);
  for (const tooling of additions.tooling) {
    generateTooling(context, builder, tooling);
  }

  const tailwindAlreadyInstalled = effective.tooling.some(
    (tool) => tool.type === "tailwind",
  );
  const tailwindBeingAdded = additions.tooling.some(
    (tool) => tool.type === "tailwind",
  );
  const shadcnBeingAdded = additions.packages.some(
    (pkg) => pkg.type === "shadcn",
  );
  if (
    tailwindAlreadyInstalled &&
    !tailwindBeingAdded &&
    (additions.apps.length > 0 || shadcnBeingAdded)
  ) {
    generateTailwindTooling(context, builder);
    if (shadcnBeingAdded) mergeExistingTailwindForShadcn(context, builder);
    const shadcnTailwindUpdates = new Set([
      "tooling/tailwind/package.json",
      "tooling/tailwind/src/styles.css",
      "tooling/tailwind/src/theme.css",
    ]);
    for (const file of Object.keys(builder.files)) {
      if (
        file.startsWith("tooling/tailwind/") &&
        !(shadcnBeingAdded && shadcnTailwindUpdates.has(file))
      ) {
        delete builder.files[file];
      }
    }
  }

  mergeEnvironmentFiles(effective, builder);
}

function mergeExistingTailwindForShadcn(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const packagePath = "tooling/tailwind/package.json";
  const currentPackageRaw = readRequired(config.targetDir, packagePath);
  const generatedPackageRaw = builder.files[packagePath];
  try {
    const currentPackage = JSON.parse(currentPackageRaw) as Record<
      string,
      unknown
    > & { dependencies?: Record<string, string> };
    const generatedPackage = JSON.parse(generatedPackageRaw ?? "") as {
      dependencies?: Record<string, string>;
    };
    currentPackage.dependencies = {
      ...currentPackage.dependencies,
      ...(generatedPackage.dependencies?.shadcn
        ? { shadcn: generatedPackage.dependencies.shadcn }
        : {}),
      ...(generatedPackage.dependencies?.["tw-animate-css"]
        ? {
            "tw-animate-css": generatedPackage.dependencies["tw-animate-css"],
          }
        : {}),
    };
    builder.addFile(
      packagePath,
      `${JSON.stringify(currentPackage, null, 2)}\n`,
    );
  } catch {
    throw new AddToProjectError(
      `Cannot update ${packagePath}; it is not valid JSON.`,
    );
  }

  const stylesPath = "tooling/tailwind/src/styles.css";
  let styles = readRequired(config.targetDir, stylesPath);
  const imports = [
    '@import "tw-animate-css";',
    '@import "shadcn/tailwind.css";',
  ];
  const missingImports = imports.filter((line) => !styles.includes(line));
  if (missingImports.length > 0) {
    const themeImport = '@import "./theme.css";';
    styles = styles.includes(themeImport)
      ? styles.replace(
          themeImport,
          `${missingImports.join("\n")}\n${themeImport}`,
        )
      : `${styles.trimEnd()}\n${missingImports.join("\n")}\n`;
  }
  builder.addFile(stylesPath, styles);

  const themePath = "tooling/tailwind/src/theme.css";
  const currentTheme = readRequired(config.targetDir, themePath);
  if (currentTheme.trim() === "/* Shared theme tokens go here. */") {
    const generatedTheme = builder.files[themePath];
    if (generatedTheme) builder.addFile(themePath, generatedTheme);
  } else {
    builder.addFile(themePath, currentTheme);
  }
}

function zodForSpec(spec: EnvVarSpec): string {
  if (spec.schema === "nodeEnv")
    return 'z.enum(["development", "test", "production"]).optional()';
  if (spec.schema === "polarServer")
    return 'z.enum(["sandbox", "production"]).optional()';
  if (spec.schema === "url")
    return spec.required ? "z.string().url()" : "z.string().url().optional()";
  return spec.required ? "z.string().min(1)" : "z.string().min(1).optional()";
}

function readRequired(targetDir: string, relativePath: string): string {
  try {
    return readFileSync(path.join(targetDir, relativePath), "utf-8");
  } catch {
    throw new AddToProjectError(
      `Cannot update ${relativePath}; the existing ggstack file is missing or unreadable.`,
    );
  }
}

function mergeServerEnv(current: string, specs: EnvVarSpec[]): string {
  const missing = specs.filter(
    (spec) => spec.kind === "server" && !current.includes(`${spec.name}:`),
  );
  if (missing.length === 0) return current;
  const marker = "  server: {\n";
  if (!current.includes(marker)) {
    throw new AddToProjectError(
      "Cannot safely update packages/env/src/server.ts because its generated server schema was not found.",
    );
  }
  const entries = missing
    .map((spec) => `    ${spec.name}: ${zodForSpec(spec)},\n`)
    .join("");
  return current.replace(marker, `${marker}${entries}`);
}

const CLIENT_EXPORTS = [
  ["NEXT_PUBLIC_", "nextEnv"],
  ["EXPO_PUBLIC_", "expoEnv"],
  ["VITE_", "createViteEnv"],
  ["PUBLIC_", "astroEnv"],
] as const;

function generatedClientBlock(
  exportName: string,
  prefix: string,
  specs: EnvVarSpec[],
): string {
  const entries = specs
    .filter((spec) => spec.kind === "client" && spec.name.startsWith(prefix))
    .map(
      (spec) =>
        `${exportName === "createViteEnv" ? "      " : "    "}${spec.name}: ${zodForSpec(spec)},`,
    )
    .join("\n");
  if (exportName === "createViteEnv") {
    return `export const createViteEnv = (\n  runtimeEnv: Record<string, string | boolean | number | undefined>,\n) =>\n  createEnv({\n    clientPrefix: "VITE_",\n    client: {\n${entries}${entries ? "\n" : ""}    },\n    runtimeEnv,\n    emptyStringAsUndefined: true,\n    skipValidation,\n  });\n`;
  }
  return `export const ${exportName} = createEnv({\n  clientPrefix: "${prefix}",\n  client: {\n${entries}${entries ? "\n" : ""}  },\n  runtimeEnv: process.env,\n  emptyStringAsUndefined: true,\n  skipValidation,\n});\n`;
}

function ensureClientHeader(current: string): string {
  if (current.includes('from "@t3-oss/env-core"')) return current;
  const header = `import { createEnv } from "@t3-oss/env-core";\nimport { z } from "zod";\n\nconst skipValidation =\n  !!process.env.CI ||\n  process.env.SKIP_ENV_VALIDATION === "true" ||\n  process.env.npm_lifecycle_event === "lint";\n\n`;
  return current.trim() === "export {};" ? header : `${header}${current}`;
}

function addClientEntries(
  current: string,
  exportName: string,
  prefix: string,
  specs: EnvVarSpec[],
): string {
  const relevant = specs.filter(
    (spec) => spec.kind === "client" && spec.name.startsWith(prefix),
  );
  if (!current.includes(`export const ${exportName}`)) {
    return `${current.trimEnd()}\n\n${generatedClientBlock(exportName, prefix, specs)}`;
  }
  const start = current.indexOf(`export const ${exportName}`);
  const clientStart = current.indexOf("client: {\n", start);
  if (clientStart < 0) {
    throw new AddToProjectError(
      `Cannot safely update the ${exportName} schema in packages/env/src/client.ts.`,
    );
  }
  const insertionPoint = clientStart + "client: {\n".length;
  const indent = exportName === "createViteEnv" ? "      " : "    ";
  const missing = relevant.filter((spec) => !current.includes(`${spec.name}:`));
  const entries = missing
    .map((spec) => `${indent}${spec.name}: ${zodForSpec(spec)},\n`)
    .join("");
  return entries
    ? `${current.slice(0, insertionPoint)}${entries}${current.slice(insertionPoint)}`
    : current;
}

function publicAuthConfig(config: StackConfig): string | undefined {
  if (config.auth.provider === "clerk") {
    return `export function getPublicAuthConfig() {\n  return {\n    clerkPublishableKey:\n      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??\n      process.env.VITE_CLERK_PUBLISHABLE_KEY ??\n      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??\n      process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ??\n      "",\n  };\n}\n`;
  }
  if (config.auth.provider === "workos") {
    return `export function getPublicAuthConfig() {\n  return {\n    workosClientId:\n      process.env.NEXT_PUBLIC_WORKOS_CLIENT_ID ??\n      process.env.VITE_WORKOS_CLIENT_ID ??\n      process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID ??\n      process.env.PUBLIC_WORKOS_CLIENT_ID ??\n      "",\n  };\n}\n`;
  }
  return undefined;
}

function mergeClientEnv(
  current: string,
  config: StackConfig,
  specs: EnvVarSpec[],
): string {
  let merged = current;
  for (const [prefix, exportName] of CLIENT_EXPORTS) {
    const isNeeded =
      specs.some(
        (spec) => spec.kind === "client" && spec.name.startsWith(prefix),
      ) ||
      (prefix === "NEXT_PUBLIC_" &&
        config.apps.some((app) => app.type === "next")) ||
      (prefix === "EXPO_PUBLIC_" &&
        config.apps.some((app) => app.type === "expo")) ||
      (prefix === "PUBLIC_" &&
        config.apps.some((app) => app.type === "astro")) ||
      (prefix === "VITE_" &&
        config.apps.some((app) =>
          ["vite", "electron", "tanstack-start", "react-router"].includes(
            app.type,
          ),
        ));
    if (!isNeeded) continue;
    merged = ensureClientHeader(merged);
    merged = addClientEntries(merged, exportName, prefix, specs);
  }

  const authConfig = publicAuthConfig(config);
  if (authConfig && !merged.includes("function getPublicAuthConfig")) {
    merged = `${merged.trimEnd()}\n\n${authConfig}`;
  }
  return merged;
}

function mergeEnvExample(current: string, specs: EnvVarSpec[]): string {
  const missing = specs.filter(
    (spec) => spec.name !== "NODE_ENV" && !current.includes(`${spec.name}=`),
  );
  if (missing.length === 0) return current;
  const lines = ["", "# Added by create-ggstack --add"];
  for (const spec of missing) {
    if (spec.comment) lines.push(`# ${spec.comment}`);
    lines.push(`${spec.name}=`);
  }
  return `${current.trimEnd()}\n${lines.join("\n")}\n`;
}

function mergeTurbo(current: string, specs: EnvVarSpec[]): string {
  let turbo: Record<string, unknown>;
  try {
    turbo = JSON.parse(current) as Record<string, unknown>;
  } catch {
    throw new AddToProjectError(
      "Cannot update turbo.json because it is not valid JSON.",
    );
  }
  const globalEnv = Array.isArray(turbo.globalEnv)
    ? turbo.globalEnv.filter((item): item is string => typeof item === "string")
    : [];
  const missing = specs
    .map((spec) => spec.name)
    .filter((name) => name !== "NODE_ENV" && !globalEnv.includes(name));
  if (missing.length === 0) return current;
  turbo.globalEnv = Array.from(new Set([...globalEnv, ...missing]));
  return `${JSON.stringify(turbo, null, 2)}\n`;
}

function addFileIfChanged(
  builder: ProjectBuilder,
  relativePath: string,
  current: string,
  merged: string,
): void {
  if (merged !== current) builder.addFile(relativePath, merged);
}

function mergeEnvironmentFiles(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const specs = getEnvVarSpecs(config);
  const targetDir = config.targetDir;
  const serverPath = "packages/env/src/server.ts";
  const server = readRequired(targetDir, serverPath);
  addFileIfChanged(builder, serverPath, server, mergeServerEnv(server, specs));
  const clientPath = "packages/env/src/client.ts";
  const client = readRequired(targetDir, clientPath);
  addFileIfChanged(
    builder,
    clientPath,
    client,
    mergeClientEnv(client, config, specs),
  );
  const envPath = ".env.example";
  const env = readRequired(targetDir, envPath);
  addFileIfChanged(builder, envPath, env, mergeEnvExample(env, specs));
  const turboPath = "turbo.json";
  const turbo = readRequired(targetDir, turboPath);
  addFileIfChanged(builder, turboPath, turbo, mergeTurbo(turbo, specs));
}

export function describeAdditions(config: StackConfig): string[] {
  const items = [
    ...config.apps.map((app: AppConfig) => `app apps/${app.name}`),
    ...config.packages.map((pkg: PackageConfig) => `package ${pkg.type}`),
    ...config.tooling.map((tool: ToolingConfig) => `tooling ${tool.type}`),
  ];
  if (config.auth.provider !== "none")
    items.push(`auth ${config.auth.provider}`);
  if (config.db.orm !== "none") items.push(`database ${config.db.orm}`);
  if (config.payments.provider !== "none")
    items.push(`payments ${config.payments.provider}`);
  if (config.email.provider !== "none")
    items.push(`email ${config.email.provider}`);
  return items;
}
