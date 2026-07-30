import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";

export function generateViteApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): void {
  const appPath = `apps/${app.name}`;

  builder.addCommand({
    command: config.packageManager,
    args: ["create", "vite@latest", appPath, "--", "--template", "vanilla-ts"],
    cwd: config.targetDir,
    description: `Scaffold Vanilla Vite app at ${appPath}`,
  });
}

export function isViteApp(app: AppConfig): boolean {
  return app.type === "vite";
}
