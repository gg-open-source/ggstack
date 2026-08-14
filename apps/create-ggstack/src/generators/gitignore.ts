import type { AppType, StackConfig, ToolingType } from "../types.js";

export interface GitignoreSection {
  title: string;
  entries: readonly string[];
}

const WORKSPACE_SECTION: GitignoreSection = {
  title: "Workspace",
  entries: [
    "node_modules",
    "dist",
    ".turbo",
    "**/.cache/",
    "*.log",
    ".env",
    ".env.local",
  ],
};

const APP_SECTIONS: Partial<Record<AppType, GitignoreSection>> = {
  next: {
    title: "Next.js",
    entries: [".next", "out"],
  },
  expo: {
    title: "Expo",
    entries: [".expo", "expo-env.d.ts", "web-build"],
  },
  electron: {
    title: "Electron",
    entries: ["release"],
  },
};

const TOOLING_SECTIONS: Partial<Record<ToolingType, GitignoreSection>> = {
  eslint: {
    title: "ESLint",
    entries: [".eslintcache"],
  },
  prettier: {
    title: "Prettier",
    entries: [".prettiercache"],
  },
};

export function getGitignoreSections(config: StackConfig): GitignoreSection[] {
  const sections: GitignoreSection[] = [WORKSPACE_SECTION];
  const seenTitles = new Set<string>([WORKSPACE_SECTION.title]);

  for (const app of config.apps) {
    const section = APP_SECTIONS[app.type];
    if (!section || seenTitles.has(section.title)) {
      continue;
    }
    seenTitles.add(section.title);
    sections.push(section);
  }

  for (const tooling of config.tooling) {
    const section = TOOLING_SECTIONS[tooling.type];
    if (!section || seenTitles.has(section.title)) {
      continue;
    }
    seenTitles.add(section.title);
    sections.push(section);
  }

  return sections.filter((section) => section.entries.length > 0);
}

export function generateGitignore(config: StackConfig): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const section of getGitignoreSections(config)) {
    const entries = section.entries.filter((entry) => {
      if (seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });

    if (entries.length === 0) {
      continue;
    }

    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(`# ${section.title}`, ...entries);
  }

  return `${lines.join("\n")}\n`;
}
