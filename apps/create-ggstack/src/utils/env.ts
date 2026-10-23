import type { PackageJson, ProjectBuilder } from "../types.js";

export function loadRootEnvForScripts(
  builder: ProjectBuilder,
  packageJsonPath: string,
  scriptNames?: string[],
): void {
  const pkg = JSON.parse(builder.files[packageJsonPath]!) as PackageJson;
  const scripts = pkg.scripts ?? {};

  const names =
    scriptNames ??
    Object.keys(scripts).filter((name) => name !== "lint" && name !== "format");

  for (const name of names) {
    const command = scripts[name];
    if (!command || command === ":") continue;

    // Each process in a build chain needs the environment, not just the first.
    scripts[name] = command
      .split(" && ")
      .map((part) => `dotenv -e ../../.env -- ${part}`)
      .join(" && ");
  }

  pkg.dependencies = { ...pkg.dependencies, "dotenv-cli": "^11.0.0" };
  builder.addFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}
