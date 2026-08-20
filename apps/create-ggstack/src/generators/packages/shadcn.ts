import path from "node:path";
import {
  DEFAULT_SHADCN_BASE,
  DEFAULT_SHADCN_PRESET,
  getShadcnOptions,
  isShadcnStyle,
  resolveShadcnStyle,
} from "../../config.js";
import type {
  PackageManager,
  ProjectBuilder,
  ProjectCommand,
  ShadcnOptions,
  StackConfig,
} from "../../types.js";

const SHADCN = "^4.18.0";
const CLASS_VARIANCE_AUTHORITY = "^0.7.1";
const CLSX = "^2.1.1";
const TAILWIND_MERGE = "^3.6.0";
const LUCIDE_REACT = "^1.33.0";

export function generateShadcnPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;
  const options = getShadcnOptions(config) ?? {
    preset: DEFAULT_SHADCN_PRESET,
    base: DEFAULT_SHADCN_BASE,
  };
  const style = resolveShadcnStyle(options.base, options.preset);
  const packageName = `@${projectName}/ui`;

  builder.addFile(
    "packages/ui/package.json",
    JSON.stringify(
      {
        name: packageName,
        version: "0.0.0",
        private: true,
        type: "module",
        main: "./src/index.ts",
        types: "./src/index.ts",
        exports: {
          ".": "./src/index.ts",
          "./globals.css": "./src/globals.css",
          "./lib/*": "./src/lib/*.ts",
          "./components/*": "./src/components/*.tsx",
          "./hooks/*": "./src/hooks/*.ts",
        },
        scripts: {
          build: ":",
          lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
          format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
          "check-types": "tsc --noEmit",
          add: "shadcn add",
          apply: "shadcn apply",
        },
        dependencies: {
          "class-variance-authority": CLASS_VARIANCE_AUTHORITY,
          clsx: CLSX,
          "lucide-react": LUCIDE_REACT,
          shadcn: SHADCN,
          "tailwind-merge": TAILWIND_MERGE,
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
          jsx: "react-jsx",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          paths: {
            "@/*": ["./src/*"],
          },
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
        style,
        rsc: false,
        tsx: true,
        tailwind: {
          config: "",
          css: "../../tooling/tailwind/src/theme.css",
          baseColor: "neutral",
          cssVariables: true,
        },
        iconLibrary: "lucide",
        menuColor: "default",
        menuAccent: "subtle",
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components",
          lib: "@/lib",
          hooks: "@/hooks",
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
    `export { cn } from "./lib/utils";
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

  builder.addFile(
    "packages/ui/README.md",
    generateShadcnReadme(config, options, style),
  );

  if (!isShadcnStyle(options.preset)) {
    builder.addCommand(
      shadcnCliCommand(
        config.packageManager,
        ["apply", "--preset", options.preset, "--yes"],
        path.join(config.targetDir, "packages/ui"),
      ),
    );
  }
}

function generateShadcnReadme(
  config: StackConfig,
  options: ShadcnOptions,
  style: string,
): string {
  const name = config.projectName;
  const filter = `pnpm --filter @${name}/ui`;

  return `# @${name}/ui

shadcn/ui workspace package. Style \`${style}\`, preset \`${options.preset}\`, base \`${options.base}\`.

Theme tokens live in \`tooling/tailwind/src/theme.css\`. This package is configured for the latest shadcn CLI (\`shadcn@^4.18.0\`).

## Add a component

From the repo root:

\`\`\`bash
${filter} add button
\`\`\`

Or:

\`\`\`bash
pnpm dlx shadcn@latest add button -c packages/ui
\`\`\`

Then export it from \`src/index.ts\`.

## Presets

Build or copy a preset at [ui.shadcn.com/create](https://ui.shadcn.com/create). Named styles: nova (default), vega, maia, lyra, mira, luma, sera, rhea.

Apply a preset (theme, fonts, radius, icon library):

\`\`\`bash
${filter} apply --preset <code>
\`\`\`

Apply only the theme, or theme and fonts:

\`\`\`bash
pnpm dlx shadcn@latest apply --preset <code> --only theme -c packages/ui
pnpm dlx shadcn@latest apply --preset <code> --only theme,font -c packages/ui
\`\`\`
`;
}

export function shadcnCliCommand(
  packageManager: PackageManager,
  args: string[],
  cwd: string,
): ProjectCommand {
  const description = "Apply shadcn/ui preset";

  switch (packageManager) {
    case "npm":
      return {
        command: "npx",
        args: ["-y", "shadcn@latest", ...args],
        cwd,
        description,
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["dlx", "shadcn@latest", ...args],
        cwd,
        description,
      };
    case "bun":
      return {
        command: "bunx",
        args: ["shadcn@latest", ...args],
        cwd,
        description,
      };
    default:
      return {
        command: "pnpm",
        args: ["dlx", "shadcn@latest", ...args],
        cwd,
        description,
      };
  }
}
