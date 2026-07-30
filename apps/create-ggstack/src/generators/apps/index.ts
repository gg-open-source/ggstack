import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";
import { generateNextApp } from "./next.js";
import { generateViteApp } from "./vite.js";

export function generateApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): void {
  if (app.type === "vite") {
    generateViteApp(config, builder, app);
  } else if (app.type === "next") {
    generateNextApp(config, builder, app);
  }
}

export { generateNextApp, generateViteApp };
