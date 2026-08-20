import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectConfig,
  getProjectNameArg,
  isPackageManagerInstalled,
  parsePackageManagerFlag,
  parsePresetFlag,
  sanitizeAppName,
  warnAboutPnpmWorkspace,
} from "./cli.js";
import * as prompts from "./utils/prompts.js";

vi.mock("./utils/prompts.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./utils/prompts.js")>();
  return {
    ...mod,
    text: vi.fn(),
    select: vi.fn(),
    multiSelect: vi.fn(),
    confirm: vi.fn(),
    intro: vi.fn(),
    outro: vi.fn(),
    log: vi.fn(),
  };
});

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

import { execa } from "execa";

describe("CLI argument parsing", () => {
  describe("parsePackageManagerFlag", () => {
    it("returns pnpm when --pnpm is passed", () => {
      expect(parsePackageManagerFlag(["--pnpm"])).toBe("pnpm");
    });

    it("returns npm when --npm is passed", () => {
      expect(parsePackageManagerFlag(["--npm"])).toBe("npm");
    });

    it("returns yarn when --yarn is passed", () => {
      expect(parsePackageManagerFlag(["--yarn"])).toBe("yarn");
    });

    it("returns bun when --bun is passed", () => {
      expect(parsePackageManagerFlag(["--bun"])).toBe("bun");
    });

    it("returns undefined when no package manager flag is passed", () => {
      expect(parsePackageManagerFlag(["my-app"])).toBeUndefined();
    });
  });

  describe("getProjectNameArg", () => {
    it("returns the first non-flag argument", () => {
      expect(getProjectNameArg(["my-app", "--pnpm"])).toBe("my-app");
    });

    it("returns undefined when only flags are passed", () => {
      expect(getProjectNameArg(["--pnpm", "--yarn"])).toBeUndefined();
    });

    it("skips the --preset value when finding the project name", () => {
      expect(getProjectNameArg(["--preset", "b2D0vQ7G4", "my-app"])).toBe(
        "my-app",
      );
      expect(getProjectNameArg(["my-app", "--preset", "nova"])).toBe("my-app");
      expect(getProjectNameArg(["--preset=nova", "my-app"])).toBe("my-app");
    });
  });

  describe("parsePresetFlag", () => {
    it("returns none when --preset is not passed", () => {
      expect(parsePresetFlag(["my-app", "--pnpm"])).toEqual({ kind: "none" });
    });

    it("reads --preset <code>", () => {
      expect(parsePresetFlag(["--preset", "b2D0vQ7G4"])).toEqual({
        kind: "value",
        value: "b2D0vQ7G4",
      });
    });

    it("reads --preset=<code>", () => {
      expect(parsePresetFlag(["--preset=luma"])).toEqual({
        kind: "value",
        value: "luma",
      });
    });

    it("errors when --preset has no value", () => {
      expect(parsePresetFlag(["--preset"])).toEqual({
        kind: "error",
        message: expect.stringContaining("requires a code"),
      });
      expect(parsePresetFlag(["--preset", "--pnpm"])).toEqual({
        kind: "error",
        message: expect.stringContaining("requires a code"),
      });
    });

    it("errors when --preset is invalid", () => {
      expect(parsePresetFlag(["--preset", "not a code!"])).toEqual({
        kind: "error",
        message: expect.stringContaining("Invalid --preset"),
      });
      expect(parsePresetFlag(["--preset="])).toEqual({
        kind: "error",
        message: expect.stringContaining("Invalid --preset"),
      });
    });
  });

  describe("sanitizeAppName", () => {
    it("lowercases and replaces spaces with hyphens", () => {
      expect(sanitizeAppName("My Cool App")).toBe("my-cool-app");
    });

    it("removes special characters", () => {
      expect(sanitizeAppName("app@123!")).toBe("app123");
    });

    it("trims leading and trailing hyphens", () => {
      expect(sanitizeAppName("---my-app---")).toBe("my-app");
    });
  });

  describe("isPackageManagerInstalled", () => {
    it("returns true when the package manager responds to --version", async () => {
      vi.mocked(execa).mockResolvedValueOnce({ stdout: "9.0.0" } as never);
      expect(await isPackageManagerInstalled("pnpm")).toBe(true);
    });

    it("returns false when the package manager command fails", async () => {
      vi.mocked(execa).mockRejectedValueOnce(new Error("not found"));
      expect(await isPackageManagerInstalled("bun")).toBe(false);
    });
  });

  describe("warnAboutPnpmWorkspace", () => {
    it("does nothing when pnpm is selected", () => {
      const mockedLog = vi.mocked(prompts.log);
      warnAboutPnpmWorkspace("pnpm");
      expect(mockedLog).not.toHaveBeenCalled();
    });

    it("logs a warning when a non-pnpm package manager is selected", () => {
      const mockedLog = vi.mocked(prompts.log);
      warnAboutPnpmWorkspace("npm");
      expect(mockedLog).toHaveBeenCalledWith(
        expect.stringContaining("pnpm workspaces"),
      );
    });
  });
});

