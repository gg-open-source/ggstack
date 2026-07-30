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

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce(["shadcn"]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling

    const config = await collectConfig([]);

    expect(config.packages).toEqual([{ type: "shadcn" }]);
    expect(config.tooling).toContainEqual({ type: "tailwind" });
  });

  it("does not auto-select tailwind when shadcn is not chosen", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce([]); // apps
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce(["oxc"]); // tooling

    const config = await collectConfig([]);

    expect(config.packages).toEqual([]);
    expect(config.tooling).toEqual([{ type: "oxc" }]);
  });

  it("collects app names from prompts", async () => {
    const mockedText = vi.mocked(prompts.text);
    const mockedMultiSelect = vi.mocked(prompts.multiSelect);

    mockedText.mockResolvedValueOnce("test-project"); // project name
    mockedMultiSelect.mockResolvedValueOnce(["vite", "next"]); // apps
    mockedText.mockResolvedValueOnce("web"); // vite app name
    mockedText.mockResolvedValueOnce("docs"); // next app name
    mockedMultiSelect.mockResolvedValueOnce([]); // packages
    mockedMultiSelect.mockResolvedValueOnce([]); // tooling

    const config = await collectConfig([]);

    expect(config.apps).toEqual([
      { type: "vite", name: "web" },
      { type: "next", name: "docs" },
    ]);
  });
});
