import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectConfig,
  getProjectNameArg,
  isPackageManagerInstalled,
  parsePackageManagerFlag,
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
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.packages).toEqual([{ type: "shadcn" }]);
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
    mockedText.mockResolvedValueOnce("docs"); // next app name
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.apps).toEqual([
      { type: "vite", name: "vite" },
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
      "expo",
      "electron",
    ]); // apps
    mockedText.mockResolvedValueOnce(""); // vite default
    mockedText.mockResolvedValueOnce(""); // next default
    mockedText.mockResolvedValueOnce(""); // expo default
    mockedText.mockResolvedValueOnce(""); // electron default
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    await collectConfig([]);

    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the vite app?",
        defaultValue: "vite",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the next app?",
        defaultValue: "next",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the expo app?",
        defaultValue: "expo",
      }),
    );
    expect(mockedText).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name for the electron app?",
        defaultValue: "electron",
      }),
    );
  });

  it("supports all four app types", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);
    const mockedSelect = vi.mocked(prompts.select);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([
      "vite",
      "next",
      "expo",
      "electron",
    ]); // apps
    mockedText.mockResolvedValueOnce("vite"); // vite
    mockedText.mockResolvedValueOnce("docs"); // next
    mockedText.mockResolvedValueOnce("expo"); // expo
    mockedText.mockResolvedValueOnce("desktop"); // electron
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling
    mockedSelect.mockResolvedValueOnce("none"); // auth
    mockedSelect.mockResolvedValueOnce("none"); // db orm

    const config = await collectConfig([]);

    expect(config.apps).toEqual([
      { type: "vite", name: "vite" },
      { type: "next", name: "docs" },
      { type: "expo", name: "expo" },
      { type: "electron", name: "desktop" },
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

    const config = await collectConfig([]);

    expect(config.db).toEqual({ orm: "drizzle" });
    expect(config.packages).toContainEqual({ type: "db" });
  });
});
