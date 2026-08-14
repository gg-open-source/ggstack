import { describe, expect, it } from "vitest";
import { ProjectBuilder } from "../types.js";
import { copyTemplate, replacePlaceholders } from "./templates.js";

describe("replacePlaceholders", () => {
  it("replaces project and app name placeholders", () => {
    const result = replacePlaceholders("{{PROJECT_NAME}}/{{APP_NAME}}", {
      projectName: "acme",
      appName: "web",
    });
    expect(result).toBe("acme/web");
  });

  it("replaces placeholders that include whitespace", () => {
    const result = replacePlaceholders("{{ PROJECT_NAME }}/{{ APP_NAME }}", {
      projectName: "acme",
      appName: "web",
    });
    expect(result).toBe("acme/web");
  });
});

describe("copyTemplate", () => {
  it("copies the vite template with placeholders replaced", async () => {
    const builder = new ProjectBuilder();

    await copyTemplate(
      "vite",
      "apps/web",
      { projectName: "acme", appName: "web" },
      builder,
    );

    expect(builder.files["apps/web/package.json"]).toContain("@acme/web");
    expect(builder.files["apps/web/src/main.ts"]).toContain("web");
    expect(builder.files["apps/web/vite.config.ts"]).toBeDefined();
  });

  it.each([
    ["vite-react", "src/App.tsx"],
    ["vite-vue", "src/App.vue"],
    ["vite-preact", "src/App.tsx"],
    ["vite-lit", "src/my-element.ts"],
    ["vite-svelte", "src/App.svelte"],
    ["vite-solid", "src/App.tsx"],
    ["vite-qwik", "src/App.tsx"],
  ] as const)(
    "copies the %s template with placeholders replaced",
    async (templateName, entry) => {
      const builder = new ProjectBuilder();

      await copyTemplate(
        templateName,
        "apps/web",
        { projectName: "acme", appName: "web" },
        builder,
      );

      expect(builder.files["apps/web/package.json"]).toContain("@acme/web");
      expect(builder.files[`apps/web/${entry}`]).toContain("web");
      expect(builder.files["apps/web/vite.config.ts"]).toBeDefined();
    },
  );

  it("copies the tanstack-start template with placeholders replaced", async () => {
    const builder = new ProjectBuilder();

    await copyTemplate(
      "tanstack-start",
      "apps/start",
      { projectName: "acme", appName: "start" },
      builder,
    );

    expect(builder.files["apps/start/package.json"]).toContain("@acme/start");
    expect(builder.files["apps/start/src/routes/index.tsx"]).toContain("start");
    expect(builder.files["apps/start/vite.config.ts"]).toBeDefined();
  });

  it("copies the react-router template with placeholders replaced", async () => {
    const builder = new ProjectBuilder();

    await copyTemplate(
      "react-router",
      "apps/web",
      { projectName: "acme", appName: "web" },
      builder,
    );

    expect(builder.files["apps/web/package.json"]).toContain("@acme/web");
    expect(builder.files["apps/web/app/routes/home.tsx"]).toContain("web");
    expect(builder.files["apps/web/react-router.config.ts"]).toBeDefined();
  });
});
