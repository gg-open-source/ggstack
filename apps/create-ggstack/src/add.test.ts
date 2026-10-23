import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  buildProjectAdditions,
  findAdditionCollisions,
  mergeStackConfig,
} from "./add.js";
import { inspectExistingProject } from "./existing.js";
import { buildProject } from "./runner.js";
import { ProjectBuilder, type StackConfig } from "./types.js";
import { writeProjectFiles } from "./utils/files.js";

const tempDirs: string[] = [];

function config(
  targetDir: string,
  overrides: Partial<StackConfig> = {},
): StackConfig {
  return {
    projectName: "fixture",
    targetDir,
    packageManager: "pnpm",
    apps: [],
    packages: [],
    auth: { provider: "none" },
    db: { orm: "none" },
    payments: { provider: "none" },
    email: { provider: "none" },
    tooling: [],
    ...overrides,
  };
}

async function createFixture(overrides: Partial<StackConfig> = {}): Promise<{
  targetDir: string;
  existing: ReturnType<typeof inspectExistingProject>;
}> {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "ggstack-add-test-"));
  tempDirs.push(targetDir);
  const initial = config(targetDir, overrides);
  const builder = new ProjectBuilder();
  await buildProject(initial, builder);
  await writeProjectFiles(targetDir, builder);
  return { targetDir, existing: inspectExistingProject(targetDir) };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true })),
  );
});

