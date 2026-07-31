import type { AuthProvider, PackageManager } from "./types.js";

export const DEFAULT_PROJECT_NAME = "my-ggstack";
export const DEFAULT_PACKAGE_MANAGER: PackageManager = "pnpm";
export const DEFAULT_AUTH_PROVIDER: AuthProvider = "none";

export const APP_CHOICES = [
  { value: "vite", label: "Vanilla Vite", hint: "custom template" },
  { value: "next", label: "Next.js", hint: "custom template" },
  { value: "expo", label: "Expo Router", hint: "custom template" },
  { value: "electron", label: "Electron + Vite", hint: "custom template" },
] as const;

export const PACKAGE_CHOICES = [
  { value: "shadcn", label: "shadcn/ui", hint: "shared UI package" },
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
