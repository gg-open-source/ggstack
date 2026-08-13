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
});
