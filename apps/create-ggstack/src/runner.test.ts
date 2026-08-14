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
    expect(builder.files[".gitignore"]).not.toContain(".next");
    expect(builder.files[".gitignore"]).not.toContain(".expo");
    expect(builder.rootPackageJson.name).toBe("test-project");
    expect(builder.files[".env.example"]).toContain("NODE_ENV=development");
    expect(builder.files["packages/env/package.json"]).toContain(
      "@test-project/env",
    );
    expect(builder.files["README.md"]).toContain("# test-project");
    expect(builder.files["README.md"]).toContain("cp .env.example .env");
    expect(builder.files["README.md"]).toContain("@test-project/env");
  });

  it("generates a root README with selected stack details", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        {
          type: "vite",
          name: "marketing",
          vite: { framework: "react", variant: "react-compiler" },
        },
        { type: "next", name: "web" },
        { type: "astro", name: "site" },
        { type: "expo", name: "mobile" },
        { type: "express", name: "api" },
        { type: "fastify", name: "gateway" },
        { type: "tanstack-start", name: "start" },
        { type: "react-router", name: "rr" },
      ],
      packages: [{ type: "shadcn" }, { type: "db" }],
      auth: { provider: "clerk" },
      db: { orm: "drizzle" },
      tooling: [{ type: "oxc" }, { type: "tailwind" }],
    });

    await buildProject(config, builder);

    const readme = builder.files["README.md"];
    expect(readme).toContain("# test-project");
    expect(readme).toContain("apps/marketing");
    expect(readme).toContain("Vite (React + Compiler)");
    expect(readme).toContain("apps/web");
    expect(readme).toContain("Next.js");
    expect(readme).toContain("apps/site");
    expect(readme).toContain("Astro");
    expect(readme).toContain("apps/mobile");
    expect(readme).toContain("Expo Router");
    expect(readme).toContain("apps/api");
    expect(readme).toContain("Express");
    expect(readme).toContain("apps/gateway");
    expect(readme).toContain("Fastify");
    expect(readme).toContain("apps/start");
    expect(readme).toContain("TanStack Start");
    expect(readme).toContain("apps/rr");
    expect(readme).toContain("React Router");
    expect(readme).toContain("pnpm --filter @test-project/mobile start");
    expect(readme).toContain("Clerk");
    expect(readme).toContain("Drizzle ORM");
    expect(readme).toContain("@test-project/ui");
    expect(readme).toContain("not mounted automatically");
    expect(readme).toContain("Oxc");
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
    expect(builder.files["apps/vite/src/main.ts"]).toContain("vite");
    expect(builder.files["apps/vite/src/App.tsx"]).toBeUndefined();
  });

  it.each([
    ["vue", "src/App.vue", "@vitejs/plugin-vue"],
    ["react", "src/App.tsx", "@vitejs/plugin-react"],
    ["preact", "src/App.tsx", "@preact/preset-vite"],
    ["lit", "src/my-element.ts", '"lit":'],
    ["svelte", "src/App.svelte", "@sveltejs/vite-plugin-svelte"],
    ["solid", "src/App.tsx", "vite-plugin-solid"],
    ["qwik", "src/App.tsx", "@builder.io/qwik"],
  ] as const)(
    "copies the vite %s template when that framework is selected",
    async (framework, entry, marker) => {
      const builder = new ProjectBuilder();
      const config = createTestConfig({
        apps: [
          {
            type: "vite",
            name: "web",
            vite: { framework, variant: "ts" },
          },
        ],
      });

      await buildProject(config, builder);

      expect(builder.files[`apps/web/${entry}`]).toBeDefined();
      expect(builder.files[`apps/web/${entry}`]).toContain("web");
      expect(builder.files["apps/web/package.json"]).toContain(
        "@test-project/web",
      );
      expect(builder.files["apps/web/package.json"]).toContain(marker);
      expect(builder.files["apps/web/vite.config.ts"]).toContain(
        "createViteEnv",
      );
    },
  );

  it("applies the react compiler overlay on the react vite template", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        {
          type: "vite",
          name: "web",
          vite: { framework: "react", variant: "react-compiler" },
        },
      ],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/web/src/App.tsx"]).toBeDefined();
    expect(builder.files["apps/web/package.json"]).toContain(
      "babel-plugin-react-compiler",
    );
    expect(builder.files["apps/web/package.json"]).toContain(
      "@rolldown/plugin-babel",
    );
    expect(builder.files["apps/web/vite.config.ts"]).toContain(
      "reactCompilerPreset",
    );
    expect(builder.files["apps/web/vite.config.ts"]).toContain(
      'from "@rolldown/plugin-babel"',
    );
  });

  it("does not apply the react compiler overlay for the typescript react variant", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        {
          type: "vite",
          name: "web",
          vite: { framework: "react", variant: "ts" },
        },
      ],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/web/package.json"]).not.toContain(
      "babel-plugin-react-compiler",
    );
    expect(builder.files["apps/web/vite.config.ts"]).toContain(
      "plugins: [react()],",
    );
    expect(builder.files["apps/web/vite.config.ts"]).not.toContain(
      "reactCompilerPreset",
    );
  });

  it("copies the next template when a next app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ apps: [{ type: "next", name: "next" }] });

    await buildProject(config, builder);

    expect(builder.files["apps/next/package.json"]).toContain(
      "@test-project/next",
    );
    expect(builder.files["apps/next/app/page.tsx"]).toContain("Next.js");
    expect(builder.files["apps/next/app/page.tsx"]).toContain('{"next"}');
    expect(builder.files["apps/next/app/page.tsx"]).not.toContain("APP_NAME");
    expect(builder.files["apps/next/package.json"]).toContain(
      '"next": "^16.2.12"',
    );
  });

  it("copies the astro template when an astro app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "astro", name: "astro" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/astro/package.json"]).toContain(
      "@test-project/astro",
    );
    expect(builder.files["apps/astro/src/pages/index.astro"]).toContain("astro");
    expect(builder.files["apps/astro/src/pages/index.astro"]).not.toContain(
      "APP_NAME",
    );
    expect(builder.files["apps/astro/astro.config.ts"]).toContain(
      "@test-project/env/server",
    );
    expect(builder.files["apps/astro/package.json"]).toContain(
      '"astro": "^7.2.2"',
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

  it("copies the express template when an express app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "express", name: "express" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/express/package.json"]).toContain(
      "@test-project/express",
    );
    expect(builder.files["apps/express/src/index.ts"]).toContain("express");
    expect(builder.files["apps/express/src/index.ts"]).toContain(
      'name: "express"',
    );
    expect(builder.files["apps/express/src/index.ts"]).not.toContain(
      "APP_NAME",
    );
    expect(builder.files["apps/express/package.json"]).toContain(
      '"express": "^5.2.1"',
    );
  });

  it("copies the fastify template when a fastify app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "fastify", name: "fastify" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/fastify/package.json"]).toContain(
      "@test-project/fastify",
    );
    expect(builder.files["apps/fastify/src/index.ts"]).toContain("Fastify");
    expect(builder.files["apps/fastify/src/index.ts"]).toContain(
      'name: "fastify"',
    );
    expect(builder.files["apps/fastify/src/index.ts"]).not.toContain(
      "APP_NAME",
    );
    expect(builder.files["apps/fastify/package.json"]).toContain(
      '"fastify": "^5.11.3"',
    );
  });

  it("copies the tanstack start template when a tanstack-start app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "tanstack-start", name: "tanstack-start" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/tanstack-start/package.json"]).toContain(
      "@test-project/tanstack-start",
    );
    expect(builder.files["apps/tanstack-start/src/routes/index.tsx"]).toContain(
      "TanStack Start",
    );
    expect(builder.files["apps/tanstack-start/src/routes/index.tsx"]).toContain(
      '{"tanstack-start"}',
    );
    expect(
      builder.files["apps/tanstack-start/src/routes/index.tsx"],
    ).not.toContain("APP_NAME");
    expect(builder.files["apps/tanstack-start/vite.config.ts"]).toContain(
      "createViteEnv",
    );
    expect(builder.files["apps/tanstack-start/vite.config.ts"]).toContain(
      "@test-project/env/server",
    );
    expect(builder.files["apps/tanstack-start/package.json"]).toContain(
      '"@tanstack/react-start": "^1.168.44"',
    );
  });

  it("copies the react router template when a react-router app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "react-router", name: "react-router" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/react-router/package.json"]).toContain(
      "@test-project/react-router",
    );
    expect(builder.files["apps/react-router/app/routes/home.tsx"]).toContain(
      "React Router",
    );
    expect(builder.files["apps/react-router/app/routes/home.tsx"]).toContain(
      '{"react-router"}',
    );
    expect(
      builder.files["apps/react-router/app/routes/home.tsx"],
    ).not.toContain("APP_NAME");
    expect(builder.files["apps/react-router/vite.config.ts"]).toContain(
      "createViteEnv",
    );
    expect(builder.files["apps/react-router/vite.config.ts"]).toContain(
      "@test-project/env/server",
    );
    expect(builder.files["apps/react-router/package.json"]).toContain(
      '"react-router": "^8.3.0"',
    );
  });

  it("does not add external CLI commands for app scaffolding", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        { type: "vite", name: "vite" },
        { type: "next", name: "next" },
        { type: "astro", name: "astro" },
        { type: "expo", name: "expo" },
        { type: "electron", name: "electron" },
        { type: "express", name: "express" },
        { type: "fastify", name: "fastify" },
        { type: "tanstack-start", name: "tanstack-start" },
        { type: "react-router", name: "react-router" },
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
    expect(builder.files["packages/auth/src/provider.tsx"]).toContain(
      "getPublicAuthConfig",
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
    expect(builder.files["packages/auth/src/provider.tsx"]).toContain(
      'from "@test-project/env/client"',
    );
    expect(builder.files["packages/auth/src/provider.tsx"]).toContain(
      "getPublicAuthConfig",
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
    expect(builder.files["packages/db/src/index.ts"]).toContain(
      "serverEnv.DATABASE_URL",
    );
    expect(builder.files["packages/db/.env.example"]).toBeUndefined();
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
    expect(builder.files["packages/db/src/index.ts"]).toContain(
      "serverEnv.DATABASE_URL",
    );
    expect(builder.files["packages/db/.env.example"]).toBeUndefined();
  });
});

