import { describe, expect, it } from "vitest";
import {
  buildProject,
  hasApp,
  hasAuth,
  hasPackage,
  hasTooling,
} from "./runner.js";
import { ProjectBuilder, type StackConfig } from "./types.js";

function createTestConfig(overrides: Partial<StackConfig> = {}): StackConfig {
  return {
    projectName: "test-project",
    targetDir: "/tmp/test-project",
    packageManager: "pnpm",
    apps: [],
    packages: [],
    auth: { provider: "none" },
    db: { orm: "none" },
    tooling: [],
    ...overrides,
  };
}

describe("buildProject", () => {
  it("generates root files", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["pnpm-workspace.yaml"]).toContain("apps/*");
    expect(builder.files["turbo.json"]).toContain("build");
    expect(builder.files[".gitignore"]).toContain("node_modules");
    expect(builder.rootPackageJson.name).toBe("test-project");
  });

  it("always generates tsconfig tooling", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["tooling/tsconfig/package.json"]).toContain(
      "@test-project/tsconfig",
    );
    expect(builder.files["tooling/tsconfig/base.json"]).toContain("ES2022");
  });

  it("copies the vite template when a vite app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ apps: [{ type: "vite", name: "vite" }] });

    await buildProject(config, builder);

    expect(builder.files["apps/vite/package.json"]).toContain(
      "@test-project/vite",
    );
    expect(builder.files["apps/vite/index.html"]).toContain("vite");
    expect(builder.files["apps/vite/src/main.ts"]).toBeDefined();
    expect(builder.files["apps/vite/package.json"]).toContain(
      '"vite": "^8.2.0"',
    );
  });

  it("copies the next template when a next app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ apps: [{ type: "next", name: "next" }] });

    await buildProject(config, builder);

    expect(builder.files["apps/next/package.json"]).toContain(
      "@test-project/next",
    );
    expect(builder.files["apps/next/app/page.tsx"]).toContain("next");
    expect(builder.files["apps/next/package.json"]).toContain(
      '"next": "^16.2.12"',
    );
  });

  it("copies the expo router template when an expo app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "expo", name: "expo" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/expo/package.json"]).toContain(
      "@test-project/expo",
    );
    expect(builder.files["apps/expo/app.json"]).toContain("expo");
    expect(builder.files["apps/expo/app/_layout.tsx"]).toBeDefined();
    expect(builder.files["apps/expo/package.json"]).toContain(
      '"expo": "^57.0.9"',
    );
  });

  it("copies the electron template when an electron app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "electron", name: "electron" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/electron/package.json"]).toContain(
      "@test-project/electron",
    );
    expect(builder.files["apps/electron/electron/main.ts"]).toContain(
      "electron",
    );
    expect(builder.files["apps/electron/src/index.html"]).toContain("electron");
    expect(builder.files["apps/electron/package.json"]).toContain(
      '"electron": "^43.2.0"',
    );
  });

  it("does not add external CLI commands for app scaffolding", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        { type: "vite", name: "vite" },
        { type: "next", name: "next" },
        { type: "expo", name: "expo" },
        { type: "electron", name: "electron" },
      ],
    });

    await buildProject(config, builder);

    expect(
      builder.commands.some(
        (cmd) =>
          cmd.args.includes("create") &&
          (cmd.args.includes("vite@latest") ||
            cmd.args.includes("next-app@latest")),
      ),
    ).toBe(false);
  });

  it("generates shadcn package files", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ packages: [{ type: "shadcn" }] });

    await buildProject(config, builder);

    expect(builder.files["packages/ui/package.json"]).toContain(
      "@test-project/ui",
    );
    expect(builder.files["packages/ui/components.json"]).toContain(
      "shadcn.com",
    );
  });

  it("generates tailwind tooling with shadcn colors when shadcn is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "shadcn" }],
      tooling: [{ type: "tailwind" }],
    });

    await buildProject(config, builder);

    expect(builder.files["tooling/tailwind/src/index.ts"]).toContain(
      "--background",
    );
    expect(builder.files["packages/ui/src/lib/utils.ts"]).toContain(
      "tailwind-merge",
    );
  });

  it("generates oxc tooling and updates root scripts", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ tooling: [{ type: "oxc" }] });

    await buildProject(config, builder);

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
    const config = createTestConfig({ apps: [{ type: "vite", name: "vite" }] });
    expect(hasApp(config, "vite")).toBe(true);
  });

  it("hasAuth returns true when an auth provider is selected", () => {
    const config = createTestConfig({ auth: { provider: "clerk" } });
    expect(hasAuth(config)).toBe(true);
  });

  it("hasAuth returns false when auth provider is none", () => {
    const config = createTestConfig({ auth: { provider: "none" } });
    expect(hasAuth(config)).toBe(false);
  });
});

describe("auth package generation", () => {
  it("does not generate auth package when auth provider is none", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["packages/auth/package.json"]).toBeUndefined();
  });

  it("generates clerk auth package when clerk is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ auth: { provider: "clerk" } });

    await buildProject(config, builder);

    expect(builder.files["packages/auth/package.json"]).toContain(
      "@clerk/clerk-react",
    );
    expect(builder.files["packages/auth/src/index.ts"]).toContain(
      "AuthProvider",
    );
    expect(builder.files["packages/auth/src/provider.tsx"]).toContain(
      "ClerkProvider",
    );
    expect(builder.files["packages/auth/src/use-auth.ts"]).toContain(
      "useClerk",
    );
  });

  it("generates better-auth auth package when better-auth is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ auth: { provider: "better-auth" } });

    await buildProject(config, builder);

    expect(builder.files["packages/auth/package.json"]).toContain(
      "better-auth",
    );
    expect(builder.files["packages/auth/src/client.ts"]).toContain(
      "createAuthClient",
    );
    expect(builder.files["packages/auth/src/use-auth.ts"]).toContain(
      "useSession",
    );
  });

  it("generates workos auth package when workos is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ auth: { provider: "workos" } });

    await buildProject(config, builder);

    expect(builder.files["packages/auth/package.json"]).toContain(
      "@workos-inc/authkit-react",
    );
    expect(builder.files["packages/auth/src/provider.tsx"]).toContain(
      "WorkOSAuthProvider",
    );
    expect(builder.files["packages/auth/src/use-auth.ts"]).toContain(
      "useWorkOSAuth",
    );
  });
});

describe("db package generation", () => {
  it("does not generate db package when db orm is none", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["packages/db/package.json"]).toBeUndefined();
  });

  it("generates drizzle db package when drizzle is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "drizzle" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/db/package.json"]).toContain("drizzle-orm");
    expect(builder.files["packages/db/package.json"]).toContain("drizzle-kit");
    expect(builder.files["packages/db/drizzle.config.ts"]).toContain(
      "postgresql",
    );
    expect(builder.files["packages/db/src/schema.ts"]).toContain("pgTable");
    expect(builder.files["packages/db/src/index.ts"]).toContain("drizzle");
  });

  it("generates prisma db package when prisma is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "prisma" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/db/package.json"]).toContain(
      "@prisma/client",
    );
    expect(builder.files["packages/db/package.json"]).toContain("prisma");
    expect(builder.files["packages/db/prisma/schema.prisma"]).toContain(
      "postgresql",
    );
    expect(builder.files["packages/db/src/index.ts"]).toContain("PrismaClient");
  });
});