describe("collectConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(execa).mockResolvedValue({ stdout: "1.0.0" } as never);
  });

  it("auto-selects tailwind when shadcn is chosen", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce(["shadcn"]); // packages
    mockedSelect.mockResolvedValueOnce("base"); // shadcn base
    vi.mocked(prompts.confirm).mockResolvedValueOnce(false); // no preset
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "nova", base: "base" } },
    ]);
    expect(config.tooling).toContainEqual({ type: "tailwind" });
  });

  it("does not auto-select tailwind when shadcn is not chosen", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce(["oxc"]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.packages).toEqual([]);
    expect(config.tooling).toEqual([{ type: "oxc" }]);
  });

  it("collects app names from prompts", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce(["vite", "next"]); // apps
    mockedText.mockResolvedValueOnce("vite"); // vite app name
    mockedSelect.mockResolvedValueOnce("vanilla"); // vite framework
    mockedText.mockResolvedValueOnce("docs"); // next app name
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.apps).toEqual([
      {
        type: "vite",
        name: "vite",
        vite: { framework: "vanilla", variant: "ts" },
      },
      { type: "next", name: "docs" },
    ]);
  });

  it("uses default app names matching the selected framework", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([
      "vite",
      "next",
      "astro",
      "expo",
      "electron",
      "express",
      "fastify",
      "tanstack-start",
      "react-router",
    ]); // apps
    mockedText.mockResolvedValueOnce(""); // vite default
    mockedSelect.mockResolvedValueOnce("vanilla"); // vite framework
    mockedText.mockResolvedValueOnce(""); // next default
    mockedText.mockResolvedValueOnce(""); // astro default
    mockedText.mockResolvedValueOnce(""); // expo default
    mockedText.mockResolvedValueOnce(""); // electron default
    mockedText.mockResolvedValueOnce(""); // express default
    mockedText.mockResolvedValueOnce(""); // fastify default
    mockedText.mockResolvedValueOnce(""); // tanstack-start default
    mockedText.mockResolvedValueOnce(""); // react-router default
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    await collectConfig([]);

    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the vite app?",
        placeholder: "vite",
        defaultValue: "vite",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the next app?",
        placeholder: "next",
        defaultValue: "next",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the astro app?",
        placeholder: "astro",
        defaultValue: "astro",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the expo app?",
        placeholder: "expo",
        defaultValue: "expo",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the electron app?",
        placeholder: "electron",
        defaultValue: "electron",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the express app?",
        placeholder: "express",
        defaultValue: "express",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the fastify app?",
        placeholder: "fastify",
        defaultValue: "fastify",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the tanstack-start app?",
        placeholder: "tanstack-start",
        defaultValue: "tanstack-start",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the react-router app?",
        placeholder: "react-router",
        defaultValue: "react-router",
      }),
    );
  });

  it("shows the project name default as a placeholder", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("project");
    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    await collectConfig([]);

    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Project name?",
        placeholder: "project",
        defaultValue: "project",
      }),
    );
  });

  it("supports all nine app types", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([
      "vite",
      "next",
      "astro",
      "expo",
      "electron",
      "express",
      "fastify",
      "tanstack-start",
      "react-router",
    ]); // apps
    mockedText.mockResolvedValueOnce("vite"); // vite
    mockedSelect.mockResolvedValueOnce("vanilla"); // vite framework
    mockedText.mockResolvedValueOnce("docs"); // next
    mockedText.mockResolvedValueOnce("site"); // astro
    mockedText.mockResolvedValueOnce("expo"); // expo
    mockedText.mockResolvedValueOnce("desktop"); // electron
    mockedText.mockResolvedValueOnce("api"); // express
    mockedText.mockResolvedValueOnce("gateway"); // fastify
    mockedText.mockResolvedValueOnce("start"); // tanstack-start
    mockedText.mockResolvedValueOnce("web"); // react-router
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.apps).toEqual([
      {
        type: "vite",
        name: "vite",
        vite: { framework: "vanilla", variant: "ts" },
      },
      { type: "next", name: "docs" },
      { type: "astro", name: "site" },
      { type: "expo", name: "expo" },
      { type: "electron", name: "desktop" },
      { type: "express", name: "api" },
      { type: "fastify", name: "gateway" },
      { type: "tanstack-start", name: "start" },
      { type: "react-router", name: "web" },
    ]);
  });

  it("uses the positional project name as a fallback", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig(["my-app", "--pnpm"]);

    expect(mockedText).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project name?" }),
    );
    expect(config.projectName).toBe("my-app");
  });

  it("collects the selected auth provider", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("clerk"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.auth).toEqual({ provider: "clerk" });
  });

  it("collects the trpc package when selected", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce(["trpc"]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(config.packages).toEqual([{ type: "trpc" }]);
  });

  it("collects shadcn and trpc together", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce(["shadcn", "trpc"]);
    mockedSelect.mockResolvedValueOnce("base");
    vi.mocked(prompts.confirm).mockResolvedValueOnce(false);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(config.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "nova", base: "base" } },
      { type: "trpc" },
    ]);
    expect(config.tooling).toContainEqual({ type: "tailwind" });
  });

  it("asks for a preset code when the user wants a preset", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);
    const mockedConfirm = vi.mocked(prompts.confirm);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce(["shadcn"]);
    mockedSelect.mockResolvedValueOnce("radix");
    mockedConfirm.mockResolvedValueOnce(true);
    mockedText.mockResolvedValueOnce("luma");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(mockedConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Do you want to use a shadcn preset?",
        initialValue: false,
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Enter your shadcn preset code (from ui.shadcn.com/create)",
      }),
    );
    expect(config.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "luma", base: "radix" } },
    ]);
  });

  it("uses the default shadcn config when the user does not want a preset", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);
    const mockedConfirm = vi.mocked(prompts.confirm);
    const mockedLog = vi.mocked(prompts.log);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce(["shadcn"]);
    mockedSelect.mockResolvedValueOnce("aria");
    mockedConfirm.mockResolvedValueOnce(false);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(mockedText).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Enter your shadcn preset code (from ui.shadcn.com/create)",
      }),
    );
    expect(mockedLog).toHaveBeenCalledWith(
      expect.stringContaining("default shadcn config"),
    );
    expect(config.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "nova", base: "aria" } },
    ]);
  });

  it("collects a custom shadcn preset code when the user wants a preset", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);
    const mockedConfirm = vi.mocked(prompts.confirm);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce(["shadcn"]);
    mockedSelect.mockResolvedValueOnce("base");
    mockedConfirm.mockResolvedValueOnce(true);
    mockedText.mockResolvedValueOnce("b2D0vQ7G4");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(config.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "b2D0vQ7G4", base: "base" } },
    ]);
  });

  it("uses --preset and skips the preset prompt", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce(["shadcn"]);
    mockedSelect.mockResolvedValueOnce("base");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig(["--preset", "b2D0vQ7G4"]);

    expect(vi.mocked(prompts.confirm)).not.toHaveBeenCalled();
    expect(mockedText).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Enter your shadcn preset code (from ui.shadcn.com/create)",
      }),
    );
    expect(config.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "b2D0vQ7G4", base: "base" } },
    ]);
  });

  it("adds shadcn when --preset is passed even if it was not selected", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("radix");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig(["--preset=luma"]);

    expect(mockedMultiSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which packages do you want to add?",
        initialValues: ["shadcn"],
      }),
    );
    expect(config.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "luma", base: "radix" } },
    ]);
    expect(config.tooling).toContainEqual({ type: "tailwind" });
  });

  it("does not prompt for shadcn options when shadcn is not selected", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    await collectConfig([]);

    expect(mockedSelect).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which shadcn component base?",
      }),
    );
    expect(vi.mocked(prompts.confirm)).not.toHaveBeenCalled();
  });

  it("does not add db package when db orm is none", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.db).toEqual({ orm: "none" });
    expect(config.packages).not.toContainEqual({ type: "db" });
  });

  it("adds db package when drizzle is selected", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("drizzle"); // db orm
    mockedSelect.mockResolvedValueOnce("postgresql"); // db dialect

    const config = await collectConfig([]);

    expect(config.db).toEqual({ orm: "drizzle", dialect: "postgresql" });
    expect(config.packages).toContainEqual({ type: "db" });
    expect(mockedSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which database do you want to use?",
      }),
    );
  });

  it("stores the selected drizzle dialect", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("drizzle");
    mockedSelect.mockResolvedValueOnce("mysql");

    const config = await collectConfig([]);

    expect(config.db).toEqual({ orm: "drizzle", dialect: "mysql" });
  });

  it("prompts for a database dialect when prisma is selected", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("prisma");
    mockedSelect.mockResolvedValueOnce("postgresql");

    const config = await collectConfig([]);

    expect(config.db).toEqual({ orm: "prisma", dialect: "postgresql" });
    expect(config.packages).toContainEqual({ type: "db" });
    expect(mockedSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which database do you want to use?",
      }),
    );
  });

  it("stores the selected prisma dialect", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("prisma");
    mockedSelect.mockResolvedValueOnce("mysql");

    const config = await collectConfig([]);

    expect(config.db).toEqual({ orm: "prisma", dialect: "mysql" });
  });

  it("does not prompt for a database dialect when the orm is none", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    await collectConfig([]);

    expect(mockedSelect).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which database do you want to use?",
      }),
    );
  });

  it("prompts for a vite framework and stores it on the app", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce(["vite"]);
    mockedText.mockResolvedValueOnce("web");
    mockedSelect.mockResolvedValueOnce("vue");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(mockedSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Select a Vite framework?",
      }),
    );
    expect(mockedSelect).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Select a variant?",
      }),
    );
    expect(config.apps).toEqual([
      {
        type: "vite",
        name: "web",
        vite: { framework: "vue", variant: "ts" },
      },
    ]);
  });

  it("prompts for a react variant when the vite framework is react", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce(["vite"]);
    mockedText.mockResolvedValueOnce("web");
    mockedSelect.mockResolvedValueOnce("react");
    mockedSelect.mockResolvedValueOnce("react-compiler");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(mockedSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Select a variant?",
      }),
    );
    expect(config.apps).toEqual([
      {
        type: "vite",
        name: "web",
        vite: { framework: "react", variant: "react-compiler" },
      },
    ]);
  });

  it("stores the typescript react variant without prompting other frameworks", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce(["vite"]);
    mockedText.mockResolvedValueOnce("web");
    mockedSelect.mockResolvedValueOnce("react");
    mockedSelect.mockResolvedValueOnce("ts");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(config.apps).toEqual([
      {
        type: "vite",
        name: "web",
        vite: { framework: "react", variant: "ts" },
      },
    ]);
  });

  it("does not add vite options to non-vite apps", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce(["next"]);
    mockedText.mockResolvedValueOnce("docs");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(mockedSelect).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Select a Vite framework?",
      }),
    );
    expect(config.apps).toEqual([{ type: "next", name: "docs" }]);
  });

  it("does not add vite options to astro apps", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project");
    mockedMultiSelect.mockResolvedValueOnce(["astro"]);
    mockedText.mockResolvedValueOnce("site");
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedMultiSelect.mockResolvedValueOnce([]);
    mockedSelect.mockResolvedValueOnce("none");
    mockedSelect.mockResolvedValueOnce("none");

    const config = await collectConfig([]);

    expect(mockedSelect).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Select a Vite framework?",
      }),
    );
    expect(config.apps).toEqual([{ type: "astro", name: "site" }]);
  });
});
