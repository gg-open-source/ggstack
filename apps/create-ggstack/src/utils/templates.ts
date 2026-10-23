import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectBuilder } from "../types.js";

export interface TemplateContext {
  projectName: string;
  appName: string;
}

export function getTemplatesRoot(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  // src/utils/templates.ts -> ../.. -> package root
  return path.resolve(path.dirname(currentFilePath), "..", "..", "templates");
}

export async function listTemplateFiles(
  templateDir: string,
): Promise<string[]> {
  const entries: string[] = [];
  const items = await readdir(templateDir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(templateDir, item.name);
    if (item.isDirectory()) {
      entries.push(...(await listTemplateFiles(fullPath)));
    } else {
      entries.push(fullPath);
    }
  }

  return entries;
}

export function replacePlaceholders(
  content: string,
  context: TemplateContext,
): string {
  return content
    .replace(/\{\{\s*PROJECT_NAME\s*\}\}/g, context.projectName)
    .replace(/\{\{\s*APP_NAME\s*\}\}/g, context.appName);
}

export async function copyTemplate(
  templateName: string,
  targetPrefix: string,
  context: TemplateContext,
  builder: ProjectBuilder,
): Promise<void> {
  const templateRoot = path.join(getTemplatesRoot(), "apps", templateName);
  const templateFiles = await listTemplateFiles(templateRoot);

  for (const filePath of templateFiles) {
    const relativePath = path.relative(templateRoot, filePath);
    const targetPath = path.posix.join(targetPrefix, relativePath);
    const rawContent = await readFile(filePath, "utf-8");
    const content = replacePlaceholders(rawContent, context);
    builder.addFile(targetPath, content);
  }

  // Keep one theme source while making every generated app self-contained.
  const stylesheet = templateFiles.find((file) => file.endsWith(".css"));
  if (stylesheet) {
    const theme = await readFile(
      path.join(getTemplatesRoot(), "shared", "starter.css"),
      "utf-8",
    );
    const cssDir = path.dirname(path.relative(templateRoot, stylesheet));
    builder.addFile(
      path.posix.join(targetPrefix, cssDir, "starter.css"),
      theme,
    );
  }
}

export async function templateExists(templateName: string): Promise<boolean> {
  try {
    const templatePath = path.join(getTemplatesRoot(), "apps", templateName);
    const info = await stat(templatePath);
    return info.isDirectory();
  } catch {
    return false;
  }
}
