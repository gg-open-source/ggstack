import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ProjectBuilder } from "../types.js";

export async function ensureDirectory(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeProjectFiles(
  targetDir: string,
  builder: ProjectBuilder,
): Promise<void> {
  for (const [relativePath, content] of Object.entries(builder.files)) {
    const fullPath = join(targetDir, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }

  const rootPackagePath = join(targetDir, "package.json");
  await mkdir(dirname(rootPackagePath), { recursive: true });
  await writeFile(
    rootPackagePath,
    JSON.stringify(builder.rootPackageJson, null, 2),
    "utf-8",
  );
}
