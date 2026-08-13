import type {
  PackageConfig,
  ProjectBuilder,
  StackConfig,
} from "../../types.js";
import { generateAuthPackage } from "./auth.js";
import { generateDbPackage } from "./db.js";
import { generateEnvPackage } from "./env.js";
import { generateShadcnPackage } from "./shadcn.js";

export function generatePackage(
  config: StackConfig,
  builder: ProjectBuilder,
  pkg: PackageConfig,
): void {
  if (pkg.type === "shadcn") {
    generateShadcnPackage(config, builder);
  }

  if (pkg.type === "auth") {
    generateAuthPackage(config, builder);
  }

  if (pkg.type === "db") {
    generateDbPackage(config, builder);
  }
}

export {
  generateAuthPackage,
  generateDbPackage,
  generateEnvPackage,
  generateShadcnPackage,
};
