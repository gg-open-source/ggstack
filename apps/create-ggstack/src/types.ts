export interface AppConfig {
  type: "vite" | "next";
  name: string;
}

export interface PackageConfig {
  type: "shadcn";
}

export type ToolingType = "tailwind" | "oxc" | "prettier" | "eslint";

export interface ToolingConfig {
  type: ToolingType;
}

export interface StackConfig {
  projectName: string;
  targetDir: string;
  packageManager: PackageManager;
  apps: AppConfig[];
  packages: PackageConfig[];
  tooling: ToolingConfig[];
}

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  type?: "module" | "commonjs";
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
  [key: string]: unknown;
}

export interface ProjectCommand {
  command: string;
  args: string[];
  cwd?: string;
  description?: string;
}

export class ProjectBuilder {
  files: Record<string, string> = {};
  commands: ProjectCommand[] = [];
  rootPackageJson: PackageJson = {};

  addFile(relativePath: string, content: string): void {
    this.files[relativePath] = content;
  }

  addCommand(command: ProjectCommand): void {
    this.commands.push(command);
  }

  setRootPackageJson(pkg: PackageJson): void {
    this.rootPackageJson = pkg;
  }
}