describe("adding to an existing project", () => {
  it("discovers the existing ggstack selection", async () => {
    const { existing } = await createFixture({
      apps: [
        {
          type: "vite",
          name: "web",
          vite: { framework: "react", variant: "react-compiler" },
        },
      ],
      packages: [{ type: "trpc" }, { type: "db" }],
      db: { orm: "drizzle", dialect: "mysql" },
      auth: { provider: "clerk" },
      tooling: [{ type: "oxc" }],
    });

    expect(existing.config.apps).toContainEqual({
      type: "vite",
      name: "web",
      vite: { framework: "react", variant: "react-compiler" },
    });
    expect(existing.config.packages).toEqual(
      expect.arrayContaining([{ type: "trpc" }, { type: "db" }]),
    );
    expect(existing.config.db).toEqual({ orm: "drizzle", dialect: "mysql" });
    expect(existing.config.auth.provider).toBe("clerk");
    expect(existing.config.tooling).toContainEqual({ type: "oxc" });
  });

  it("builds only additions and merges environment schemas", async () => {
    const { targetDir, existing } = await createFixture();
    const additions = config(targetDir, {
      apps: [
        {
          type: "vite",
          name: "dashboard",
          vite: { framework: "react", variant: "ts" },
        },
      ],
      auth: { provider: "clerk" },
      email: { provider: "resend" },
      tooling: [{ type: "oxc" }],
    });
    const effective = mergeStackConfig(existing.config, additions);
    const builder = new ProjectBuilder();
    builder.setRootPackageJson(existing.packageJson);

    await buildProjectAdditions(additions, effective, builder);

    expect(builder.files["apps/dashboard/package.json"]).toContain(
      "@apps/dashboard",
    );
    expect(builder.files["packages/auth/package.json"]).toContain(
      "@clerk/clerk-react",
    );
    expect(builder.files["packages/email/package.json"]).toContain("resend");
    expect(builder.files["tooling/oxc/package.json"]).toBeDefined();
    expect(builder.files["README.md"]).toBeUndefined();
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "RESEND_API_KEY: z.string().min(1)",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1)",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "export const createViteEnv",
    );
    expect(builder.files[".env.example"]).toContain("EMAIL_FROM=");
    expect(builder.files["turbo.json"]).toContain("RESEND_API_KEY");
    expect(builder.rootPackageJson.devDependencies).toMatchObject({
      oxlint: "^0.9.0",
      oxfmt: "^0.9.0",
    });
  });

  it("reports existing component directories as collisions", async () => {
    const { targetDir } = await createFixture({
      apps: [{ type: "next", name: "web" }],
      email: { provider: "resend" },
    });
    const additions = config(targetDir, {
      apps: [{ type: "next", name: "web" }],
      email: { provider: "resend" },
    });

    expect(findAdditionCollisions(additions)).toEqual([
      "apps/web",
      "packages/email",
    ]);
  });

  it("does not schedule environment rewrites when an addition needs no env changes", async () => {
    const { targetDir, existing } = await createFixture();
    const additions = config(targetDir, {
      tooling: [{ type: "oxc" }],
    });
    const builder = new ProjectBuilder();
    builder.setRootPackageJson(structuredClone(existing.packageJson));

    await buildProjectAdditions(
      additions,
      mergeStackConfig(existing.config, additions),
      builder,
    );

    expect(builder.files["packages/env/src/server.ts"]).toBeUndefined();
    expect(builder.files["packages/env/src/client.ts"]).toBeUndefined();
    expect(builder.files[".env.example"]).toBeUndefined();
    expect(builder.files["turbo.json"]).toBeUndefined();
  });

  it("adds the root env file to existing Turbo cache inputs without removing custom inputs", async () => {
    const { targetDir, existing } = await createFixture();
    await writeFile(
      path.join(targetDir, "turbo.json"),
      JSON.stringify({
        globalDependencies: ["tsconfig.json"],
        globalEnv: ["CUSTOM_SETTING"],
        tasks: { dev: { cache: false, persistent: true } },
      }),
    );
    const additions = config(targetDir, { tooling: [{ type: "oxc" }] });
    const builder = new ProjectBuilder();
    builder.setRootPackageJson(existing.packageJson);

    await buildProjectAdditions(
      additions,
      mergeStackConfig(existing.config, additions),
      builder,
    );

    expect(JSON.parse(builder.files["turbo.json"]!)).toEqual({
      globalDependencies: ["tsconfig.json", ".env"],
      globalEnv: ["CUSTOM_SETTING"],
      tasks: { dev: { cache: false, persistent: true } },
    });
  });

  it("preserves workspace settings and migrates legacy overrides when adding Expo to Tailwind", async () => {
    const { targetDir, existing } = await createFixture({
      tooling: [{ type: "tailwind" }],
    });
    const additions = config(targetDir, {
      apps: [{ type: "expo", name: "mobile" }],
    });
    const builder = new ProjectBuilder();
    builder.setRootPackageJson({
      ...existing.packageJson,
      pnpm: {
        overrides: { "some-package": "1.2.3", "workspace-wins": "1.0.0" },
      },
    });
    await writeFile(
      path.join(targetDir, "pnpm-workspace.yaml"),
      `# Keep workspace settings
packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
  - "custom/*"
catalog:
  typescript: ^5.8.0
overrides:
  workspace-wins: 2.0.0
  lightningcss: 1.29.0
`,
    );

    await buildProjectAdditions(
      additions,
      mergeStackConfig(existing.config, additions),
      builder,
    );

    expect(builder.rootPackageJson.pnpm).toBeUndefined();
    const workspace = builder.files["pnpm-workspace.yaml"] ?? "";
    expect(workspace).toContain("# Keep workspace settings");
    expect(parse(workspace)).toEqual({
      packages: ["apps/*", "packages/*", "tooling/*", "custom/*"],
      catalog: { typescript: "^5.8.0" },
      overrides: {
        "some-package": "1.2.3",
        "workspace-wins": "2.0.0",
        lightningcss: "1.30.1",
      },
    });
    expect(builder.files["apps/mobile/global.css"]).toContain(
      '@import "@tooling/tailwind"',
    );
    expect(builder.files["tooling/tailwind/package.json"]).toBeUndefined();
  });

  it("declares added Prettier and ESLint dependencies without installation commands", async () => {
    const { targetDir, existing } = await createFixture({
      tooling: [{ type: "oxc" }],
    });
    const additions = config(targetDir, {
      tooling: [{ type: "prettier" }, { type: "eslint" }],
    });
    const builder = new ProjectBuilder();
    builder.setRootPackageJson(structuredClone(existing.packageJson));

    await buildProjectAdditions(
      additions,
      mergeStackConfig(existing.config, additions),
      builder,
    );

    expect(builder.rootPackageJson.devDependencies).toMatchObject({
      oxlint: "^0.9.0",
      oxfmt: "^0.9.0",
      prettier: "^3.3.0",
      eslint: "^9.0.0",
    });
    expect(builder.commands).toEqual([]);
  });

  it("pins Lightning CSS when Expo and Tailwind are added together", async () => {
    const { targetDir, existing } = await createFixture();
    const additions = config(targetDir, {
      apps: [{ type: "expo", name: "mobile" }],
      tooling: [{ type: "tailwind" }],
    });
    const builder = new ProjectBuilder();
    builder.setRootPackageJson(structuredClone(existing.packageJson));

    await buildProjectAdditions(
      additions,
      mergeStackConfig(existing.config, additions),
      builder,
    );

    expect(parse(builder.files["pnpm-workspace.yaml"] ?? "")).toMatchObject({
      overrides: { lightningcss: "1.30.1" },
    });
    expect(builder.rootPackageJson.pnpm).toBeUndefined();
  });

  it.each(["packages: [", "packages: []\noverrides: invalid\n"])(
    "rejects invalid workspace settings before replacing them (%s)",
    async (workspace) => {
      const { targetDir, existing } = await createFixture({
        tooling: [{ type: "tailwind" }],
      });
      await writeFile(path.join(targetDir, "pnpm-workspace.yaml"), workspace);
      const additions = config(targetDir, {
        apps: [{ type: "expo", name: "mobile" }],
      });
      const builder = new ProjectBuilder();
      builder.setRootPackageJson(structuredClone(existing.packageJson));

      await expect(
        buildProjectAdditions(
          additions,
          mergeStackConfig(existing.config, additions),
          builder,
        ),
      ).rejects.toThrow("Cannot update pnpm-workspace.yaml");
      expect(builder.files["pnpm-workspace.yaml"]).toBeUndefined();
    },
  );

  it("upgrades existing standalone Tailwind when shadcn is added", async () => {
    const { targetDir, existing } = await createFixture({
      tooling: [{ type: "tailwind" }],
    });
    const additions = config(targetDir, {
      packages: [
        {
          type: "shadcn",
          shadcn: { preset: "nova", base: "base" },
        },
      ],
    });
    const builder = new ProjectBuilder();
    builder.setRootPackageJson(structuredClone(existing.packageJson));

    await buildProjectAdditions(
      additions,
      mergeStackConfig(existing.config, additions),
      builder,
    );

    expect(builder.files["packages/ui/package.json"]).toBeDefined();
    expect(builder.files["tooling/tailwind/package.json"]).toContain(
      '"tw-animate-css"',
    );
    expect(builder.files["tooling/tailwind/src/styles.css"]).toContain(
      '@import "shadcn/tailwind.css";',
    );
    expect(builder.files["tooling/tailwind/src/theme.css"]).toContain(
      "--background:",
    );
    expect(builder.files["tooling/tailwind/src/postcss.js"]).toBeUndefined();
  });

  it("preserves a customized Tailwind theme when shadcn is added", async () => {
    const { targetDir, existing } = await createFixture({
      tooling: [{ type: "tailwind" }],
    });
    const customTheme = "@theme { --color-brand: rebeccapurple; }\n";
    await writeFile(
      path.join(targetDir, "tooling/tailwind/src/theme.css"),
      customTheme,
    );
    const additions = config(targetDir, {
      packages: [
        {
          type: "shadcn",
          shadcn: { preset: "nova", base: "base" },
        },
      ],
    });
    const builder = new ProjectBuilder();
    builder.setRootPackageJson(structuredClone(existing.packageJson));

    await buildProjectAdditions(
      additions,
      mergeStackConfig(existing.config, additions),
      builder,
    );

    expect(builder.files["tooling/tailwind/src/theme.css"]).toBe(customTheme);
  });
});
