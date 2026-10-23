import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ModuleKind, transpileModule } from "typescript";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildProjectAdditions } from "./add.js";
import { APP_CHOICES, VITE_FRAMEWORK_CHOICES } from "./config.js";
import { getEnvVarNames } from "./generators/packages/env.js";
import { buildProject } from "./runner.js";
import {
  ProjectBuilder,
  type AppConfig,
  type PackageJson,
  type StackConfig,
} from "./types.js";
import { writeProjectFiles } from "./utils/files.js";

const require = createRequire(import.meta.url);
const dotenvCli = require.resolve("dotenv-cli/cli.js");
const apps: AppConfig[] = [
  ...APP_CHOICES.filter(({ value }) => value !== "vite").map(
    ({ value: type }) => ({
      type,
      name: type === "next" ? "web" : type === "fastify" ? "api" : type,
    }),
  ),
  ...VITE_FRAMEWORK_CHOICES.map(({ value: framework }) => ({
    type: "vite" as const,
    name: `vite-${framework}`,
    vite: { framework, variant: "ts" as const },
  })),
  {
    type: "vite",
    name: "vite-react-compiler",
    vite: { framework: "react", variant: "react-compiler" },
  },
];
const values = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  STRIPE_PRICE_ID: "price_fixture",
  UPSTASH_REDIS_REST_URL: "https://redis.example.test",
  UPSTASH_REDIS_REST_TOKEN: "redis-test-token",
  RESEND_API_KEY: "re_test_fixture",
  EMAIL_FROM: "GGStack <test@example.test>",
  CLERK_SECRET_KEY: "sk_test_fixture",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_next",
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_expo",
  PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_astro",
  VITE_CLERK_PUBLISHABLE_KEY: "pk_test_vite",
};

