import type { ProjectBuilder, StackConfig } from "../../types.js";

export function generateShadcnPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;

  builder.addFile(
    "packages/ui/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/ui`,
        version: "0.0.0",
        private: true,
        type: "module",
        main: "./src/index.ts",
        types: "./src/index.ts",
        scripts: {
          build: ":",
          lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
          format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
          "check-types": "tsc --noEmit",
        },
        dependencies: {
          clsx: "^2.1.0",
          "tailwind-merge": "^2.5.0",
        },
        devDependencies: {
          [`@${projectName}/tailwind`]: "workspace:*",
          [`@${projectName}/tsconfig`]: "workspace:*",
          tailwindcss: "^3.4.0",
          postcss: "^8.4.0",
          autoprefixer: "^10.4.0",
          typescript: "^5.8.0",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "packages/ui/tsconfig.json",
    JSON.stringify(
      {
        extends: `@${projectName}/tsconfig/base.json`,
        compilerOptions: {
          outDir: "dist",
          rootDir: "src",
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "packages/ui/components.json",
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "default",
        rsc: false,
        tsx: true,
        tailwind: {
          config: "./tailwind.config.ts",
          css: "./src/globals.css",
          baseColor: "neutral",
          cssVariables: true,
        },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "packages/ui/tailwind.config.ts",
    `import type { Config } from "tailwindcss";
import { config as baseConfig } from "@${projectName}/tailwind";

export default {
  ...baseConfig,
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
} satisfies Config;
`,
  );

  builder.addFile(
    "packages/ui/postcss.config.mjs",
    `import { postcssConfig } from "@${projectName}/tailwind";

export default postcssConfig;
`,
  );

  builder.addFile(
    "packages/ui/src/globals.css",
    `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }
}
`,
  );

  builder.addFile(
    "packages/ui/src/index.ts",
    `export {};
`,
  );

  builder.addFile(
    "packages/ui/src/lib/utils.ts",
    `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
  );
}
