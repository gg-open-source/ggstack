import type { AuthProvider, DbOrm, PackageManager } from "./types.js";

export const DEFAULT_PROJECT_NAME = "project";
export const DEFAULT_PACKAGE_MANAGER: PackageManager = "pnpm";
export const DEFAULT_AUTH_PROVIDER: AuthProvider = "none";
export const DEFAULT_DB_ORM: DbOrm = "none";

export const APP_CHOICES = [
  { value: "vite", label: "Vanilla Vite", hint: "custom template" },
  { value: "next", label: "Next.js", hint: "custom template" },
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
  expo: "expo",
  electron: "electron",
  express: "express",
  fastify: "fastify",
  "tanstack-start": "tanstack-start",
  "react-router": "react-router",
} as const;

export const PACKAGE_CHOICES = [
  { value: "shadcn", label: "shadcn/ui", hint: "shared UI package" },
] as const;

export const DB_ORM_CHOICES = [
  { value: "none", label: "None", hint: "no database package" },
  { value: "drizzle", label: "Drizzle ORM", hint: "PostgreSQL driver" },
  { value: "prisma", label: "Prisma ORM", hint: "PostgreSQL provider" },
] as const;

export const AUTH_CHOICES = [
  { value: "none", label: "None", hint: "no authentication" },
  { value: "better-auth", label: "Better Auth", hint: "self-hosted auth" },
  { value: "clerk", label: "Clerk", hint: "managed auth" },
  { value: "workos", label: "WorkOS", hint: "enterprise auth" },
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
