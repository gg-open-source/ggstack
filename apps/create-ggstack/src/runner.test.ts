import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  buildProject,
  hasApp,
  hasAuth,
  hasEmail,
  hasPackage,
  hasPayments,
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
    payments: { provider: "none" },
    email: { provider: "none" },
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
      "@packages/env",
    );
    expect(builder.files["README.md"]).toContain("# test-project");
    expect(builder.files["README.md"]).toContain("cp .env.example .env");
    expect(builder.files["README.md"]).toContain("@packages/env");
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
      payments: { provider: "stripe" },
      email: { provider: "resend" },
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
    expect(readme).toContain("pnpm --filter @apps/mobile start");
    expect(readme).toContain("Clerk");
    expect(readme).toContain("Stripe");
    expect(readme).toContain("@packages/payments");
    expect(readme).toContain("@packages/email");
    expect(readme).toContain("Resend + React Email");
    expect(readme).toContain("Drizzle ORM + PostgreSQL");
    expect(readme).toContain("@packages/ui");
    expect(readme).toContain(
      "Workspace packages use only the folder-based scopes `@apps/<folder>`, `@packages/<folder>`, and `@tooling/<folder>`.",
    );
    expect(readme).toContain("not mounted automatically");
    expect(readme).toContain("Oxc");

    const generatedOutput = Object.values(builder.files).join("\n");
    expect(generatedOutput).not.toContain("@test-project/");
  });

  it("always generates tsconfig tooling", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["tooling/tsconfig/package.json"]).toContain(
      "@tooling/tsconfig",
    );
    expect(builder.files["tooling/tsconfig/base.json"]).toContain("ES2022");
  });

  it("copies the vite template when a vite app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ apps: [{ type: "vite", name: "vite" }] });

    await buildProject(config, builder);

    expect(builder.files["apps/vite/package.json"]).toContain("@apps/vite");
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
      expect(builder.files["apps/web/package.json"]).toContain("@apps/web");
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

    expect(builder.files["apps/next/package.json"]).toContain("@apps/next");
    expect(builder.files["apps/next/app/page.tsx"]).toContain("Next.js");
    expect(builder.files["apps/next/app/page.tsx"]).toContain('{"next"}');
    expect(builder.files["apps/next/app/page.tsx"]).not.toContain("APP_NAME");
    expect(builder.files["apps/next/package.json"]).toContain(
      '"next": "^16.2.12"',
    );
  });

  it("generates multiple apps of the same type in separate folders", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        { type: "next", name: "web" },
        { type: "next", name: "docs" },
      ],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/web/package.json"]).toContain("@apps/web");
    expect(builder.files["apps/docs/package.json"]).toContain("@apps/docs");
    expect(builder.files["apps/web/app/page.tsx"]).toContain('{"web"}');
    expect(builder.files["apps/docs/app/page.tsx"]).toContain('{"docs"}');
  });

  it("copies the astro template when an astro app is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "astro", name: "astro" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/astro/package.json"]).toContain("@apps/astro");
    expect(builder.files["apps/astro/src/pages/index.astro"]).toContain(
      "astro",
    );
    expect(builder.files["apps/astro/src/pages/index.astro"]).not.toContain(
      "APP_NAME",
    );
    expect(builder.files["apps/astro/astro.config.ts"]).toContain(
      "@packages/env/server",
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

    expect(builder.files["apps/expo/package.json"]).toContain("@apps/expo");
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
      "@apps/electron",
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
      "@apps/express",
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
      "@apps/fastify",
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
      "@apps/tanstack-start",
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
      "@packages/env/server",
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
      "@apps/react-router",
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
      "@packages/env/server",
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

    expect(builder.files["packages/ui/package.json"]).toContain("@packages/ui");
    expect(builder.files["packages/ui/package.json"]).toContain(
      '"shadcn": "^4.18.0"',
    );
    expect(builder.files["packages/ui/package.json"]).toContain(
      "class-variance-authority",
    );
    expect(builder.files["packages/ui/components.json"]).toContain(
      "shadcn.com",
    );
    expect(builder.files["packages/ui/components.json"]).toContain(
      '"style": "base-nova"',
    );
    expect(builder.files["packages/ui/components.json"]).toContain(
      '"iconLibrary": "lucide"',
    );
    expect(builder.files["packages/ui/components.json"]).toContain(
      '"ui": "@/components"',
    );
    expect(builder.commands).toEqual([]);
  });

  it("uses the selected shadcn base and named preset in components.json", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "shadcn", shadcn: { preset: "luma", base: "radix" } }],
    });

    await buildProject(config, builder);

    expect(builder.files["packages/ui/components.json"]).toContain(
      '"style": "radix-luma"',
    );
    expect(builder.files["packages/ui/README.md"]).toContain("preset `luma`");
    expect(builder.commands).toEqual([]);
  });

  it("applies a custom shadcn preset code after scaffold", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [
        { type: "shadcn", shadcn: { preset: "b2D0vQ7G4", base: "aria" } },
      ],
    });

    await buildProject(config, builder);

    expect(builder.files["packages/ui/components.json"]).toContain(
      '"style": "aria-nova"',
    );
    expect(builder.commands).toEqual([
      {
        command: "pnpm",
        args: [
          "dlx",
          "shadcn@latest",
          "apply",
          "--preset",
          "b2D0vQ7G4",
          "--yes",
        ],
        cwd: "/tmp/test-project/packages/ui",
        description: "Apply shadcn/ui preset",
      },
    ]);
  });

  it("generates tailwind tooling with shadcn colors when shadcn is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "shadcn" }],
      tooling: [{ type: "tailwind" }],
    });

    await buildProject(config, builder);

    expect(builder.files["tooling/tailwind/src/theme.css"]).toContain(
      "--background",
    );
    expect(builder.files["tooling/tailwind/src/theme.css"]).toContain("oklch");
    expect(builder.files["tooling/tailwind/src/theme.css"]).toContain(".dark");
    expect(builder.files["tooling/tailwind/src/styles.css"]).toContain(
      '@import "shadcn/tailwind.css"',
    );
    expect(builder.files["tooling/tailwind/package.json"]).toContain(
      '"tailwindcss": "^4.3.3"',
    );
    expect(builder.files["tooling/tailwind/package.json"]).toContain(
      '"shadcn": "^4.18.0"',
    );
    expect(builder.files["packages/ui/src/lib/utils.ts"]).toContain(
      "tailwind-merge",
    );
    expect(builder.files["packages/ui/package.json"]).not.toContain(
      '"tailwindcss"',
    );
    expect(builder.files["packages/ui/src/globals.css"]).toContain(
      '@import "@tooling/tailwind"',
    );
  });

  it("installs tailwindcss once and wires it into frontend apps", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [
        { type: "next", name: "web" },
        {
          type: "vite",
          name: "vite",
          vite: { framework: "react", variant: "ts" },
        },
        { type: "express", name: "api" },
      ],
      tooling: [{ type: "tailwind" }],
    });

    await buildProject(config, builder);

    expect(builder.files["tooling/tailwind/package.json"]).toContain(
      '"tailwindcss": "^4.3.3"',
    );
    expect(builder.files["tooling/tailwind/src/styles.css"]).toContain(
      '@import "tailwindcss/theme.css"',
    );
    expect(builder.files["apps/web/package.json"]).toContain(
      '"@tooling/tailwind": "workspace:*"',
    );
    expect(builder.files["apps/web/package.json"]).not.toContain(
      '"tailwindcss"',
    );
    expect(builder.files["apps/web/postcss.config.mjs"]).toContain(
      "@tooling/tailwind/postcss",
    );
    expect(builder.files["apps/web/app/globals.css"]).toContain(
      '@import "@tooling/tailwind"',
    );
    expect(builder.files["apps/web/app/layout.tsx"]).toContain(
      'import "./globals.css"',
    );
    expect(builder.files["apps/vite/src/style.css"]).toContain(
      '@import "@tooling/tailwind"',
    );
    expect(builder.files["apps/api/package.json"]).not.toContain(
      "@tooling/tailwind",
    );
    expect(builder.files["apps/api/postcss.config.mjs"]).toBeUndefined();
  });

  it("does not add nativewind to expo when tailwind is not selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "expo", name: "expo" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/expo/package.json"]).not.toContain("nativewind");
    expect(builder.files["apps/expo/metro.config.js"]).not.toContain(
      "withNativewind",
    );
    expect(builder.files["apps/expo/app/index.tsx"]).toContain("StyleSheet");
  });

  it("adds nativewind to expo from the shared tailwind package", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      apps: [{ type: "expo", name: "mobile" }],
      tooling: [{ type: "tailwind" }],
    });

    await buildProject(config, builder);

    expect(builder.files["apps/mobile/package.json"]).toContain(
      '"nativewind": "5.0.0-preview.4"',
    );
    expect(builder.files["apps/mobile/package.json"]).toContain(
      '"@tooling/tailwind": "workspace:*"',
    );
    expect(builder.files["apps/mobile/package.json"]).not.toContain(
      '"tailwindcss"',
    );
    expect(builder.files["apps/mobile/metro.config.js"]).toContain(
      "withNativewind",
    );
    expect(builder.files["apps/mobile/global.css"]).toContain(
      '@import "@tooling/tailwind"',
    );
    expect(builder.files["apps/mobile/global.css"]).toContain(
      '@import "nativewind/theme"',
    );
    expect(builder.files["apps/mobile/app/_layout.tsx"]).toContain(
      'import "../global.css"',
    );
    expect(builder.files["apps/mobile/app/index.tsx"]).toContain("className");
    expect(builder.files["apps/mobile/app/index.tsx"]).toContain(
      "Good foundations.",
    );
    expect(builder.files["apps/mobile/app/index.tsx"]).toContain("StyleSheet");
    expect(builder.files["apps/mobile/nativewind-env.d.ts"]).toContain(
      "react-native-css/types",
    );
    expect(builder.files["apps/mobile/tsconfig.json"]).toContain(
      "nativewind-env.d.ts",
    );
    expect(builder.rootPackageJson.pnpm).toBeUndefined();
    expect(parse(builder.files["pnpm-workspace.yaml"] ?? "")).toMatchObject({
      overrides: { lightningcss: "1.30.1" },
    });
    expect(builder.files["README.md"]).toContain("NativeWind");
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

  it.each(["pnpm", "npm", "yarn", "bun"] as const)(
    "declares Prettier and ESLint without running %s add at the workspace root",
    async (packageManager) => {
      const builder = new ProjectBuilder();
      await buildProject(
        createTestConfig({
          packageManager,
          tooling: [{ type: "prettier" }, { type: "eslint" }],
        }),
        builder,
      );

      expect(builder.rootPackageJson.devDependencies).toMatchObject({
        turbo: "^2.6.0",
        typescript: "^5.8.0",
        prettier: "^3.3.0",
        eslint: "^9.0.0",
      });
      expect(builder.commands).toEqual([]);
    },
  );

  it("scaffolds duplicate Vite apps and the reported stack without install commands", async () => {
    const builder = new ProjectBuilder();
    await buildProject(
      createTestConfig({
        apps: [
          {
            type: "vite",
            name: "vite",
            vite: { framework: "react", variant: "react-compiler" },
          },
          {
            type: "vite",
            name: "preact",
            vite: { framework: "preact", variant: "ts" },
          },
          {
            type: "vite",
            name: "vite-3",
            vite: { framework: "vanilla", variant: "ts" },
          },
          { type: "next", name: "next" },
          { type: "astro", name: "astro" },
          { type: "expo", name: "expo" },
          { type: "fastify", name: "fastify" },
        ],
        packages: [{ type: "shadcn" }, { type: "db" }],
        tooling: [
          { type: "tailwind" },
          { type: "prettier" },
          { type: "eslint" },
        ],
        auth: { provider: "better-auth" },
        db: { orm: "drizzle", dialect: "postgresql" },
        payments: { provider: "polar" },
        email: { provider: "resend" },
      }),
      builder,
    );

    expect(builder.commands).toEqual([]);
    expect(builder.rootPackageJson.devDependencies).toMatchObject({
      prettier: "^3.3.0",
      eslint: "^9.0.0",
    });
    expect(builder.rootPackageJson.pnpm).toBeUndefined();
    expect(parse(builder.files["pnpm-workspace.yaml"] ?? "")).toEqual({
      packages: ["apps/*", "packages/*", "tooling/*"],
      overrides: { lightningcss: "1.30.1" },
    });
    for (const name of [
      "vite",
      "preact",
      "vite-3",
      "next",
      "astro",
      "expo",
      "fastify",
    ]) {
      expect(builder.files[`apps/${name}/package.json`]).toContain(
        `@apps/${name}`,
      );
    }
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

  it("hasPayments returns true when a payment provider is selected", () => {
    const config = createTestConfig({ payments: { provider: "stripe" } });
    expect(hasPayments(config)).toBe(true);
  });

  it("hasPayments returns false when payment provider is none", () => {
    const config = createTestConfig({ payments: { provider: "none" } });
    expect(hasPayments(config)).toBe(false);
  });

  it("hasEmail returns true when an email provider is selected", () => {
    const config = createTestConfig({ email: { provider: "resend" } });
    expect(hasEmail(config)).toBe(true);
  });

  it("hasEmail returns false when email provider is none", () => {
    const config = createTestConfig({ email: { provider: "none" } });
    expect(hasEmail(config)).toBe(false);
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
      'from "@packages/env/client"',
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
    expect(builder.files["packages/db/package.json"]).toContain('"pg"');
    expect(builder.files["packages/db/drizzle.config.ts"]).toContain(
      "postgresql",
    );
    expect(builder.files["packages/db/src/schema.ts"]).not.toContain("pgTable");
    expect(builder.files["packages/db/src/schema.ts"]).not.toContain("users");
    expect(builder.files["packages/db/src/index.ts"]).toContain("drizzle");
    expect(builder.files["packages/db/src/index.ts"]).toContain(
      "node-postgres",
    );
    expect(builder.files["packages/db/src/index.ts"]).toContain(
      "serverEnv.DATABASE_URL",
    );
    expect(builder.files["packages/db/.env.example"]).toBeUndefined();
    expect(builder.files["README.md"]).toContain("Drizzle ORM + PostgreSQL");
  });

  it("generates a mysql drizzle package when the mysql dialect is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "drizzle", dialect: "mysql" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/db/package.json"]).toContain("mysql2");
    expect(builder.files["packages/db/package.json"]).not.toContain('"pg"');
    expect(builder.files["packages/db/drizzle.config.ts"]).toContain(
      'dialect: "mysql"',
    );
    expect(builder.files["packages/db/src/schema.ts"]).not.toContain(
      "mysqlTable",
    );
    expect(builder.files["packages/db/src/schema.ts"]).not.toContain("users");
    expect(builder.files["packages/db/src/index.ts"]).toContain("mysql2");
    expect(builder.files["packages/db/README.md"]).toContain("MySQL");
    expect(builder.files["README.md"]).toContain("Drizzle ORM + MySQL");
    expect(builder.files[".env.example"]).toContain(
      "mysql://user:password@localhost:3306/mydb",
    );
  });

  it("generates a sqlite drizzle package when the sqlite dialect is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "drizzle", dialect: "sqlite" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/db/package.json"]).toContain(
      "@libsql/client",
    );
    expect(builder.files["packages/db/package.json"]).not.toContain('"pg"');
    expect(builder.files["packages/db/drizzle.config.ts"]).toContain(
      'dialect: "sqlite"',
    );
    expect(builder.files["packages/db/src/schema.ts"]).not.toContain(
      "sqliteTable",
    );
    expect(builder.files["packages/db/src/schema.ts"]).not.toContain("users");
    expect(builder.files["packages/db/src/index.ts"]).toContain("libsql");
    expect(builder.files["packages/db/src/index.ts"]).toContain("createClient");
    expect(builder.files["packages/db/README.md"]).toContain("SQLite");
    expect(builder.files["README.md"]).toContain("Drizzle ORM + SQLite");
    expect(builder.files[".env.example"]).toContain(
      "file:./packages/db/local.db",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "DATABASE_URL: z.string().min(1)",
    );
    expect(builder.files[".gitignore"]).toContain("*.db");
    expect(builder.files[".gitignore"]).toContain("*.db-wal");
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
      'provider = "postgresql"',
    );
    expect(builder.files["packages/db/prisma/schema.prisma"]).not.toContain(
      "model User",
    );
    expect(builder.files["packages/db/src/index.ts"]).toContain("PrismaClient");
    expect(builder.files["packages/db/src/index.ts"]).toContain(
      "serverEnv.DATABASE_URL",
    );
    expect(builder.files["packages/db/src/index.ts"]).not.toContain(
      "export type { User }",
    );
    expect(builder.files["packages/db/.env.example"]).toBeUndefined();
  });

  it("generates a mysql prisma package when the mysql dialect is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "prisma", dialect: "mysql" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/db/prisma/schema.prisma"]).toContain(
      'provider = "mysql"',
    );
    expect(builder.files["packages/db/prisma/schema.prisma"]).not.toContain(
      "model User",
    );
    expect(builder.files["packages/db/README.md"]).toContain("MySQL");
    expect(builder.files["README.md"]).toContain("Prisma + MySQL");
    expect(builder.files[".env.example"]).toContain(
      "mysql://user:password@localhost:3306/mydb",
    );
  });

  it("generates a sqlite prisma package when the sqlite dialect is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "prisma", dialect: "sqlite" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/db/prisma/schema.prisma"]).toContain(
      'provider = "sqlite"',
    );
    expect(builder.files["packages/db/prisma/schema.prisma"]).not.toContain(
      "model User",
    );
    expect(builder.files["packages/db/README.md"]).toContain("SQLite");
    expect(builder.files["README.md"]).toContain("Prisma + SQLite");
    expect(builder.files[".env.example"]).toContain(
      "file:./packages/db/local.db",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "DATABASE_URL: z.string().min(1)",
    );
    expect(builder.files[".gitignore"]).toContain("*.db");
    expect(builder.files[".gitignore"]).toContain("*.db-wal");
  });
});

