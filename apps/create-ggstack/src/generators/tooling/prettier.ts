import type { ProjectBuilder, StackConfig } from "../../types.js";

export function generatePrettierTooling(
  _config: StackConfig,
  builder: ProjectBuilder,
): void {
  builder.addFile(
    "tooling/prettier/package.json",
    JSON.stringify(
      {
        name: "@tooling/prettier",
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

  builder.rootPackageJson.devDependencies = {
    ...builder.rootPackageJson.devDependencies,
    prettier: "^3.3.0",
  };
}
