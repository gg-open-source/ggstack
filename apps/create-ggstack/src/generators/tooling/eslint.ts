import type { ProjectBuilder, StackConfig } from "../../types.js";

export function generateEslintTooling(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;

  builder.addFile(
    "tooling/eslint/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/eslint`,
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

  builder.addCommand({
    command: config.packageManager,
    args: ["add", "-D", "eslint"],
    cwd: config.targetDir,
    description: "Install ESLint (manual wiring still required)",
  });
}
