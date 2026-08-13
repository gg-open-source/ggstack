import { defineConfig } from "vitepress";

export default defineConfig({
  title: "ggstack",
  description:
    "CLI that scaffolds a pnpm + Turborepo monorepo in the T3/Turbo style.",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "CLI", link: "/guide/cli" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "CLI", link: "/guide/cli" },
          { text: "Project", link: "/guide/project" },
          { text: "Apps", link: "/guide/apps" },
          { text: "Packages", link: "/guide/packages" },
          { text: "Environment", link: "/guide/environment" },
          { text: "Tooling", link: "/guide/tooling" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/gg-open-source/ggstack" },
    ],
  },
});
