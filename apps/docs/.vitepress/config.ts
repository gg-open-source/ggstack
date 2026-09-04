import { defineConfig } from "vitepress";
import llmstxt, {
  copyOrDownloadAsMarkdownButtons,
} from "vitepress-plugin-llms";

const stackCodec = new URL("../../create-ggstack/src/stack.ts", import.meta.url)
  .pathname;

const llmsDescription =
  "Interactive CLI (`create-ggstack`) that scaffolds a pnpm + Turborepo monorepo in the T3/Turbo style. Pick Vite, Next.js, Astro, Expo Router, Electron, Express, Fastify, TanStack Start, and/or React Router, then optionally add shadcn/ui, tRPC, Better Auth / Clerk / WorkOS, Stripe / Polar / Autumn, Resend + React Email, and Drizzle or Prisma (PostgreSQL, MySQL, or SQLite). Every project gets a typed `packages/env` and a root `.env.example`.";

const llmsDetails = `create-ggstack is the published npm package. This repository contains the CLI source and these docs. It is not a generated app.

Requirements: Node.js >= 22 and pnpm. The generated workspace is always a pnpm monorepo (\`apps/*\`, \`packages/*\`, \`tooling/*\`) even if you pass \`--npm\`, \`--yarn\`, or \`--bun\`. Those flags only change which package manager runs official app CLIs during scaffold.

Always written: \`packages/env\` (\`@t3-oss/env-core\` + Zod), \`tooling/tsconfig\`, and a root \`.env.example\`.

Never auto-wired into app templates: auth, database, tRPC, payments, or email. Import those packages in the app yourself after scaffold. Expo has no \`dev\` script, so it does not join root \`pnpm dev\`.

\`\`\`bash
pnpm create ggstack@latest my-app --stack g1e30
cd my-app
cp .env.example .env
pnpm install
pnpm dev
\`\`\`

\`--stack\` codes from \`/create\` pack the full config and skip every prompt. Inspect a code with \`create-ggstack --decode <code>\`. Prefer the Markdown sources linked below over HTML docs pages. Each guide also has a \`.md\` URL next to its HTML page.`;

export default defineConfig({
  title: "ggstack",
  description:
    "CLI that scaffolds a pnpm + Turborepo monorepo in the T3/Turbo style.",
  vite: {
    resolve: {
      alias: {
        "create-ggstack/stack": stackCodec,
      },
    },
    plugins: [
      llmstxt({
        title: "ggstack",
        description: llmsDescription,
        details: llmsDetails,
        customLLMsTxtTemplate: [
          "# {title}",
          "",
          "{description}",
          "",
          "{details}",
          "",
          "## Docs",
          "",
          "{toc}",
          "",
          "## Optional",
          "",
          "- [Full documentation](/llms-full.txt): All guide pages in one file. Use when you need the whole manual in one fetch.",
          "- [GitHub repository](https://github.com/gg-open-source/ggstack): CLI source, templates, and this docs site. MIT licensed.",
          "- [npm: create-ggstack](https://www.npmjs.com/package/create-ggstack): Published CLI.",
          "- [CLI source](https://github.com/gg-open-source/ggstack/tree/main/apps/create-ggstack/src): Prompts, generators, and choice lists.",
          "- [App templates](https://github.com/gg-open-source/ggstack/tree/main/apps/create-ggstack/templates): Static files copied into generated apps.",
        ].join("\n"),
      }),
    ],
  },
  markdown: {
    config(md) {
      md.use(copyOrDownloadAsMarkdownButtons);
    },
  },
  transformHead({ pageData }) {
    const head: [string, Record<string, string>][] = [
      ["link", { rel: "describedby", href: "/llms.txt" }],
    ];
    if (pageData.relativePath !== "index.md") {
      head.push([
        "link",
        {
          rel: "alternate",
          type: "text/markdown",
          href: `/${pageData.relativePath}`,
        },
      ]);
    }
    return head;
  },
  themeConfig: {
    nav: [
      { text: "Create", link: "/create" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "CLI", link: "/guide/cli" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Create", link: "/create" },
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
