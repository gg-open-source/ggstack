import { DEFAULT_VITE_FRAMEWORK, DEFAULT_VITE_VARIANT } from "../../config.js";
import type {
  AppConfig,
  ProjectBuilder,
  StackConfig,
  ViteAppOptions,
  ViteFramework,
} from "../../types.js";
import { copyTemplate } from "../../utils/templates.js";

const VITE_TEMPLATE_BY_FRAMEWORK: Record<ViteFramework, string> = {
  vanilla: "vite",
  vue: "vite-vue",
  react: "vite-react",
  preact: "vite-preact",
  lit: "vite-lit",
  svelte: "vite-svelte",
  solid: "vite-solid",
  qwik: "vite-qwik",
};

export function resolveViteOptions(app: AppConfig): ViteAppOptions {
  return {
    framework: app.vite?.framework ?? DEFAULT_VITE_FRAMEWORK,
    variant: app.vite?.variant ?? DEFAULT_VITE_VARIANT,
  };
}

export async function generateViteApp(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
): Promise<void> {
  const options = resolveViteOptions(app);
  const templateName = VITE_TEMPLATE_BY_FRAMEWORK[options.framework];
  const targetPrefix = `apps/${app.name}`;

  await copyTemplate(
    templateName,
    targetPrefix,
    { projectName: config.projectName, appName: app.name },
    builder,
  );

  if (options.framework === "react" && options.variant === "react-compiler") {
    applyReactCompilerOverlay(builder, targetPrefix);
  }
}

export function isViteApp(app: AppConfig): boolean {
  return app.type === "vite";
}

export function applyReactCompilerOverlay(
  builder: ProjectBuilder,
  targetPrefix: string,
): void {
  const packageJsonPath = `${targetPrefix}/package.json`;
  const rawPackageJson = builder.files[packageJsonPath];
  if (rawPackageJson) {
    const pkg = JSON.parse(rawPackageJson) as {
      devDependencies?: Record<string, string>;
    };
    pkg.devDependencies = {
      ...pkg.devDependencies,
      "@babel/core": "^7.29.7",
      "@rolldown/plugin-babel": "^0.2.3",
      "@types/babel__core": "^7.20.5",
      "babel-plugin-react-compiler": "^1.0.0",
    };
    builder.addFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }

  const viteConfigPath = `${targetPrefix}/vite.config.ts`;
  const viteConfig = builder.files[viteConfigPath];
  if (!viteConfig) {
    return;
  }

  builder.addFile(
    viteConfigPath,
    viteConfig
      .replace(
        `import react from "@vitejs/plugin-react";`,
        `import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";`,
      )
      .replace(
        "plugins: [react()],",
        `plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],`,
      ),
  );
}
