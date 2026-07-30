import type { ProjectBuilder, StackConfig } from "./types.js";
import { generateApp } from "./generators/apps/index.js";
import { generatePackage } from "./generators/packages/index.js";
import { generateRoot } from "./generators/root.js";
import { generateTooling } from "./generators/tooling/index.js";
import { generateTsconfigTooling } from "./generators/tooling/tsconfig.js";

export function buildProject(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  generateRoot(config, builder);
  generateTsconfigTooling(config, builder);

  for (const app of config.apps) {
    generateApp(config, builder, app);
  }

  for (const pkg of config.packages) {
    generatePackage(config, builder, pkg);
  }

  for (const tooling of config.tooling) {
    generateTooling(config, builder, tooling);
  }
}

export function hasTooling(config: StackConfig, type: string): boolean {
  return config.tooling.some((tooling) => tooling.type === type);
}

export function hasPackage(config: StackConfig, type: string): boolean {
  return config.packages.some((pkg) => pkg.type === type);
}

export function hasApp(config: StackConfig, type: string): boolean {
  return config.apps.some((app) => app.type === type);
}
