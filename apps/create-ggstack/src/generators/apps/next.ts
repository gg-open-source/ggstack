import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";

export function generateNextApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): void {
  const appPath = `apps/${app.name}`;

  builder.addCommand({
    command: config.packageManager,
    args: ["create", "next-app@latest", appPath],
    cwd: config.targetDir,
    description: `Scaffold Next.js app at ${appPath}`,
  });
}

export function isNextApp(app: AppConfig): boolean {
  return app.type === "next";
}
