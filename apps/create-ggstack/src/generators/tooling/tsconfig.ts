import type { ProjectBuilder, StackConfig } from "../../types.js";

export function generateTsconfigTooling(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;

  builder.addFile(
    "tooling/tsconfig/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/tsconfig`,
        version: "0.0.0",
        private: true,
        main: "base.json",
        files: ["base.json"],
        scripts: {
          build: ":",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "tooling/tsconfig/base.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          lib: ["ES2022"],
          strict: true,
          noUncheckedIndexedAccess: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          esModuleInterop: true,
          isolatedModules: true,
          verbatimModuleSyntax: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    ),
  );
}
