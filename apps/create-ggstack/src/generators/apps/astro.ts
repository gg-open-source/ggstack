import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";
import { copyTemplate } from "../../utils/templates.js";

export async function generateAstroApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): Promise<void> {
  await copyTemplate(
    "astro",
    `apps/${app.name}`,
    { projectName: config.projectName, appName: app.name },
    builder,
  );
}

export function isAstroApp(app: AppConfig): boolean {
  return app.type === "astro";
}
