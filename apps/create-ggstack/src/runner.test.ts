import { describe, expect, it } from "vitest";
import { buildProject, hasApp, hasPackage, hasTooling } from "./runner.js";
import { ProjectBuilder, type StackConfig } from "./types.js";

function createTestConfig(overrides: Partial<StackConfig> = {}): StackConfig {
  return {
    projectName: "test-project",
    targetDir: "/tmp/test-project",
    packageManager: "pnpm",
    apps: [],
    packages: [],
    tooling: [],
    ...overrides,
  };
}

describe("buildProject", () => {
  it("generates root files", () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    buildProject(config, builder);

    expect(builder.files["pnpm-workspace.yaml"]).toContain("apps/*");
    expect(builder.files["turbo.json"]).toContain("build");
    expect(builder.files[".gitignore"]).toContain("node_modules");
    expect(builder.rootPackageJson.name).toBe("test-project");
  });

  it("always generates tsconfig tooling", () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    buildProject(config, builder);

    expect(builder.files["tooling/tsconfig/package.json"]).toContain(
      "@test-project/tsconfig",
    );
    expect(builder.files["tooling/tsconfig/base.json"]).toContain("ES2022");
  });

  it("adds vite command when a vite app is selected", () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ apps: [{ type: "vite", name: "web" }] });

    buildProject(config, builder);

    const viteCommand = builder.commands.find(
      (cmd) => cmd.args.includes("create") && cmd.args.includes("vite@latest"),
    );
    expect(viteCommand).toBeDefined();
    expect(viteCommand?.args).toContain("apps/web");
  });

  it("adds next command when a next app is selected", () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ apps: [{ type: "next", name: "next" }] });

    buildProject(config, builder);

    const nextCommand = builder.commands.find(
      (cmd) =>
        cmd.args.includes("create") && cmd.args.includes("next-app@latest"),
    );
    expect(nextCommand).toBeDefined();
    expect(nextCommand?.args).toContain("apps/next");
  });

  it("generates shadcn package files", () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ packages: [{ type: "shadcn" }] });

    buildProject(config, builder);

    expect(builder.files["packages/ui/package.json"]).toContain(
      "@test-project/ui",
    );
    expect(builder.files["packages/ui/components.json"]).toContain(
      "shadcn.com",
    );
  });

  it("generates tailwind tooling with shadcn colors when shadcn is selected", () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "shadcn" }],
      tooling: [{ type: "tailwind" }],
    });

    buildProject(config, builder);

    expect(builder.files["tooling/tailwind/src/index.ts"]).toContain(
      "--background",
    );
    expect(builder.files["packages/ui/src/lib/utils.ts"]).toContain(
      "tailwind-merge",
    );
  });

  it("generates oxc tooling and updates root scripts", () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ tooling: [{ type: "oxc" }] });

    buildProject(config, builder);

    expect(builder.files["tooling/oxc/oxlint.json"]).toContain(
      "no-explicit-any",
    );
    expect(builder.rootPackageJson.scripts?.lint).toContain(
      "tooling/oxc/oxlint.json",
    );
    expect(builder.rootPackageJson.devDependencies?.oxlint).toBe("^0.9.0");
  });
});

describe("helpers", () => {
  it("hasTooling returns true when tooling type exists", () => {
    const config = createTestConfig({ tooling: [{ type: "tailwind" }] });
    expect(hasTooling(config, "tailwind")).toBe(true);
    expect(hasTooling(config, "oxc")).toBe(false);
  });

  it("hasPackage returns true when package type exists", () => {
    const config = createTestConfig({ packages: [{ type: "shadcn" }] });
    expect(hasPackage(config, "shadcn")).toBe(true);
  });

  it("hasApp returns true when app type exists", () => {
    const config = createTestConfig({ apps: [{ type: "vite", name: "web" }] });
    expect(hasApp(config, "vite")).toBe(true);
  });
});
