import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";
import { copyTemplate } from "../../utils/templates.js";

export async function generateExpressApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): Promise<void> {
  await copyTemplate(
    "express",
    `apps/${app.name}`,
    { projectName: config.projectName, appName: app.name },
    builder,
  );
}

export function isExpressApp(app: AppConfig): boolean {
  return app.type === "express";
}
