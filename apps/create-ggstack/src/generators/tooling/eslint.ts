import type { ProjectBuilder, StackConfig } from "../../types.js";

export function generateEslintTooling(
  _config: StackConfig,
  builder: ProjectBuilder,
): void {
  builder.addFile(
    "tooling/eslint/package.json",
    JSON.stringify(
      {
        name: "@tooling/eslint",
        version: "0.0.0",
        private: true,
        files: ["eslint.config.js"],
        scripts: {
          build: ":",
        },
        devDependencies: {
          eslint: "^9.0.0",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "tooling/eslint/eslint.config.js",
    `// ESLint flat config stub. Customize to your needs.
export default [
  {
    ignores: ["node_modules/**", "dist/**", ".next/**"],
  },
];
`,
  );

  builder.rootPackageJson.devDependencies = {
    ...builder.rootPackageJson.devDependencies,
    eslint: "^9.0.0",
  };
}
