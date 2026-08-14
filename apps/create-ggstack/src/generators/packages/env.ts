import { resolveDbDialect } from "../../config.js";
import type { DbDialect, ProjectBuilder, StackConfig } from "../../types.js";

export type ClientPrefix =
  | "NEXT_PUBLIC_"
  | "EXPO_PUBLIC_"
  | "VITE_"
  | "PUBLIC_";

export type EnvVarGroup = "core" | "database" | "auth" | "electron";

export interface EnvVarSpec {
  name: string;
  kind: "server" | "client";
  required: boolean;
  schema: "string" | "url" | "nodeEnv";
  group: EnvVarGroup;
  comment?: string;
}

const SKIP_VALIDATION = `!!process.env.CI ||
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.npm_lifecycle_event === "lint"`;

const PASS_THROUGH_ENV = [
  "NODE_ENV",
  "CI",
  "SKIP_ENV_VALIDATION",
  "npm_lifecycle_event",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
];

export function getClientPrefixes(config: StackConfig): ClientPrefix[] {
  const prefixes: ClientPrefix[] = [];
  if (config.apps.some((app) => app.type === "next")) {
    prefixes.push("NEXT_PUBLIC_");
  }
  if (config.apps.some((app) => app.type === "expo")) {
    prefixes.push("EXPO_PUBLIC_");
  }
  if (
    config.apps.some(
      (app) =>
        app.type === "vite" ||
        app.type === "electron" ||
        app.type === "tanstack-start" ||
        app.type === "react-router",
    )
  ) {
    prefixes.push("VITE_");
  }
  if (config.apps.some((app) => app.type === "astro")) {
    prefixes.push("PUBLIC_");
  }
  return prefixes;
}

export function getEnvVarSpecs(config: StackConfig): EnvVarSpec[] {
  const specs: EnvVarSpec[] = [
    {
      name: "NODE_ENV",
      kind: "server",
      required: false,
      schema: "nodeEnv",
      group: "core",
    },
  ];

  if (config.db.orm !== "none") {
    const dialect = resolveDbDialect(config.db.dialect);
    specs.push({
      name: "DATABASE_URL",
      kind: "server",
      required: true,
      schema: dialect === "sqlite" ? "string" : "url",
      group: "database",
      comment: getDatabaseUrlComment(dialect),
    });
  }

  if (config.auth.provider === "better-auth") {
    specs.push(
      {
        name: "BETTER_AUTH_SECRET",
        kind: "server",
        required: true,
        schema: "string",
        group: "auth",
        comment: "openssl rand -base64 32",
      },
      {
        name: "BETTER_AUTH_URL",
        kind: "server",
        required: true,
        schema: "url",
        group: "auth",
        comment: "http://localhost:3000",
      },
    );
  }

  if (config.auth.provider === "clerk") {
    specs.push({
      name: "CLERK_SECRET_KEY",
      kind: "server",
      required: true,
      schema: "string",
      group: "auth",
    });
    for (const prefix of getClientPrefixes(config)) {
      specs.push({
        name: `${prefix}CLERK_PUBLISHABLE_KEY`,
        kind: "client",
        required: true,
        schema: "string",
        group: "auth",
      });
    }
  }

  if (config.auth.provider === "workos") {
    specs.push(
      {
        name: "WORKOS_API_KEY",
        kind: "server",
        required: true,
        schema: "string",
        group: "auth",
      },
      {
        name: "WORKOS_COOKIE_PASSWORD",
        kind: "server",
        required: true,
        schema: "string",
        group: "auth",
      },
    );
    for (const prefix of getClientPrefixes(config)) {
      specs.push({
        name: `${prefix}WORKOS_CLIENT_ID`,
        kind: "client",
        required: true,
        schema: "string",
        group: "auth",
      });
    }
  }

  if (config.apps.some((app) => app.type === "electron")) {
    specs.push({
      name: "VITE_DEV_SERVER_URL",
      kind: "server",
      required: false,
      schema: "url",
      group: "electron",
      comment: "Injected by Vite during electron dev",
    });
  }

  return specs;
}

export function getEnvVarNames(config: StackConfig): string[] {
  return getEnvVarSpecs(config).map((spec) => spec.name);
}

function getDatabaseUrlComment(dialect: DbDialect): string {
  switch (dialect) {
    case "mysql":
      return "mysql://user:password@localhost:3306/mydb";
    case "sqlite":
      return "file:./packages/db/local.db";
    case "postgresql":
      return "postgresql://user:password@localhost:5432/mydb";
  }
}

