import type { ProjectBuilder, StackConfig } from "../../types.js";

export function generateTailwindTooling(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;
  const hasShadcn = config.packages.some((pkg) => pkg.type === "shadcn");

  builder.addFile(
    "tooling/tailwind/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/tailwind`,
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
        devDependencies: {
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
    "tooling/tailwind/tsconfig.json",
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

  const colors = hasShadcn
    ? `      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },`
    : `      colors: {},
      borderRadius: {},`;

  builder.addFile(
    "tooling/tailwind/src/index.ts",
    `import type { Config } from "tailwindcss";

export const config: Config = {
  darkMode: ["class"],
  content: [],
  theme: {
    extend: {
${colors}
    },
  },
  plugins: [],
};

export const postcssConfig = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
  );
}