describe("env package generation", () => {
  it("always generates packages/env and a root .env.example", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["packages/env/package.json"]).toContain(
      "@t3-oss/env-core",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain("serverEnv");
    expect(builder.files["packages/env/src/client.ts"]).toBeDefined();
    expect(builder.files[".env.example"]).toContain("Copy this file to `.env`");
    expect(builder.files[".env.example"]).toContain("NODE_ENV=development");
  });

  it("adds DATABASE_URL when a database orm is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "drizzle" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "DATABASE_URL",
    );
    expect(builder.files[".env.example"]).toContain("DATABASE_URL=");
    expect(builder.files["turbo.json"]).toContain("DATABASE_URL");
  });

  it("does not add provider keys when auth and db are none", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "DATABASE_URL",
    );
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "CLERK_SECRET_KEY",
    );
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "BETTER_AUTH_SECRET",
    );
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "WORKOS_API_KEY",
    );
    expect(builder.files[".env.example"]).not.toContain("DATABASE_URL");
  });

  it("adds better-auth server keys only for better-auth", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ auth: { provider: "better-auth" } });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "BETTER_AUTH_SECRET",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "BETTER_AUTH_URL",
    );
    expect(builder.files[".env.example"]).toContain("BETTER_AUTH_SECRET=");
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "CLERK_SECRET_KEY",
    );
  });

  it("adds VITE_ client prefix when tanstack-start or react-router is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        { type: "tanstack-start", name: "start" },
        { type: "react-router", name: "web" },
      ],
      auth: { provider: "clerk" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "VITE_CLERK_PUBLISHABLE_KEY",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      'clientPrefix: "VITE_"',
    );
    expect(builder.files["packages/env/src/client.ts"]).not.toContain(
      'clientPrefix: "NEXT_PUBLIC_"',
    );
  });

  it("adds clerk keys and next/vite client prefixes when those apps are selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        { type: "next", name: "next" },
        { type: "vite", name: "vite" },
        { type: "tanstack-start", name: "start" },
        { type: "react-router", name: "web" },
      ],
      auth: { provider: "clerk" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "CLERK_SECRET_KEY",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "VITE_CLERK_PUBLISHABLE_KEY",
    );
    expect(builder.files["packages/env/src/client.ts"]).not.toContain(
      'clientPrefix: "EXPO_PUBLIC_"',
    );
    expect(builder.files["packages/env/src/client.ts"]).not.toContain(
      "export const expoEnv",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "getPublicAuthConfig",
    );
    expect(builder.files["apps/next/next.config.ts"]).toContain(
      "@test-project/env/server",
    );
    expect(builder.files["apps/vite/vite.config.ts"]).toContain(
      "createViteEnv",
    );
    expect(builder.files["apps/start/vite.config.ts"]).toContain(
      "createViteEnv",
    );
    expect(builder.files["apps/web/vite.config.ts"]).toContain("createViteEnv");
  });

  it("adds clerk keys and PUBLIC_ client prefix when astro is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "astro", name: "site" }],
      auth: { provider: "clerk" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "PUBLIC_CLERK_PUBLISHABLE_KEY",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      'clientPrefix: "PUBLIC_"',
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain("astroEnv");
    expect(builder.files["packages/env/src/client.ts"]).not.toContain(
      'clientPrefix: "NEXT_PUBLIC_"',
    );
    expect(builder.files["packages/env/src/client.ts"]).not.toContain(
      "export const nextEnv",
    );
    expect(builder.files["apps/site/astro.config.ts"]).toContain(
      "@test-project/env/server",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "PUBLIC_CLERK_PUBLISHABLE_KEY",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "getPublicAuthConfig",
    );
  });

  it("adds workos keys and expo client prefix when expo is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "expo", name: "expo" }],
      auth: { provider: "workos" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "WORKOS_API_KEY",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "WORKOS_COOKIE_PASSWORD",
    );
    expect(builder.files["packages/env/src/client.ts"]).toContain(
      "EXPO_PUBLIC_WORKOS_CLIENT_ID",
    );
    expect(builder.files["packages/env/src/client.ts"]).not.toContain(
      'clientPrefix: "NEXT_PUBLIC_"',
    );
    expect(builder.files["packages/env/src/client.ts"]).not.toContain(
      "export const nextEnv",
    );
    expect(builder.files["apps/expo/app/_layout.tsx"]).toContain("expoEnv");
  });

  it("adds optional VITE_DEV_SERVER_URL when electron is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "electron", name: "electron" }],
    });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "VITE_DEV_SERVER_URL",
    );
    expect(builder.files[".env.example"]).toContain("VITE_DEV_SERVER_URL=");
    expect(builder.files["apps/electron/electron/main.ts"]).toContain(
      "serverEnv.VITE_DEV_SERVER_URL",
    );
  });

  it("lists generated keys on turbo globalEnv", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "prisma" },
      auth: { provider: "clerk" },
      apps: [{ type: "next", name: "next" }],
    });

    await buildProject(config, builder);

    const turbo = JSON.parse(builder.files["turbo.json"] ?? "{}") as {
      globalEnv?: string[];
      globalPassThroughEnv?: string[];
    };

    expect(turbo.globalEnv).toEqual(
      expect.arrayContaining([
        "DATABASE_URL",
        "CLERK_SECRET_KEY",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      ]),
    );
    expect(turbo.globalEnv).not.toContain("NODE_ENV");
    expect(turbo.globalPassThroughEnv).toEqual(
      expect.arrayContaining(["NODE_ENV", "SKIP_ENV_VALIDATION"]),
    );
  });
});
