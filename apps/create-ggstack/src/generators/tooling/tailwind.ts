import path from "node:path";
import type {
  AppConfig,
  PackageJson,
  ProjectBuilder,
  StackConfig,
} from "../../types.js";

const TAILWIND_CSS = "^4.3.3";
const TAILWIND_POSTCSS = "^4.3.3";
const POSTCSS = "^8.5.6";
const LIGHTNINGCSS = "1.30.1";
const NATIVEWIND = "5.0.0-preview.4";
const REACT_NATIVE_CSS = "^3.0.7";
const REACT_NATIVE_REANIMATED = "~4.5.1";
const REACT_NATIVE_WORKLETS = "0.10.1";
const TW_ANIMATE_CSS = "^1.4.0";
const SHADCN = "^4.18.0";

const CSS_APP_TYPES = new Set([
  "vite",
  "next",
  "astro",
  "electron",
  "tanstack-start",
  "react-router",
  "expo",
]);

export function generateTailwindTooling(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;
  const hasShadcn = config.packages.some((pkg) => pkg.type === "shadcn");
  const hasExpo = config.apps.some((app) => app.type === "expo");

  builder.addFile(
    "tooling/tailwind/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/tailwind`,
        version: "0.0.0",
        private: true,
        type: "module",
        exports: {
          ".": "./src/styles.css",
          "./theme": "./src/theme.css",
          "./postcss": "./src/postcss.js",
        },
        scripts: {
          build: ":",
          lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
          format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
          "check-types": ":",
        },
        dependencies: {
          "@tailwindcss/postcss": TAILWIND_POSTCSS,
          postcss: POSTCSS,
          tailwindcss: TAILWIND_CSS,
          ...(hasShadcn
            ? {
                shadcn: SHADCN,
                "tw-animate-css": TW_ANIMATE_CSS,
              }
            : {}),
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "tooling/tailwind/src/postcss.js",
    `import tailwindcss from "@tailwindcss/postcss";

export default {
  plugins: [tailwindcss],
};
`,
  );

  builder.addFile(
    "tooling/tailwind/src/styles.css",
    `@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";
${
  hasShadcn
    ? `@import "tw-animate-css";
@import "shadcn/tailwind.css";
`
    : ""
}
@import "./theme.css";
`,
  );

  builder.addFile(
    "tooling/tailwind/src/theme.css",
    hasShadcn ? SHADCN_THEME_CSS : `/* Shared theme tokens go here. */\n`,
  );

  if (hasExpo) {
    pinLightningcss(builder);
  }

  for (const app of config.apps) {
    if (CSS_APP_TYPES.has(app.type)) {
      applySharedTailwind(config, builder, app, hasShadcn);
    }
  }
}

function pinLightningcss(builder: ProjectBuilder): void {
  const existingPnpm =
    typeof builder.rootPackageJson.pnpm === "object" &&
    builder.rootPackageJson.pnpm !== null
      ? (builder.rootPackageJson.pnpm as Record<string, unknown>)
      : {};

  builder.rootPackageJson.pnpm = {
    ...existingPnpm,
    overrides: {
      lightningcss: LIGHTNINGCSS,
    },
  };
}

function applySharedTailwind(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
  hasShadcn: boolean,
): void {
  const appDir = `apps/${app.name}`;
  addWorkspaceTailwindDep(
    builder,
    `${appDir}/package.json`,
    config.projectName,
  );
  addPostcssConfig(builder, appDir, config.projectName);

  if (app.type === "expo") {
    applyNativewind(config, builder, app, hasShadcn);
    return;
  }

  const cssPath = cssPathForApp(app);
  const preamble = cssPreamble(config.projectName, cssPath, hasShadcn);

  if (app.type === "astro") {
    builder.addFile(cssPath, preamble);
    const pagePath = `${appDir}/src/pages/index.astro`;
    const page = builder.files[pagePath];
    if (page && !page.includes("global.css")) {
      builder.addFile(
        pagePath,
        page.replace("---\n", `---\nimport "../styles/global.css";\n`),
      );
    }
    return;
  }

  const existingCss = builder.files[cssPath] ?? "";
  if (!existingCss.includes(`@import "@${config.projectName}/tailwind"`)) {
    builder.addFile(cssPath, `${preamble}${existingCss}`);
  }

  if (app.type === "next") {
    const layoutPath = `${appDir}/app/layout.tsx`;
    const layout = builder.files[layoutPath];
    if (layout && !layout.includes("globals.css")) {
      builder.addFile(layoutPath, `import "./globals.css";\n${layout}`);
    }
  }
}

function applyNativewind(
  config: StackConfig,
  builder: ProjectBuilder,
  app: AppConfig,
  hasShadcn: boolean,
): void {
  const appDir = `apps/${app.name}`;
  const cssPath = `${appDir}/global.css`;

  builder.addFile(
    cssPath,
    `${cssPreamble(config.projectName, cssPath, hasShadcn)}@import "nativewind/theme";
`,
  );

  builder.addFile(
    `${appDir}/postcss.config.mjs`,
    `export { default } from "@${config.projectName}/tailwind/postcss";
`,
  );

  builder.addFile(
    `${appDir}/metro.config.js`,
    `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config);
`,
  );

  builder.addFile(
    `${appDir}/nativewind-env.d.ts`,
    `/// <reference types="react-native-css/types" />

// NOTE: This file should not be edited and should be committed with your source code. It is generated by react-native-css. If you need to move or disable this file, please see the documentation.
`,
  );

  updateJsonFile<PackageJson>(builder, `${appDir}/package.json`, (pkg) => ({
    ...pkg,
    dependencies: {
      ...pkg.dependencies,
      nativewind: NATIVEWIND,
      "react-native-css": REACT_NATIVE_CSS,
      "react-native-reanimated": REACT_NATIVE_REANIMATED,
      "react-native-worklets": REACT_NATIVE_WORKLETS,
    },
  }));

  const layoutPath = `${appDir}/app/_layout.tsx`;
  const layout = builder.files[layoutPath];
  if (layout && !layout.includes("global.css")) {
    builder.addFile(
      layoutPath,
      layout.replace(
        `import { Stack } from "expo-router";\n`,
        `import { Stack } from "expo-router";\nimport "../global.css";\n`,
      ),
    );
  }

  builder.addFile(
    `${appDir}/app/index.tsx`,
    `import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-2xl font-bold">{${JSON.stringify(app.name)}}</Text>
    </View>
  );
}
`,
  );

  updateJsonFile<{ include?: string[] }>(
    builder,
    `${appDir}/tsconfig.json`,
    (tsconfig) => ({
      ...tsconfig,
      include: Array.from(
        new Set([...(tsconfig.include ?? []), "nativewind-env.d.ts"]),
      ),
    }),
  );
}

function addWorkspaceTailwindDep(
  builder: ProjectBuilder,
  packageJsonPath: string,
  projectName: string,
): void {
  updateJsonFile<PackageJson>(builder, packageJsonPath, (pkg) => ({
    ...pkg,
    devDependencies: {
      ...pkg.devDependencies,
      [`@${projectName}/tailwind`]: "workspace:*",
    },
  }));
}

function addPostcssConfig(
  builder: ProjectBuilder,
  appDir: string,
  projectName: string,
): void {
  builder.addFile(
    `${appDir}/postcss.config.mjs`,
    `export { default } from "@${projectName}/tailwind/postcss";
`,
  );
}

function cssPathForApp(app: AppConfig): string {
  switch (app.type) {
    case "next":
      return `apps/${app.name}/app/globals.css`;
    case "tanstack-start":
      return `apps/${app.name}/src/styles.css`;
    case "react-router":
      return `apps/${app.name}/app/app.css`;
    case "astro":
      return `apps/${app.name}/src/styles/global.css`;
    case "expo":
      return `apps/${app.name}/global.css`;
    default:
      return `apps/${app.name}/src/style.css`;
  }
}

function cssPreamble(
  projectName: string,
  cssPath: string,
  hasShadcn: boolean,
): string {
  const cssDir = path.posix.dirname(cssPath);
  const appRoot = cssPath.startsWith("packages/")
    ? cssDir
    : cssDir.split("/").slice(0, 2).join("/");
  const sourceToApp = path.posix.relative(cssDir, appRoot) || ".";
  const lines = [
    `@import "@${projectName}/tailwind";`,
    `@source "${sourceToApp}";`,
  ];

  if (hasShadcn && !cssPath.startsWith("packages/ui/")) {
    lines.push(`@source "${path.posix.relative(cssDir, "packages/ui/src")}";`);
  }

  return `${lines.join("\n")}\n\n`;
}

function updateJsonFile<T>(
  builder: ProjectBuilder,
  relativePath: string,
  updater: (value: T) => T,
): void {
  const raw = builder.files[relativePath];
  if (!raw) {
    return;
  }

  builder.addFile(
    relativePath,
    `${JSON.stringify(updater(JSON.parse(raw) as T), null, 2)}\n`,
  );
}

const SHADCN_THEME_CSS = `@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;
