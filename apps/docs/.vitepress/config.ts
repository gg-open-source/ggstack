import { defineConfig } from "vitepress";

export default defineConfig({
  title: "ggstack",
  description: "CLI for creating monorepos",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [{ text: "Getting Started", link: "/guide" }],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com" }],
  },
});
