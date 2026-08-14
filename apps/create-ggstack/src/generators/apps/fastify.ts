import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";
import { copyTemplate } from "../../utils/templates.js";

export async function generateFastifyApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): Promise<void> {
  await copyTemplate(
    "fastify",
    `apps/${app.name}`,
    { projectName: config.projectName, appName: app.name },
    builder,
  );
}

export function isFastifyApp(app: AppConfig): boolean {
  return app.type === "fastify";
}
