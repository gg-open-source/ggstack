import type { ProjectBuilder, StackConfig } from "../../types.js";

export function generateOxcTooling(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;

  builder.addFile(
    "tooling/oxc/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/oxc`,
        version: "0.0.0",
        private: true,
        files: ["oxlint.json", "oxfmt.json"],
        scripts: {
          build: ":",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "tooling/oxc/oxlint.json",
    JSON.stringify(
      {
        $schema:
          "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
        rules: {
          "typescript/no-explicit-any": "error",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "tooling/oxc/oxfmt.json",
    JSON.stringify(
      {
        indent: "space",
        indentWidth: 2,
        semicolons: "always",
        quote: "double",
        trailingCommas: "all",
      },
      null,
      2,
    ),
  );

  builder.rootPackageJson.scripts = {
    ...builder.rootPackageJson.scripts,
    lint: `oxlint --config tooling/oxc/oxlint.json .`,
    format: `oxfmt --config tooling/oxc/oxfmt.json .`,
  };

  builder.rootPackageJson.devDependencies = {
    ...builder.rootPackageJson.devDependencies,
    oxlint: "^0.9.0",
    oxfmt: "^0.9.0",
  };
}
