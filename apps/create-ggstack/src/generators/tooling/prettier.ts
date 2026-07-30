import type { ProjectBuilder, StackConfig } from "../../types.js";

export function generatePrettierTooling(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;

  builder.addFile(
    "tooling/prettier/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/prettier`,
        version: "0.0.0",
        private: true,
        files: [".prettierrc.json"],
        scripts: {
          build: ":",
        },
        devDependencies: {
          prettier: "^3.3.0",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "tooling/prettier/.prettierrc.json",
    JSON.stringify(
      {
        semi: true,
        singleQuote: false,
        trailingComma: "all",
        tabWidth: 2,
      },
      null,
      2,
    ),
  );

  builder.addCommand({
    command: config.packageManager,
    args: ["add", "-D", "prettier"],
    cwd: config.targetDir,
    description: "Install Prettier (manual wiring still required)",
  });
}