describe("trpc package generation", () => {
  it("does not generate api package when trpc is not selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["packages/api/package.json"]).toBeUndefined();
  });

  it("generates api package when trpc is selected without a database", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ packages: [{ type: "trpc" }] });

    await buildProject(config, builder);

    expect(builder.files["packages/api/package.json"]).toContain(
      "@packages/api",
    );
    expect(builder.files["packages/api/package.json"]).toContain(
      "@trpc/server",
    );
    expect(builder.files["packages/api/package.json"]).toContain(
      "@trpc/client",
    );
    expect(builder.files["packages/api/package.json"]).not.toContain(
      "@packages/db",
    );
    expect(builder.files["packages/api/src/root.ts"]).toContain("hello");
    expect(builder.files["packages/api/src/root.ts"]).not.toContain("users");
    expect(builder.files["packages/api/src/trpc.ts"]).toContain("return {};");
    expect(builder.files["packages/api/src/trpc.ts"]).not.toContain(
      "@packages/db",
    );
    expect(builder.files["packages/api/src/client.ts"]).toContain(
      "createApiClient",
    );
    expect(builder.files["packages/api/src/index.ts"]).toContain("appRouter");
    expect(builder.files["packages/api/src/router/users.ts"]).toBeUndefined();
  });

  it("includes drizzle db in tRPC context when drizzle is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "trpc" }, { type: "db" }],
      db: { orm: "drizzle" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/api/package.json"]).toContain(
      "@packages/db",
    );
    expect(builder.files["packages/api/src/trpc.ts"]).toContain(
      'from "@packages/db"',
    );
    expect(builder.files["packages/api/src/trpc.ts"]).toContain(
      "return { db };",
    );
    expect(builder.files["packages/api/src/root.ts"]).not.toContain("users");
    expect(builder.files["packages/api/src/router/users.ts"]).toBeUndefined();
  });

  it("includes prisma in tRPC context when prisma is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "trpc" }, { type: "db" }],
      db: { orm: "prisma" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/api/package.json"]).toContain(
      "@packages/db",
    );
    expect(builder.files["packages/api/src/trpc.ts"]).toContain(
      "return { prisma };",
    );
    expect(builder.files["packages/api/src/root.ts"]).not.toContain("users");
    expect(builder.files["packages/api/src/router/users.ts"]).toBeUndefined();
  });

  it("lists the api package in the generated root README", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ packages: [{ type: "trpc" }] });

    await buildProject(config, builder);

    const readme = builder.files["README.md"];
    expect(readme).toContain("@packages/api");
    expect(readme).toContain("not mounted automatically");
    expect(readme).toContain("mount `@packages/api`");
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
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "z.string().url()",
    );
    expect(builder.files[".env.example"]).toContain("DATABASE_URL=");
    expect(builder.files[".env.example"]).toContain(
      "postgresql://user:password@localhost:5432/mydb",
    );
    expect(builder.files["turbo.json"]).toContain("DATABASE_URL");
  });

  it("treats sqlite DATABASE_URL as a file path, not a url", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({
      packages: [{ type: "db" }],
      db: { orm: "drizzle", dialect: "sqlite" },
    });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "DATABASE_URL: z.string().min(1)",
    );
    expect(builder.files[".env.example"]).toContain(
      "file:./packages/db/local.db",
    );
  });

  it("does not add provider keys when auth, db, payments, and email are none", async () => {
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
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "STRIPE_SECRET_KEY",
    );
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "POLAR_ACCESS_TOKEN",
    );
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "AUTUMN_SECRET_KEY",
    );
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "RESEND_API_KEY",
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
      "@packages/env/server",
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
      "@packages/env/server",
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

  it("adds stripe and upstash keys when stripe is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ payments: { provider: "stripe" } });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "STRIPE_SECRET_KEY",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "STRIPE_WEBHOOK_SECRET",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "STRIPE_PRICE_ID",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "UPSTASH_REDIS_REST_URL",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "UPSTASH_REDIS_REST_TOKEN",
    );
    expect(builder.files[".env.example"]).toContain("# Payments");
    expect(builder.files[".env.example"]).toContain("STRIPE_SECRET_KEY=");
    expect(builder.files["turbo.json"]).toContain("STRIPE_SECRET_KEY");
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "POLAR_ACCESS_TOKEN",
    );
  });

  it("adds polar keys when polar is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ payments: { provider: "polar" } });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "POLAR_ACCESS_TOKEN",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "POLAR_WEBHOOK_SECRET",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "POLAR_PRODUCT_ID",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain(
      'POLAR_SERVER: z.enum(["sandbox", "production"]).optional()',
    );
    expect(builder.files[".env.example"]).toContain("POLAR_ACCESS_TOKEN=");
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "STRIPE_SECRET_KEY",
    );
  });

  it("adds autumn keys when autumn is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ payments: { provider: "autumn" } });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "AUTUMN_SECRET_KEY",
    );
    expect(builder.files[".env.example"]).toContain("AUTUMN_SECRET_KEY=");
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "STRIPE_SECRET_KEY",
    );
  });

  it("adds resend keys when resend is selected", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ email: { provider: "resend" } });

    await buildProject(config, builder);

    expect(builder.files["packages/env/src/server.ts"]).toContain(
      "RESEND_API_KEY",
    );
    expect(builder.files["packages/env/src/server.ts"]).toContain("EMAIL_FROM");
    expect(builder.files[".env.example"]).toContain("# Email");
    expect(builder.files[".env.example"]).toContain("RESEND_API_KEY=");
    expect(builder.files[".env.example"]).toContain("EMAIL_FROM=");
    expect(builder.files["turbo.json"]).toContain("RESEND_API_KEY");
    expect(builder.files["packages/env/src/server.ts"]).not.toContain(
      "STRIPE_SECRET_KEY",
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

describe("payments package generation", () => {
  it("does not generate payments package when payment provider is none", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["packages/payments/package.json"]).toBeUndefined();
  });

  it("generates a stripe package that follows the KV-sync checkout pattern", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ payments: { provider: "stripe" } });

    await buildProject(config, builder);

    expect(builder.files["packages/payments/package.json"]).toContain(
      "@packages/payments",
    );
    expect(builder.files["packages/payments/package.json"]).toContain("stripe");
    expect(builder.files["packages/payments/package.json"]).toContain(
      "@upstash/redis",
    );
    expect(builder.files["packages/payments/src/sync.ts"]).toContain(
      "syncStripeDataToKV",
    );
    expect(builder.files["packages/payments/src/sync.ts"]).toContain(
      'status: "all"',
    );
    expect(builder.files["packages/payments/src/checkout.ts"]).toContain(
      "customers.create",
    );
    expect(builder.files["packages/payments/src/checkout.ts"]).toContain(
      "userId: input.userId",
    );
    expect(builder.files["packages/payments/src/checkout.ts"]).toContain(
      "customer: customerId",
    );
    expect(builder.files["packages/payments/src/checkout.ts"]).not.toContain(
      "CHECKOUT_SESSION_ID",
    );
    expect(builder.files["packages/payments/src/webhook.ts"]).toContain(
      "checkout.session.completed",
    );
    expect(builder.files["packages/payments/src/webhook.ts"]).toContain(
      "syncStripeDataToKV",
    );
    expect(builder.files["packages/payments/src/index.ts"]).toContain(
      "syncAfterSuccess",
    );
    expect(builder.files["packages/payments/README.md"]).toContain(
      "t3dotgg/stripe-recommendations",
    );
    expect(builder.files["packages/payments/README.md"]).toContain(
      "Disable Cash App Pay",
    );
    expect(builder.files["packages/payments/README.md"]).toContain(
      "Limit customers to one subscription",
    );
    expect(builder.files["README.md"]).toContain("@packages/payments");
    expect(builder.files["README.md"]).toContain("not mounted automatically");
  });

  it("generates a polar package with checkout, portal, and webhooks", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ payments: { provider: "polar" } });

    await buildProject(config, builder);

    expect(builder.files["packages/payments/package.json"]).toContain(
      "@polar-sh/sdk",
    );
    expect(builder.files["packages/payments/src/checkout.ts"]).toContain(
      "externalCustomerId: input.userId",
    );
    expect(builder.files["packages/payments/src/checkout.ts"]).toContain(
      "customerSessions.create",
    );
    expect(builder.files["packages/payments/src/webhook.ts"]).toContain(
      "validateEvent",
    );
    expect(builder.files["packages/payments/src/customer.ts"]).toContain(
      "getStateExternal",
    );
    expect(builder.files["packages/payments/src/index.ts"]).toContain(
      "createCheckoutSession",
    );
  });

  it("generates an autumn package with plans, attach, and entitlements", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ payments: { provider: "autumn" } });

    await buildProject(config, builder);

    expect(builder.files["packages/payments/package.json"]).toContain(
      "autumn-js",
    );
    expect(builder.files["packages/payments/package.json"]).toContain("atmn");
    expect(builder.files["packages/payments/autumn.config.ts"]).toContain(
      'id: "pro"',
    );
    expect(builder.files["packages/payments/src/billing.ts"]).toContain(
      "billing.attach",
    );
    expect(builder.files["packages/payments/src/billing.ts"]).toContain(
      "customers.getOrCreate",
    );
    expect(builder.files["packages/payments/src/billing.ts"]).toContain(
      "autumn.check",
    );
    expect(builder.files["packages/payments/src/billing.ts"]).toContain(
      "autumn.track",
    );
    expect(builder.files["packages/payments/src/index.ts"]).toContain(
      "attachPlan",
    );
  });
});

