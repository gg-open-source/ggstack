import type {
  PackageConfig,
  ProjectBuilder,
  StackConfig,
} from "../../types.js";
import { generateShadcnPackage } from "./shadcn.js";

export function generatePackage(
  config: StackConfig,
  builder: ProjectBuilder,
  pkg: PackageConfig,
): void {
  if (pkg.type === "shadcn") {
    generateShadcnPackage(config, builder);
  }
}

export { generateShadcnPackage };
