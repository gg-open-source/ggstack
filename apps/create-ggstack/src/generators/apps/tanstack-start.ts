import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";
import { copyTemplate } from "../../utils/templates.js";

export async function generateTanstackStartApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): Promise<void> {
  await copyTemplate(
    "tanstack-start",
    `apps/${app.name}`,
    { projectName: config.projectName, appName: app.name },
    builder,
  );
}

export function isTanstackStartApp(app: AppConfig): boolean {
  return app.type === "tanstack-start";
}
