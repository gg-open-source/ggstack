import { describe, expect, it } from "vitest";
import { generateGitignore, getGitignoreSections } from "./gitignore.js";
import type { StackConfig } from "../types.js";

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

describe("getGitignoreSections", () => {
  it("always includes the workspace section", () => {
    const sections = getGitignoreSections(createTestConfig());

    expect(sections).toHaveLength(1);
    expect(sections[0]?.title).toBe("Workspace");
    expect(sections[0]?.entries).toEqual([
      "node_modules",
      "dist",
      ".turbo",
      "**/.cache/",
      "*.log",
      ".env",
      ".env.local",
    ]);
  });

  it("adds one section per selected app type that produces artifacts", () => {
    const sections = getGitignoreSections(
      createTestConfig({
        apps: [
          { type: "next", name: "web" },
          { type: "next", name: "admin" },
          { type: "expo", name: "mobile" },
          { type: "vite", name: "marketing" },
        ],
      }),
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Workspace",
      "Next.js",
      "Expo",
    ]);
  });

  it("adds eslint and prettier cache entries when those tools are selected", () => {
    const sections = getGitignoreSections(
      createTestConfig({
        tooling: [{ type: "eslint" }, { type: "prettier" }, { type: "oxc" }],
      }),
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Workspace",
      "ESLint",
      "Prettier",
    ]);
  });
});

describe("generateGitignore", () => {
  it("writes only workspace entries when no apps or tooling are selected", () => {
    expect(generateGitignore(createTestConfig())).toBe(`# Workspace
node_modules
dist
.turbo
**/.cache/
*.log
.env
.env.local
`);
  });

  it("omits stack-specific paths that were not selected", () => {
    const gitignore = generateGitignore(
      createTestConfig({
        apps: [{ type: "vite", name: "vite" }],
        packages: [{ type: "shadcn" }],
        db: { orm: "drizzle" },
        tooling: [{ type: "tailwind" }, { type: "oxc" }],
      }),
    );

    expect(gitignore).not.toContain(".next");
    expect(gitignore).not.toContain("out");
    expect(gitignore).not.toContain(".astro");
    expect(gitignore).not.toContain(".expo");
    expect(gitignore).not.toContain("web-build");
    expect(gitignore).not.toContain("release");
    expect(gitignore).not.toContain(".output");
    expect(gitignore).not.toContain(".tanstack");
    expect(gitignore).not.toContain(".react-router");
    expect(gitignore).not.toContain("\nbuild\n");
    expect(gitignore).not.toContain(".eslintcache");
    expect(gitignore).not.toContain(".prettiercache");
  });

  it("adds next, astro, expo, electron, tanstack start, and react router entries only for those apps", () => {
    const gitignore = generateGitignore(
      createTestConfig({
        apps: [
          { type: "next", name: "web" },
          { type: "astro", name: "site" },
          { type: "expo", name: "mobile" },
          { type: "electron", name: "desktop" },
          { type: "tanstack-start", name: "start" },
          { type: "react-router", name: "rr" },
        ],
      }),
    );

    expect(gitignore).toBe(`# Workspace
node_modules
dist
.turbo
**/.cache/
*.log
.env
.env.local

# Next.js
.next
out

# Astro
.astro

# Expo
.expo
expo-env.d.ts
web-build

# Electron
release

# TanStack Start
.output
.nitro
.tanstack

# React Router
.react-router
build
`);
  });

  it("adds sqlite database files when the dialect is sqlite", () => {
    for (const orm of ["drizzle", "prisma"] as const) {
      const gitignore = generateGitignore(
        createTestConfig({
          packages: [{ type: "db" }],
          db: { orm, dialect: "sqlite" },
        }),
      );

      expect(gitignore).toContain(`# SQLite
*.db
*.db-journal
*.db-wal
*.db-shm
`);
    }
  });

  it("does not add sqlite ignore entries for postgres or mysql drizzle", () => {
    for (const dialect of ["postgresql", "mysql"] as const) {
      const gitignore = generateGitignore(
        createTestConfig({
          packages: [{ type: "db" }],
          db: { orm: "drizzle", dialect },
        }),
      );

      expect(gitignore).not.toContain("# SQLite");
      expect(gitignore).not.toContain("*.db");
    }
  });

  it("adds tool cache files for eslint and prettier", () => {
    const gitignore = generateGitignore(
      createTestConfig({
        tooling: [{ type: "eslint" }, { type: "prettier" }],
      }),
    );

    expect(gitignore).toContain("# ESLint\n.eslintcache");
    expect(gitignore).toContain("# Prettier\n.prettiercache");
  });
});
