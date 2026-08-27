export type AppType =
  | "vite"
  | "next"
  | "astro"
  | "expo"
  | "electron"
  | "express"
  | "fastify"
  | "tanstack-start"
  | "react-router";

export type ViteFramework =
  | "vanilla"
  | "vue"
  | "react"
  | "preact"
  | "lit"
  | "svelte"
  | "solid"
  | "qwik";

export type ViteVariant = "ts" | "react-compiler";

export interface ViteAppOptions {
  framework: ViteFramework;
  variant: ViteVariant;
}

export interface AppConfig {
  type: AppType;
  name: string;
  vite?: ViteAppOptions;
}

export type PackageType = "shadcn" | "auth" | "db" | "trpc";

export type ShadcnBase = "base" | "radix" | "aria";

export interface ShadcnOptions {
  preset: string;
  base: ShadcnBase;
}

export interface PackageConfig {
  type: PackageType;
  shadcn?: ShadcnOptions;
}

export type AuthProvider = "none" | "better-auth" | "clerk" | "workos";

export interface AuthConfig {
  provider: AuthProvider;
}

export type DbOrm = "none" | "drizzle" | "prisma";

export type DbDialect = "postgresql" | "mysql" | "sqlite";

export interface DbConfig {
  orm: DbOrm;
  dialect?: DbDialect;
}

export type PaymentProvider = "none" | "stripe" | "polar" | "autumn";

export interface PaymentConfig {
  provider: PaymentProvider;
}

export type ToolingType = "tailwind" | "oxc" | "prettier" | "eslint";

export interface ToolingConfig {
  type: ToolingType;
}

export interface StackConfig {
  projectName: string;
  targetDir: string;
  packageManager: PackageManager;
  apps: AppConfig[];
  packages: PackageConfig[];
  auth: AuthConfig;
  db: DbConfig;
  payments: PaymentConfig;
  tooling: ToolingConfig[];
}

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  type?: "module" | "commonjs";
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
  [key: string]: unknown;
}

export interface ProjectCommand {
  command: string;
  args: string[];
  cwd?: string;
  description?: string;
}

export class ProjectBuilder {
  files: Record<string, string> = {};
  commands: ProjectCommand[] = [];
  rootPackageJson: PackageJson = {};

  addFile(relativePath: string, content: string): void {
    this.files[relativePath] = content;
  }

  addCommand(command: ProjectCommand): void {
    this.commands.push(command);
  }

  setRootPackageJson(pkg: PackageJson): void {
    this.rootPackageJson = pkg;
  }
}
