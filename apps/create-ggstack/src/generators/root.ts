import type { ProjectBuilder, StackConfig } from "../types.js";

export function generateRoot(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  builder.setRootPackageJson({
    name: config.projectName,
    private: true,
    type: "module",
    scripts: {
      build: "turbo run build",
      dev: "turbo run dev",
      lint: "turbo run lint",
      format: "turbo run format",
      "check-types": "turbo run check-types",
      test: "turbo run test",
    },
    devDependencies: {
      turbo: "^2.6.0",
      typescript: "^5.8.0",
    },
    ...(config.packageManager === "pnpm"
      ? { packageManager: "pnpm@11.2.2" }
      : {}),
    engines: {
      node: ">=22",
    },
  });

  builder.addFile(
    "pnpm-workspace.yaml",
    `packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
`,
  );

  builder.addFile(
    "turbo.json",
    JSON.stringify(
      {
        $schema: "https://turbo.build/schema.json",
        tasks: {
          build: {
            dependsOn: ["^build"],
            outputs: ["dist/**", ".next/**", "!.next/cache/**"],
          },
          lint: {},
          format: {},
          dev: {
            cache: false,
            persistent: true,
          },
          "check-types": {
            dependsOn: ["^build"],
          },
          test: {},
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    ".gitignore",
    `node_modules
dist
.next
.turbo
**/.cache/
*.log
.env
.env.local
`,
  );

  builder.addFile(
    ".npmrc",
    `engine-strict=true
`,
  );
}
