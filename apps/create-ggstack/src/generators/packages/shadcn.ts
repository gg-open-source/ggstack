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
          "tailwind-merge": "^3.6.0",
        },
        devDependencies: {
          [`@${projectName}/tailwind`]: "workspace:*",
          [`@${projectName}/tsconfig`]: "workspace:*",
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
          config: "",
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
    "packages/ui/postcss.config.mjs",
    `export { default } from "@${projectName}/tailwind/postcss";
`,
  );

  builder.addFile(
    "packages/ui/src/globals.css",
    `@import "@${projectName}/tailwind";
@source ".";
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
