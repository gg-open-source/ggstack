import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_SHADCN_BASE, DEFAULT_SHADCN_PRESET } from "./config.js";
import type {
  AppConfig,
  DbDialect,
  PackageJson,
  StackConfig,
  ViteFramework,
} from "./types.js";

export class ExistingProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExistingProjectError";
  }
}

function readJson<T>(filePath: string): T | undefined {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

function dependencies(pkg: PackageJson): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

function inferViteFramework(deps: Record<string, string>): ViteFramework {
  if (deps.vue) return "vue";
  if (deps.preact) return "preact";
  if (deps.lit) return "lit";
  if (deps.svelte) return "svelte";
  if (deps["solid-js"]) return "solid";
  if (deps["@builder.io/qwik"]) return "qwik";
  if (deps.react) return "react";
  return "vanilla";
}

function inferApp(name: string, pkg: PackageJson): AppConfig | undefined {
  const deps = dependencies(pkg);
  if (deps.next) return { type: "next", name };
  if (deps.astro) return { type: "astro", name };
  if (deps.expo || deps["expo-router"]) return { type: "expo", name };
  if (deps.electron) return { type: "electron", name };
  if (deps.express) return { type: "express", name };
  if (deps.fastify) return { type: "fastify", name };
  if (deps["@tanstack/react-start"]) return { type: "tanstack-start", name };
  if (deps["react-router"] || deps["@react-router/dev"])
    return { type: "react-router", name };
  if (deps.vite) {
    const framework = inferViteFramework(deps);
    return {
      type: "vite",
      name,
      vite: {
        framework,
        variant: deps["babel-plugin-react-compiler"] ? "react-compiler" : "ts",
      },
    };
  }
  return undefined;
}

function inspectApps(targetDir: string): AppConfig[] {
  const appsDir = path.join(targetDir, "apps");
  if (!existsSync(appsDir)) return [];

  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const pkg = readJson<PackageJson>(
        path.join(appsDir, entry.name, "package.json"),
      );
      if (!pkg) return [];
      const app = inferApp(entry.name, pkg);
      return app ? [app] : [];
    });
}

function packageDependencies(
  targetDir: string,
  packageName: string,
): Record<string, string> {
  const pkg = readJson<PackageJson>(
    path.join(targetDir, "packages", packageName, "package.json"),
  );
  return pkg ? dependencies(pkg) : {};
}

function inferDbDialect(
  targetDir: string,
  deps: Record<string, string>,
): DbDialect {
  if (deps.mysql2) return "mysql";
  if (deps["@libsql/client"]) return "sqlite";

  try {
    const schema = readFileSync(
      path.join(targetDir, "packages/db/prisma/schema.prisma"),
      "utf-8",
    );
    if (/provider\s*=\s*"mysql"/.test(schema)) return "mysql";
    if (/provider\s*=\s*"sqlite"/.test(schema)) return "sqlite";
  } catch {
    // A missing Prisma schema falls back to the ggstack default.
  }
  return "postgresql";
}

export interface ExistingProject {
  config: StackConfig;
  packageJson: PackageJson;
}

export function inspectExistingProject(targetDir: string): ExistingProject {
  const required = [
    "package.json",
    "pnpm-workspace.yaml",
    "turbo.json",
    "packages/env/package.json",
    "tooling/tsconfig/package.json",
  ];
  const missing = required.filter(
    (file) => !existsSync(path.join(targetDir, file)),
  );
  if (missing.length > 0) {
    throw new ExistingProjectError(
      `This does not look like a ggstack project. Missing: ${missing.join(", ")}.`,
    );
  }

  const packageJson = readJson<PackageJson>(
    path.join(targetDir, "package.json"),
  );
  if (!packageJson) {
    throw new ExistingProjectError("The root package.json is not valid JSON.");
  }

  const dbDeps = packageDependencies(targetDir, "db");
  const authDeps = packageDependencies(targetDir, "auth");
  const paymentDeps = packageDependencies(targetDir, "payments");
  const emailDeps = packageDependencies(targetDir, "email");
  const uiComponents = readJson<{ style?: string }>(
    path.join(targetDir, "packages/ui/components.json"),
  );
  const style = uiComponents?.style ?? "";
  const shadcnBase = style.startsWith("radix-")
    ? "radix"
    : style.startsWith("aria-")
      ? "aria"
      : DEFAULT_SHADCN_BASE;
  const shadcnPreset =
    style.replace(/^(base|radix|aria)-/, "") || DEFAULT_SHADCN_PRESET;

  const hasUi = existsSync(path.join(targetDir, "packages/ui/package.json"));
  const hasApi = existsSync(path.join(targetDir, "packages/api/package.json"));
  const hasDb = Object.keys(dbDeps).length > 0;
  const orm = dbDeps["drizzle-orm"]
    ? "drizzle"
    : dbDeps["@prisma/client"]
      ? "prisma"
      : "none";

  return {
    packageJson,
    config: {
      projectName:
        typeof packageJson.name === "string"
          ? packageJson.name
          : path.basename(targetDir),
      targetDir,
      packageManager: "pnpm",
      apps: inspectApps(targetDir),
      packages: [
        ...(hasUi
          ? [
              {
                type: "shadcn" as const,
                shadcn: { preset: shadcnPreset, base: shadcnBase },
              },
            ]
          : []),
        ...(hasApi ? [{ type: "trpc" as const }] : []),
        ...(hasDb ? [{ type: "db" as const }] : []),
      ],
      auth: {
        provider: authDeps["better-auth"]
          ? "better-auth"
          : authDeps["@clerk/clerk-react"]
            ? "clerk"
            : authDeps["@workos-inc/authkit-react"]
              ? "workos"
              : "none",
      },
      db:
        orm === "none"
          ? { orm }
          : { orm, dialect: inferDbDialect(targetDir, dbDeps) },
      payments: {
        provider: paymentDeps.stripe
          ? "stripe"
          : paymentDeps["@polar-sh/sdk"]
            ? "polar"
            : paymentDeps["autumn-js"]
              ? "autumn"
              : "none",
      },
      email: { provider: emailDeps.resend ? "resend" : "none" },
      tooling: (["tailwind", "oxc", "prettier", "eslint"] as const)
        .filter((name) =>
          existsSync(path.join(targetDir, `tooling/${name}/package.json`)),
        )
        .map((type) => ({ type })),
    },
  };
}
