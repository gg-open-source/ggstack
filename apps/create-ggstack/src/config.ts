import type {
  AuthProvider,
  DbDialect,
  DbOrm,
  PackageManager,
  PaymentProvider,
  ShadcnBase,
  ShadcnOptions,
  StackConfig,
  ViteFramework,
  ViteVariant,
} from "./types.js";

export const DEFAULT_PROJECT_NAME = "project";
export const DEFAULT_PACKAGE_MANAGER: PackageManager = "pnpm";
export const DEFAULT_AUTH_PROVIDER: AuthProvider = "none";
export const DEFAULT_DB_ORM: DbOrm = "none";
export const DEFAULT_DB_DIALECT: DbDialect = "postgresql";
export const DEFAULT_PAYMENT_PROVIDER: PaymentProvider = "none";
export const DEFAULT_VITE_FRAMEWORK: ViteFramework = "vanilla";
export const DEFAULT_VITE_VARIANT: ViteVariant = "ts";
export const DEFAULT_SHADCN_PRESET = "nova";
export const DEFAULT_SHADCN_BASE: ShadcnBase = "base";

export const APP_CHOICES = [
  { value: "vite", label: "Vite", hint: "custom template" },
  { value: "next", label: "Next.js", hint: "custom template" },
  { value: "astro", label: "Astro", hint: "custom template" },
  { value: "expo", label: "Expo Router", hint: "custom template" },
  { value: "electron", label: "Electron + Vite", hint: "custom template" },
  { value: "express", label: "Express", hint: "custom template" },
  { value: "fastify", label: "Fastify", hint: "custom template" },
  { value: "tanstack-start", label: "TanStack Start", hint: "custom template" },
  { value: "react-router", label: "React Router", hint: "custom template" },
] as const;

export const DEFAULT_APP_NAMES = {
  vite: "vite",
  next: "next",
  astro: "astro",
  expo: "expo",
  electron: "electron",
  express: "express",
  fastify: "fastify",
  "tanstack-start": "tanstack-start",
  "react-router": "react-router",
} as const;

export const PACKAGE_CHOICES = [
  { value: "shadcn", label: "shadcn/ui", hint: "shared UI package + presets" },
  { value: "trpc", label: "tRPC", hint: "shared API package" },
] as const;

export const SHADCN_BASE_CHOICES = [
  { value: "base", label: "Base UI", hint: "default primitives" },
  { value: "radix", label: "Radix UI", hint: "radix-ui primitives" },
  { value: "aria", label: "React Aria", hint: "react-aria-components" },
] as const;

export const SHADCN_STYLES = [
  "nova",
  "vega",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
] as const;

export type ShadcnStyle = (typeof SHADCN_STYLES)[number];

export const DB_ORM_CHOICES = [
  { value: "none", label: "None", hint: "no database package" },
  { value: "drizzle", label: "Drizzle ORM", hint: "SQL ORM" },
  { value: "prisma", label: "Prisma ORM", hint: "SQL ORM" },
] as const;

export const DB_DIALECT_CHOICES = [
  { value: "postgresql", label: "PostgreSQL", hint: "node-postgres" },
  { value: "mysql", label: "MySQL", hint: "mysql2" },
  { value: "sqlite", label: "SQLite", hint: "libsql" },
] as const;

export const PRISMA_DB_DIALECT_CHOICES = [
  { value: "postgresql", label: "PostgreSQL", hint: "provider = postgresql" },
  { value: "mysql", label: "MySQL", hint: "provider = mysql" },
  { value: "sqlite", label: "SQLite", hint: "provider = sqlite" },
] as const;

export const AUTH_CHOICES = [
  { value: "none", label: "None", hint: "no authentication" },
  { value: "better-auth", label: "Better Auth", hint: "self-hosted auth" },
  { value: "clerk", label: "Clerk", hint: "managed auth" },
  { value: "workos", label: "WorkOS", hint: "enterprise auth" },
] as const;

