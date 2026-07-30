import type { PackageManager } from "./types.js";

export const DEFAULT_PROJECT_NAME = "my-ggstack";
export const DEFAULT_PACKAGE_MANAGER: PackageManager = "pnpm";

export const APP_CHOICES = [
  { value: "vite", label: "Vanilla Vite", hint: "official create-vite" },
  { value: "next", label: "Next.js", hint: "official create-next-app" },
] as const;

export const PACKAGE_CHOICES = [
  { value: "shadcn", label: "shadcn/ui", hint: "shared UI package" },
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