describe("generated environment loading", () => {
  let targetDir: string;
  let builder: ProjectBuilder;
  let environment: NodeJS.ProcessEnv;
  let config: StackConfig;

  beforeEach(async () => {
    targetDir = await mkdtemp(path.join(os.tmpdir(), "ggstack-env-test-"));
    config = {
      projectName: "env-fixture",
      targetDir,
      packageManager: "pnpm",
      apps,
      packages: [{ type: "db" }],
      db: { orm: "drizzle" },
      auth: { provider: "better-auth" },
      payments: { provider: "stripe" },
      email: { provider: "resend" },
      tooling: [],
    };
    builder = new ProjectBuilder();
    await buildProject(config, builder);
    environment = { ...process.env };
    for (const name of [
      ...getEnvVarNames(config),
      ...Object.keys(values),
      "CI",
      "SKIP_ENV_VALIDATION",
      "npm_lifecycle_event",
    ]) {
      delete environment[name];
    }

    // Run the generated schema with the real env-core and Zod installations.
    const server = builder.files["packages/env/src/server.ts"]!.replace(
      '"@t3-oss/env-core"',
      JSON.stringify(pathToFileURL(require.resolve("@t3-oss/env-core")).href),
    ).replace(
      '"zod"',
      JSON.stringify(pathToFileURL(require.resolve("zod")).href),
    );
    await writeFile(
      path.join(targetDir, "validate.mjs"),
      `${server}\nconsole.log(JSON.stringify({ price: serverEnv.STRIPE_PRICE_ID, from: serverEnv.EMAIL_FROM }));\n`,
    );
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  async function writeEnv(overrides: Partial<typeof values> = {}) {
    await writeFile(
      path.join(targetDir, ".env"),
      Object.entries({ ...values, ...overrides })
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
        .join("\n"),
    );
  }

  async function validate(
    relativeDir: string,
    scriptName: string,
    stage = 0,
    probeFile = "validate.mjs",
  ) {
    const cwd = path.join(targetDir, relativeDir);
    await mkdir(cwd, { recursive: true });
    const pkg = JSON.parse(
      builder.files[`${relativeDir}/package.json`]!,
    ) as PackageJson;
    const command = pkg.scripts![scriptName]!.split(" && ")[stage]!;
    const args = command.split(" ").slice(1);
    // Replace the framework process with a schema probe, keeping its env loader.
    return spawnSync(
      process.execPath,
      [
        dotenvCli,
        ...args.slice(0, args.indexOf("--") + 1),
        process.execPath,
        path.join(targetDir, probeFile),
      ],
      { cwd, env: environment, encoding: "utf-8" },
    );
  }

  it.each(apps.map(({ name }) => name))(
    "loads the root .env for every runtime command in %s",
    async (name) => {
      await writeEnv();
      const dir = `apps/${name}`;
      const pkg = JSON.parse(
        builder.files[`${dir}/package.json`]!,
      ) as PackageJson;
      expect(pkg.dependencies?.["dotenv-cli"]).toBeDefined();

      for (const [script, command] of Object.entries(pkg.scripts!)) {
        if (script === "lint" || script === "format") continue;
        // Probe every process, including later stages of chained build scripts.
        for (const stage of command.split(" && ").keys()) {
          const result = await validate(dir, script, stage);
          expect(result.stderr, `${name} ${script} stage ${stage}`).toBe("");
          expect(result.status).toBe(0);
          expect(JSON.parse(result.stdout)).toEqual({
            price: values.STRIPE_PRICE_ID,
            from: values.EMAIL_FROM,
          });
        }
      }
    },
  );

  it.each([
    ["packages/db", "db:migrate"],
    ["packages/email", "email:dev"],
  ])("loads the root .env before %s %s validates", async (dir, script) => {
    await writeEnv();
    const result = await validate(dir, script);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      price: values.STRIPE_PRICE_ID,
      from: values.EMAIL_FROM,
    });
  });

  async function prepareViteProbe(appName: string) {
    const publicEnvBuilder = new ProjectBuilder();
    await buildProject(
      { ...config, auth: { provider: "clerk" } },
      publicEnvBuilder,
    );
    const client = publicEnvBuilder.files[
      "packages/env/src/client.ts"
    ]!.replace(
      '"@t3-oss/env-core"',
      JSON.stringify(pathToFileURL(require.resolve("@t3-oss/env-core")).href),
    ).replace(
      '"zod"',
      JSON.stringify(pathToFileURL(require.resolve("zod")).href),
    );
    await writeFile(
      path.join(targetDir, "client.mjs"),
      transpileModule(client, {
        compilerOptions: { module: ModuleKind.ESNext },
      }).outputText,
    );

    const viteConfig =
      publicEnvBuilder.files[`apps/${appName}/vite.config.ts`]!;
    const validation = viteConfig.match(/^createViteEnv\(.+\);$/m)?.[0];
    expect(validation).toBeDefined();
    // Execute the config's validation in Node, before any browser env exists.
    await writeFile(
      path.join(targetDir, "validate-client.mjs"),
      `import { createViteEnv } from "./client.mjs";\n${validation}\nconsole.log("validated");\n`,
    );
  }

  it.each(
    apps
      .filter(
        (app) =>
          app.type === "vite" ||
          ["electron", "tanstack-start", "react-router"].includes(app.type),
      )
      .map(({ name }) => name),
  )("loads public variables before %s config validates", async (name) => {
    await prepareViteProbe(name);
    await writeEnv();
    const result = await validate(
      `apps/${name}`,
      "dev",
      0,
      "validate-client.mjs",
    );
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("validated");
  });

  it("rejects missing public variables during Vite config validation", async () => {
    await prepareViteProbe("vite-vanilla");
    await writeEnv({ VITE_CLERK_PUBLISHABLE_KEY: "" });
    const result = await validate(
      "apps/vite-vanilla",
      "dev",
      0,
      "validate-client.mjs",
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("VITE_CLERK_PUBLISHABLE_KEY");
  });

  it("loads the root .env for apps added to an existing workspace", async () => {
    const initial = new ProjectBuilder();
    await buildProject({ ...config, apps: [] }, initial);
    await writeProjectFiles(targetDir, initial);
    const additions = {
      ...config,
      packages: [],
      db: { orm: "none" as const },
      auth: { provider: "none" as const },
      payments: { provider: "none" as const },
      email: { provider: "none" as const },
    };
    builder = new ProjectBuilder();
    builder.setRootPackageJson(initial.rootPackageJson);
    await buildProjectAdditions(additions, config, builder);
    await writeEnv();

    for (const app of apps) {
      const result = await validate(
        `apps/${app.name}`,
        app.type === "expo" ? "start" : "dev",
      );
      expect(result.stderr, app.name).toBe("");
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).price).toBe(values.STRIPE_PRICE_ID);
    }
  });

  it("preserves values supplied by the shell or deployment environment", async () => {
    await writeEnv();
    environment.STRIPE_PRICE_ID = "price_from_shell";
    const result = await validate("apps/web", "dev");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).price).toBe("price_from_shell");
  });

  it("supports deployments without an env file", async () => {
    Object.assign(environment, values);
    const result = await validate("apps/api", "start");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("still rejects an empty required setting", async () => {
    await writeEnv({ UPSTASH_REDIS_REST_TOKEN: "" });
    const result = await validate("apps/api", "dev");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("UPSTASH_REDIS_REST_TOKEN");
  });

  it("still rejects missing settings without an env file", async () => {
    const result = await validate("apps/web", "dev");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("STRIPE_SECRET_KEY");
  });
});