export const PAYMENT_CHOICES = [
  { value: "none", label: "None", hint: "no payments" },
  {
    value: "stripe",
    label: "Stripe",
    hint: "Theo's KV-sync checkout pattern",
  },
  {
    value: "polar",
    label: "Polar",
    hint: "merchant of record",
  },
  {
    value: "autumn",
    label: "Autumn",
    hint: "Stripe entitlements layer",
  },
] as const;

export const VITE_FRAMEWORK_CHOICES = [
  { value: "vanilla", label: "Vanilla", hint: "TypeScript" },
  { value: "vue", label: "Vue", hint: "TypeScript" },
  { value: "react", label: "React", hint: "TypeScript variants" },
  { value: "preact", label: "Preact", hint: "TypeScript" },
  { value: "lit", label: "Lit", hint: "TypeScript" },
  { value: "svelte", label: "Svelte", hint: "TypeScript" },
  { value: "solid", label: "Solid", hint: "TypeScript" },
  { value: "qwik", label: "Qwik", hint: "TypeScript" },
] as const;

export const VITE_REACT_VARIANT_CHOICES = [
  { value: "ts", label: "TypeScript" },
  { value: "react-compiler", label: "TypeScript + React Compiler" },
] as const;

export const TOOLING_CHOICES = [
  { value: "tailwind", label: "Tailwind CSS", hint: "shared Tailwind config" },
  { value: "oxc", label: "Oxc", hint: "lint + format" },
  { value: "prettier", label: "Prettier", hint: "formatter (stub)" },
  { value: "eslint", label: "ESLint", hint: "linter (stub)" },
] as const;

export function isToolingType(
  value: string,
): value is "tailwind" | "oxc" | "prettier" | "eslint" {
  return ["tailwind", "oxc", "prettier", "eslint"].includes(value);
}

export function isAuthProvider(value: string): value is AuthProvider {
  return ["none", "better-auth", "clerk", "workos"].includes(value);
}

export function isDbOrm(value: string): value is DbOrm {
  return ["none", "drizzle", "prisma"].includes(value);
}

export function isDbDialect(value: string): value is DbDialect {
  return ["postgresql", "mysql", "sqlite"].includes(value);
}

export function isPaymentProvider(value: string): value is PaymentProvider {
  return ["none", "stripe", "polar", "autumn"].includes(value);
}

export function resolveDbDialect(dialect: DbDialect | undefined): DbDialect {
  return dialect ?? DEFAULT_DB_DIALECT;
}

export function isViteFramework(value: string): value is ViteFramework {
  return [
    "vanilla",
    "vue",
    "react",
    "preact",
    "lit",
    "svelte",
    "solid",
    "qwik",
  ].includes(value);
}

export function isViteVariant(value: string): value is ViteVariant {
  return ["ts", "react-compiler"].includes(value);
}

export function isShadcnBase(value: string): value is ShadcnBase {
  return SHADCN_BASE_CHOICES.some((choice) => choice.value === value);
}

export function isShadcnStyle(value: string): value is ShadcnStyle {
  return (SHADCN_STYLES as readonly string[]).includes(value);
}

export function isShadcnPreset(value: string): boolean {
  return /^[A-Za-z0-9-]+$/.test(value);
}

export function resolveShadcnStyle(base: ShadcnBase, preset: string): string {
  const style = isShadcnStyle(preset) ? preset : DEFAULT_SHADCN_PRESET;
  return `${base}-${style}`;
}

export function getShadcnOptions(
  config: StackConfig,
): ShadcnOptions | undefined {
  const pkg = config.packages.find((item) => item.type === "shadcn");
  if (!pkg) {
    return undefined;
  }

  return {
    preset: pkg.shadcn?.preset ?? DEFAULT_SHADCN_PRESET,
    base: pkg.shadcn?.base ?? DEFAULT_SHADCN_BASE,
  };
}
