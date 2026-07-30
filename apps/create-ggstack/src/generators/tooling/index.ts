import type {
  ProjectBuilder,
  StackConfig,
  ToolingConfig,
} from "../../types.js";
import { generateEslintTooling } from "./eslint.js";
import { generateOxcTooling } from "./oxc.js";
import { generatePrettierTooling } from "./prettier.js";
import { generateTailwindTooling } from "./tailwind.js";
import { generateTsconfigTooling } from "./tsconfig.js";

export function generateTooling(
  config: StackConfig,
  builder: ProjectBuilder,
  tooling: ToolingConfig,
): void {
  switch (tooling.type) {
    case "tailwind":
      generateTailwindTooling(config, builder);
      break;
    case "oxc":
      generateOxcTooling(config, builder);
      break;
    case "prettier":
      generatePrettierTooling(config, builder);
      break;
    case "eslint":
      generateEslintTooling(config, builder);
      break;
  }
}

export {
  generateEslintTooling,
  generateOxcTooling,
  generatePrettierTooling,
  generateTailwindTooling,
  generateTsconfigTooling,
};