export function generateEnvPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;
  const specs = getEnvVarSpecs(config);

  builder.addFile(
    "packages/env/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/env`,
        version: "0.0.0",
        private: true,
        type: "module",
        main: "./src/index.ts",
        types: "./src/index.ts",
        exports: {
          ".": "./src/index.ts",
          "./server": "./src/server.ts",
          "./client": "./src/client.ts",
        },
        scripts: {
          build: ":",
          lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
          format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
          "check-types": "tsc --noEmit",
        },
        dependencies: {
          "@t3-oss/env-core": "^0.13.11",
          zod: "^3.24.0",
        },
        devDependencies: {
          [`@${projectName}/tsconfig`]: "workspace:*",
          "@types/node": "^22.0.0",
          typescript: "^5.8.0",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "packages/env/tsconfig.json",
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

  builder.addFile("packages/env/src/server.ts", generateServerFile(specs));
  builder.addFile(
    "packages/env/src/client.ts",
    generateClientFile(config, specs),
  );
  builder.addFile("packages/env/src/index.ts", generateIndexFile());
  builder.addFile("packages/env/README.md", generateReadme(projectName));
  builder.addFile(".env.example", generateEnvExample(specs));
  patchTurboJson(builder, specs);
}

function zodForSpec(spec: EnvVarSpec): string {
  switch (spec.schema) {
    case "nodeEnv":
      return 'z.enum(["development", "test", "production"]).optional()';
    case "url":
      return spec.required ? "z.string().url()" : "z.string().url().optional()";
    case "string":
      return spec.required
        ? "z.string().min(1)"
        : "z.string().min(1).optional()";
  }
}

function generateServerFile(specs: EnvVarSpec[]): string {
  const serverSpecs = specs.filter((spec) => spec.kind === "server");
  const schemaEntries = serverSpecs
    .map((spec) => `    ${spec.name}: ${zodForSpec(spec)},`)
    .join("\n");

  return `import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
${schemaEntries}
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation:
    ${SKIP_VALIDATION},
});
`;
}

function generateClientFile(config: StackConfig, specs: EnvVarSpec[]): string {
  const prefixes = getClientPrefixes(config);
  const clientSpecs = specs.filter((spec) => spec.kind === "client");
  const authProvider = config.auth.provider;
  const hasAuthClient = authProvider === "clerk" || authProvider === "workos";

  if (prefixes.length === 0 && !hasAuthClient) {
    return `export {};
`;
  }

  const parts: string[] = [];

  if (prefixes.length > 0) {
    parts.push(`import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const skipValidation =
  ${SKIP_VALIDATION};
`);

    for (const prefix of prefixes) {
      const prefixSpecs = clientSpecs.filter((spec) =>
        spec.name.startsWith(prefix),
      );
      const schemaEntries = (indent: string) =>
        prefixSpecs.length === 0
          ? ""
          : prefixSpecs
              .map((spec) => `${indent}${spec.name}: ${zodForSpec(spec)},`)
              .join("\n") + "\n";

      if (prefix === "VITE_") {
        parts.push(`export const createViteEnv = (
  runtimeEnv: Record<string, string | boolean | number | undefined>,
) =>
  createEnv({
    clientPrefix: "VITE_",
    client: {
${schemaEntries("      ")}    },
    runtimeEnv,
    emptyStringAsUndefined: true,
    skipValidation,
  });
`);
      } else {
        const exportName =
          prefix === "NEXT_PUBLIC_"
            ? "nextEnv"
            : prefix === "EXPO_PUBLIC_"
              ? "expoEnv"
              : "astroEnv";
        parts.push(`export const ${exportName} = createEnv({
  clientPrefix: "${prefix}",
  client: {
${schemaEntries("    ")}  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation,
});
`);
      }
    }
  }

  if (authProvider === "clerk" || authProvider === "workos") {
    parts.push(generatePublicAuthConfig(authProvider));
  }

  return parts.join("\n");
}

function generatePublicAuthConfig(provider: "clerk" | "workos"): string {
  if (provider === "clerk") {
    return `export function getPublicAuthConfig() {
  return {
    clerkPublishableKey:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
      process.env.VITE_CLERK_PUBLISHABLE_KEY ??
      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
      process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ??
      "",
  };
}
`;
  }

  return `export function getPublicAuthConfig() {
  return {
    workosClientId:
      process.env.NEXT_PUBLIC_WORKOS_CLIENT_ID ??
      process.env.VITE_WORKOS_CLIENT_ID ??
      process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID ??
      process.env.PUBLIC_WORKOS_CLIENT_ID ??
      "",
  };
}
`;
}

function generateIndexFile(): string {
  return `export { serverEnv } from "./server";
export * from "./client";
`;
}

function generateEnvExample(specs: EnvVarSpec[]): string {
  const lines = [
    "# Copy this file to `.env` and fill in the values.",
    "# Never commit `.env`.",
    "",
    "NODE_ENV=development",
  ];

  const groups: Array<{ group: EnvVarGroup; heading: string }> = [
    { group: "database", heading: "Database" },
    { group: "auth", heading: "Authentication" },
    { group: "electron", heading: "Electron" },
  ];

  for (const { group, heading } of groups) {
    const groupSpecs = specs.filter(
      (spec) => spec.group === group && spec.name !== "NODE_ENV",
    );
    if (groupSpecs.length === 0) {
      continue;
    }

    lines.push("", `# ${heading}`);
    for (const spec of groupSpecs) {
      if (spec.comment) {
        lines.push(`# ${spec.comment}`);
      }
      lines.push(`${spec.name}=`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function patchTurboJson(builder: ProjectBuilder, specs: EnvVarSpec[]): void {
  const raw = builder.files["turbo.json"];
  if (!raw) {
    return;
  }

  const turbo = JSON.parse(raw) as Record<string, unknown>;
  turbo.globalEnv = specs
    .map((spec) => spec.name)
    .filter((name) => name !== "NODE_ENV");
  turbo.globalPassThroughEnv = PASS_THROUGH_ENV;
  builder.addFile("turbo.json", JSON.stringify(turbo, null, 2));
}

function generateReadme(projectName: string): string {
  return `# @${projectName}/env

Typed environment variables via \`@t3-oss/env-core\`.

Copy the repo-root \`.env.example\` to \`.env\` and fill in values. Add new variables to the Zod schema in this package and to \`.env.example\`.

\`\`\`ts
import { serverEnv } from "@${projectName}/env/server";

const url = serverEnv.DATABASE_URL;
\`\`\`
`;
}
