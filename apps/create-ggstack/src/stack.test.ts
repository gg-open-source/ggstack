import { describe, expect, it } from "vitest";
import {
  createDefaultStackPreset,
  decodeStack,
  describeStack,
  encodeStack,
  formatCreateCommand,
  formatDecodedStack,
  isStackCode,
  normalizeStackPreset,
  sanitizeAppName,
  STACK_CODE_PREFIX,
  StackCodeError,
  type StackPreset,
} from "./stack.js";

function roundTrip(preset: StackPreset): StackPreset {
  return decodeStack(encodeStack(preset));
}

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

describe("stack codec", () => {
  it("encodes the default preset as a short g1 code", () => {
    const code = encodeStack(createDefaultStackPreset());
    expect(code).toBe("g1e30");
    expect(isStackCode(code)).toBe(true);
    expect(roundTrip(createDefaultStackPreset())).toEqual(
      createDefaultStackPreset(),
    );
  });

  it("encodes a non-default email provider", () => {
    const code = encodeStack({
      ...createDefaultStackPreset(),
      email: { provider: "resend" },
    });

    expect(JSON.parse(atob(code.slice(STACK_CODE_PREFIX.length)))).toEqual({
      em: "resend",
    });
    expect(
      roundTrip({
        ...createDefaultStackPreset(),
        email: { provider: "resend" },
      }),
    ).toEqual({
      ...createDefaultStackPreset(),
      email: { provider: "resend" },
    });
  });

  it("omits default app names, vite vanilla, and default enums", () => {
    const code = encodeStack({
      packageManager: "pnpm",
      apps: [
        {
          type: "vite",
          name: "vite",
          vite: { framework: "vanilla", variant: "ts" },
        },
        { type: "next", name: "next" },
      ],
      packages: [],
      auth: { provider: "none" },
      db: { orm: "none" },
      payments: { provider: "none" },
      email: { provider: "none" },
      tooling: [],
    });

    expect(JSON.parse(atob(code.slice(STACK_CODE_PREFIX.length)))).toEqual({
      a: [{ t: "vite" }, { t: "next" }],
    });
  });

  it("round-trips a full stack including custom names and shadcn codes", () => {
    const preset: StackPreset = {
      packageManager: "bun",
      apps: [
        {
          type: "vite",
          name: "web",
          vite: { framework: "react", variant: "react-compiler" },
        },
        { type: "next", name: "docs" },
        { type: "fastify", name: "api" },
      ],
      packages: [
        { type: "shadcn", shadcn: { preset: "b2D0vQ7G4", base: "radix" } },
        { type: "trpc" },
      ],
      auth: { provider: "better-auth" },
      db: { orm: "drizzle", dialect: "mysql" },
      payments: { provider: "stripe" },
      email: { provider: "resend" },
      tooling: [{ type: "tailwind" }, { type: "oxc" }],
    };

    expect(roundTrip(preset)).toEqual(normalizeStackPreset(preset));
  });

  it("round-trips multiple apps of the same type", () => {
    const preset: StackPreset = {
      ...createDefaultStackPreset(),
      apps: [
        { type: "next", name: "web" },
        { type: "next", name: "docs" },
        {
          type: "vite",
          name: "admin",
          vite: { framework: "react", variant: "ts" },
        },
        {
          type: "vite",
          name: "marketing",
          vite: { framework: "vue", variant: "ts" },
        },
      ],
    };

    expect(roundTrip(preset)).toEqual(normalizeStackPreset(preset));
    expect(roundTrip(preset).apps.map((app) => app.name)).toEqual([
      "admin",
      "marketing",
      "web",
      "docs",
    ]);
  });

  it("adds tailwind when shadcn is selected and db when an ORM is selected", () => {
    const preset = roundTrip({
      packageManager: "pnpm",
      apps: [],
      packages: [{ type: "shadcn", shadcn: { preset: "nova", base: "base" } }],
      auth: { provider: "none" },
      db: { orm: "prisma", dialect: "sqlite" },
      payments: { provider: "none" },
      email: { provider: "none" },
      tooling: [],
    });

    expect(preset.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "nova", base: "base" } },
      { type: "db" },
    ]);
    expect(preset.tooling).toEqual([{ type: "tailwind" }]);
    expect(preset.db).toEqual({ orm: "prisma", dialect: "sqlite" });
  });

  it("enables shadcn when only a custom base or preset is encoded", () => {
    const fromBase = decodeStack(
      STACK_CODE_PREFIX +
        btoa(JSON.stringify({ sb: "aria" })).replace(/=+$/g, ""),
    );
    expect(fromBase.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "nova", base: "aria" } },
    ]);

    const fromPreset = decodeStack(
      STACK_CODE_PREFIX +
        btoa(JSON.stringify({ sp: "luma" })).replace(/=+$/g, ""),
    );
    expect(fromPreset.packages).toEqual([
      { type: "shadcn", shadcn: { preset: "luma", base: "base" } },
    ]);
  });

  it("restores default app names and vite options", () => {
    const preset = decodeStack(
      STACK_CODE_PREFIX +
        btoa(JSON.stringify({ a: [{ t: "vite" }, { t: "expo" }] })).replace(
          /=+$/g,
          "",
        ),
    );

    expect(preset.apps).toEqual([
      {
        type: "vite",
        name: "vite",
        vite: { framework: "vanilla", variant: "ts" },
      },
      { type: "expo", name: "expo" },
    ]);
  });

  it("sorts apps and tooling into a stable order", () => {
    const preset = roundTrip({
      packageManager: "pnpm",
      apps: [
        { type: "express", name: "express" },
        { type: "next", name: "next" },
        {
          type: "vite",
          name: "vite",
          vite: { framework: "vue", variant: "ts" },
        },
      ],
      packages: [],
      auth: { provider: "none" },
      db: { orm: "none" },
      payments: { provider: "none" },
      email: { provider: "none" },
      tooling: [{ type: "eslint" }, { type: "oxc" }, { type: "prettier" }],
    });

    expect(preset.apps.map((app) => app.type)).toEqual([
      "vite",
      "next",
      "express",
    ]);
    expect(preset.tooling.map((item) => item.type)).toEqual([
      "oxc",
      "prettier",
      "eslint",
    ]);
  });

  it("rejects unknown prefixes, bad payloads, and invalid fields", () => {
    expect(() => decodeStack("nova")).toThrow(StackCodeError);
    expect(() => decodeStack("g1$$$")).toThrow(StackCodeError);
    expect(() => decodeStack("g1not-json")).toThrow(StackCodeError);
    expect(() =>
      decodeStack(
        STACK_CODE_PREFIX +
          btoa(JSON.stringify({ au: "auth0" })).replace(/=+$/g, ""),
      ),
    ).toThrow(/auth provider/);
    expect(() =>
      decodeStack(
        STACK_CODE_PREFIX +
          btoa(JSON.stringify({ em: "sendgrid" })).replace(/=+$/g, ""),
      ),
    ).toThrow(/email provider/);
  });

  it("rejects duplicate app names after sanitizing", () => {
    expect(() =>
      encodeStack({
        ...createDefaultStackPreset(),
        apps: [
          { type: "next", name: "web" },
          { type: "astro", name: "Web" },
        ],
      }),
    ).toThrow(/unique/);
  });

  it("formats create commands per package manager", () => {
    expect(formatCreateCommand("My App", "g1e30", "pnpm")).toBe(
      "pnpm create ggstack@latest my-app --stack g1e30",
    );
    expect(formatCreateCommand("My App", "g1e30", "npm")).toBe(
      "npx create-ggstack@latest my-app --stack g1e30",
    );
    expect(formatCreateCommand("My App", "g1e30", "yarn")).toBe(
      "yarn dlx create-ggstack@latest my-app --stack g1e30",
    );
    expect(formatCreateCommand("My App", "g1e30", "bun")).toBe(
      "bunx create-ggstack@latest my-app --stack g1e30",
    );
  });

  it("describes a decoded stack for humans", () => {
    const preset = roundTrip({
      ...createDefaultStackPreset(),
      apps: [{ type: "next", name: "next" }],
      auth: { provider: "clerk" },
    });
    const text = formatDecodedStack(encodeStack(preset), preset);
    expect(text).toContain("Stack");
    expect(text).toContain("clerk");
    expect(text).toContain("next (next)");
    expect(describeStack(preset).some((row) => row.label === "auth")).toBe(
      true,
    );
    expect(describeStack(preset).some((row) => row.label === "email")).toBe(
      true,
    );
  });
});
