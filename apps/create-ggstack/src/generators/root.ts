import type { AppConfig, ProjectBuilder, StackConfig } from "../types.js";
import { generateGitignore } from "./gitignore.js";

export function generateRoot(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  builder.setRootPackageJson({
    name: config.projectName,
    private: true,
    type: "module",
    scripts: {
      build: "turbo run build",
      dev: "turbo run dev",
      lint: "turbo run lint",
      format: "turbo run format",
      "check-types": "turbo run check-types",
      test: "turbo run test",
    },
    devDependencies: {
      turbo: "^2.6.0",
      typescript: "^5.8.0",
    },
    ...(config.packageManager === "pnpm"
      ? { packageManager: "pnpm@11.2.2" }
      : {}),
    engines: {
      node: ">=22",
    },
  });

  builder.addFile(
    "pnpm-workspace.yaml",
    `packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
`,
  );

  builder.addFile(
    "turbo.json",
    JSON.stringify(
      {
        $schema: "https://turbo.build/schema.json",
        tasks: {
          build: {
            dependsOn: ["^build"],
            outputs: [
              "dist/**",
              ".next/**",
              "!.next/cache/**",
              "web-build/**",
              "out/**",
              "release/**",
              ".output/**",
              "build/**",
            ],
          },
          lint: {},
          format: {},
          dev: {
            cache: false,
            persistent: true,
          },
          "check-types": {
            dependsOn: ["^build"],
          },
          test: {},
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(".gitignore", generateGitignore(config));

  builder.addFile(
    ".npmrc",
    `engine-strict=true
`,
  );

  builder.addFile("README.md", generateRootReadme(config));
}

const APP_LABELS: Record<string, string> = {
  next: "Next.js",
  astro: "Astro",
  expo: "Expo Router",
  electron: "Electron + Vite",
  express: "Express",
  fastify: "Fastify",
  "tanstack-start": "TanStack Start",
  "react-router": "React Router",
};

const VITE_FRAMEWORK_LABELS: Record<string, string> = {
  vanilla: "Vanilla",
  vue: "Vue",
  react: "React",
  preact: "Preact",
  lit: "Lit",
  svelte: "Svelte",
  solid: "Solid",
  qwik: "Qwik",
};

export function getAppLabel(app: AppConfig): string {
  if (app.type !== "vite") {
    return APP_LABELS[app.type] ?? app.type;
  }

  const framework = app.vite?.framework ?? "vanilla";
  const variant = app.vite?.variant ?? "ts";
  if (framework === "react" && variant === "react-compiler") {
    return "Vite (React + Compiler)";
  }

  const frameworkLabel = VITE_FRAMEWORK_LABELS[framework] ?? framework;
  return `Vite (${frameworkLabel})`;
}

const AUTH_LABELS: Record<string, string> = {
  "better-auth": "Better Auth",
  clerk: "Clerk",
  workos: "WorkOS",
};

const ORM_LABELS: Record<string, string> = {
  drizzle: "Drizzle ORM",
  prisma: "Prisma",
};

const DIALECT_LABELS: Record<string, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
};

const TOOLING_LABELS: Record<string, string> = {
  tailwind: "Tailwind CSS",
  oxc: "Oxc (lint + format)",
  prettier: "Prettier (stub — wire it up yourself)",
  eslint: "ESLint (stub — wire it up yourself)",
};

function joinNatural(items: string[], conjunction: "and" | "or"): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} ${conjunction} ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1] ?? ""}`;
}

export function generateRootReadme(config: StackConfig): string {
  const name = config.projectName;
  const hasApps = config.apps.length > 0;
  const hasExpo = config.apps.some((app) => app.type === "expo");
  const hasDevApps = config.apps.some((app) => app.type !== "expo");
  const hasShadcn = config.packages.some((pkg) => pkg.type === "shadcn");
  const hasTrpc = config.packages.some((pkg) => pkg.type === "trpc");
  const hasAuth = config.auth.provider !== "none";
  const hasDb = config.db.orm !== "none";

  const lines: string[] = [
    `# ${name}`,
    "",
    "Monorepo scaffolded with [create-ggstack](https://github.com/gg-open-source/ggstack).",
    "",
    "## Setup",
    "",
    "```bash",
    "cp .env.example .env",
    "pnpm install",
  ];

  if (hasDevApps) {
    lines.push("pnpm dev");
  }

  lines.push("```", "");
  lines.push(
    "The generated workspace uses **pnpm** even if you passed `--npm`, `--yarn`, or `--bun` to the CLI.",
    "",
    `Fill in \`.env\` before running anything that imports \`@${name}/env\`. Required values cannot be empty.`,
  );

  if (hasExpo) {
    const expoApps = config.apps.filter((app) => app.type === "expo");
    lines.push(
      "",
      "Expo apps do not define a `dev` script, so they are not started by `pnpm dev`. From the repo root:",
      "",
    );
    for (const app of expoApps) {
      lines.push("```bash", `pnpm --filter @${name}/${app.name} start`, "```");
    }
  }

  lines.push(
    "",
    "## Scripts",
    "",
    "| Script | Description |",
    "| --- | --- |",
    "| `pnpm dev` | Turbo `dev` for apps that define it (Vite, Next.js, Astro, Electron, Express, Fastify, TanStack Start, React Router) |",
    "| `pnpm build` | Turbo `build` |",
    "| `pnpm lint` | Lint |",
    "| `pnpm format` | Format |",
    "| `pnpm check-types` | Typecheck |",
    "| `pnpm test` | Test |",
  );

  if (hasApps) {
    lines.push("", "## Apps", "");
    for (const app of config.apps) {
      const label = getAppLabel(app);
      lines.push(
        `- \`apps/${app.name}\` — ${label} (\`@${name}/${app.name}\`)`,
      );
    }
  }

  lines.push("", "## Packages", "");
  lines.push(
    `- \`packages/env\` — typed environment variables (\`@${name}/env\`). See that package's README.`,
  );

  if (hasShadcn) {
    lines.push(
      `- \`packages/ui\` — shadcn/ui starter (\`@${name}/ui\`). \`cn()\` and CSS variables are included; add components yourself.`,
    );
  }

  if (hasTrpc) {
    lines.push(
      `- \`packages/api\` — tRPC router and client (\`@${name}/api\`). See that package's README.`,
    );
  }

  if (hasAuth) {
    const label = AUTH_LABELS[config.auth.provider] ?? config.auth.provider;
    lines.push(
      `- \`packages/auth\` — ${label} (\`@${name}/auth\`). See that package's README.`,
    );
  }

  if (hasDb) {
    const label = ORM_LABELS[config.db.orm] ?? config.db.orm;
    const dialect =
      config.db.orm === "drizzle"
        ? (DIALECT_LABELS[config.db.dialect ?? "postgresql"] ?? "PostgreSQL")
        : "PostgreSQL";
    lines.push(
      `- \`packages/db\` — ${label} + ${dialect} (\`@${name}/db\`). See that package's README.`,
    );
  }

  if (hasAuth || hasDb || hasTrpc) {
    const subjects = [
      hasAuth ? "Auth" : null,
      hasDb ? "database" : null,
      hasTrpc ? "API" : null,
    ].filter((value): value is string => value !== null);
    const heading =
      subjects.length === 1
        ? `${subjects[0]} is not mounted automatically`
        : `${joinNatural(subjects, "and")} are not mounted automatically`;
    const actions = [
      hasAuth ? "wrap `AuthProvider`" : null,
      hasDb ? `import \`@${name}/db\`` : null,
      hasTrpc ? `mount \`@${name}/api\`` : null,
    ].filter((value): value is string => value !== null);

    lines.push(
      "",
      `## ${heading}`,
      "",
      `App templates do not ${joinNatural(actions, "or")}. Import those packages in your apps after scaffold.`,
    );
  }

  if (config.tooling.length > 0) {
    lines.push("", "## Tooling", "");
    for (const tool of config.tooling) {
      const label = TOOLING_LABELS[tool.type] ?? tool.type;
      lines.push(`- ${label}`);
    }
  }

  lines.push(
    "",
    `\`tooling/tsconfig\` is always present. Shared TypeScript packages extend \`@${name}/tsconfig/base.json\`.`,
    "",
  );

  return `${lines.join("\n")}\n`;
}
