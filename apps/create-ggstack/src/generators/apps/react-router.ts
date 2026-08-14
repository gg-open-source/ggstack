import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";
import { copyTemplate } from "../../utils/templates.js";

export async function generateReactRouterApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): Promise<void> {
  await copyTemplate(
    "react-router",
    `apps/${app.name}`,
    { projectName: config.projectName, appName: app.name },
    builder,
  );
}

export function isReactRouterApp(app: AppConfig): boolean {
  return app.type === "react-router";
}
