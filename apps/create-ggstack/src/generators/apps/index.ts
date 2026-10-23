import type { AppConfig, ProjectBuilder, StackConfig } from "../../types.js";
import { loadRootEnvForScripts } from "../../utils/env.js";
import { generateAstroApp } from "./astro.js";
import { generateElectronApp } from "./electron.js";
import { generateExpoApp } from "./expo.js";
import { generateExpressApp } from "./express.js";
import { generateFastifyApp } from "./fastify.js";
import { generateNextApp } from "./next.js";
import { generateReactRouterApp } from "./react-router.js";
import { generateTanstackStartApp } from "./tanstack-start.js";
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
    case "astro":
      await generateAstroApp(config, builder, app);
      break;
    case "expo":
      await generateExpoApp(config, builder, app);
      break;
    case "electron":
      await generateElectronApp(config, builder, app);
      break;
    case "express":
      await generateExpressApp(config, builder, app);
      break;
    case "fastify":
      await generateFastifyApp(config, builder, app);
      break;
    case "tanstack-start":
      await generateTanstackStartApp(config, builder, app);
      break;
    case "react-router":
      await generateReactRouterApp(config, builder, app);
      break;
  }

  loadRootEnvForScripts(builder, `apps/${app.name}/package.json`);
}

export {
  generateAstroApp,
  generateElectronApp,
  generateExpoApp,
  generateExpressApp,
  generateFastifyApp,
  generateNextApp,
  generateReactRouterApp,
  generateTanstackStartApp,
  generateViteApp,
};
