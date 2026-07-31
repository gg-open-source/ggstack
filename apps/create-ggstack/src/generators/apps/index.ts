import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";
import { generateElectronApp } from "./electron.js";
import { generateExpoApp } from "./expo.js";
import { generateNextApp } from "./next.js";
import { generateViteApp } from "./vite.js";

export async function generateApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): Promise<void> {
  switch (app.type) {
    case "vite":
      await generateViteApp(config, builder, app);
      break;
    case "next":
      await generateNextApp(config, builder, app);
      break;
    case "expo":
      await generateExpoApp(config, builder, app);
      break;
    case "electron":
      await generateElectronApp(config, builder, app);
      break;
  }
}

export {
  generateElectronApp,
  generateExpoApp,
  generateNextApp,
  generateViteApp,
};