describe("email package generation", () => {
  it("does not generate email package when email provider is none", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig();

    await buildProject(config, builder);

    expect(builder.files["packages/email/package.json"]).toBeUndefined();
  });

  it("generates a resend package with React Email templates", async () => {
    const builder = new ProjectBuilder();
    const config = createTestConfig({ email: { provider: "resend" } });

    await buildProject(config, builder);

    expect(builder.files["packages/email/package.json"]).toContain(
      "@packages/email",
    );
    expect(builder.files["packages/email/package.json"]).toContain("resend");
    expect(builder.files["packages/email/package.json"]).toContain(
      "react-email",
    );
    expect(builder.files["packages/email/package.json"]).toContain(
      "@react-email/ui",
    );
    expect(builder.files["packages/email/package.json"]).toContain("email:dev");
    expect(builder.files["packages/email/src/client.ts"]).toContain(
      "serverEnv.RESEND_API_KEY",
    );
    expect(builder.files["packages/email/src/send.ts"]).toContain("sendEmail");
    expect(builder.files["packages/email/src/send.ts"]).toContain(
      "sendWelcomeEmail",
    );
    expect(builder.files["packages/email/src/send.ts"]).toContain(
      "WelcomeEmail({ name: input.name, url: input.url })",
    );
    expect(builder.files["packages/email/src/send.ts"]).toContain(
      "serverEnv.EMAIL_FROM",
    );
    expect(builder.files["packages/email/src/emails/welcome.tsx"]).toContain(
      "WelcomeEmail",
    );
    expect(builder.files["packages/email/src/emails/welcome.tsx"]).toContain(
      'from "react-email"',
    );
    expect(builder.files["packages/email/src/emails/welcome.tsx"]).toContain(
      "export default WelcomeEmail",
    );
    expect(builder.files["packages/email/src/index.ts"]).toContain(
      "sendWelcomeEmail",
    );
    expect(builder.files["packages/email/README.md"]).toContain("React Email");
    expect(builder.files["packages/email/README.md"]).toContain("Resend");
    expect(builder.files["packages/email/README.md"]).toContain("email:dev");
    expect(builder.files["README.md"]).toContain("@packages/email");
    expect(builder.files["README.md"]).toContain("not mounted automatically");
  });
});
