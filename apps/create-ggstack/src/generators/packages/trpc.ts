import type { ProjectBuilder, StackConfig } from "../../types.js";

type SupportedDbOrm = "drizzle" | "prisma";

function getDbOrm(config: StackConfig): SupportedDbOrm | undefined {
  if (config.db.orm === "drizzle" || config.db.orm === "prisma") {
    return config.db.orm;
  }
  return undefined;
}

export function generateTrpcPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const dbOrm = getDbOrm(config);

  builder.addFile(
    "packages/api/package.json",
    JSON.stringify(getPackageJson(dbOrm), null, 2),
  );

  builder.addFile(
    "packages/api/tsconfig.json",
    JSON.stringify(
      {
        extends: "@tooling/tsconfig/base.json",
        compilerOptions: {
          outDir: "dist",
          rootDir: "src",
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );

  builder.addFile("packages/api/src/trpc.ts", generateTrpc(dbOrm));
  builder.addFile("packages/api/src/router/hello.ts", generateHelloRouter());
  builder.addFile("packages/api/src/root.ts", generateRoot());
  builder.addFile("packages/api/src/client.ts", generateClient());
  builder.addFile("packages/api/src/index.ts", generateIndex());
  builder.addFile("packages/api/README.md", generateReadme(dbOrm));
}

function getPackageJson(
  dbOrm: SupportedDbOrm | undefined,
): Record<string, unknown> {
  return {
    name: "@packages/api",
    version: "0.0.0",
    private: true,
    type: "module",
    main: "./src/index.ts",
    types: "./src/index.ts",
    exports: {
      ".": "./src/index.ts",
      "./client": "./src/client.ts",
    },
    scripts: {
      build: ":",
      lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
      format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
      "check-types": "tsc --noEmit",
    },
    dependencies: {
      "@trpc/client": "^11.0.0",
      "@trpc/server": "^11.0.0",
      zod: "^3.24.0",
      ...(dbOrm ? { "@packages/db": "workspace:*" } : {}),
    },
    devDependencies: {
      "@tooling/tsconfig": "workspace:*",
      typescript: "^5.8.0",
    },
  };
}

function generateTrpc(dbOrm: SupportedDbOrm | undefined): string {
  if (dbOrm === "drizzle") {
    return `import { initTRPC } from "@trpc/server";
import { db } from "@packages/db";

export async function createTRPCContext() {
  return { db };
}

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
`;
  }

  if (dbOrm === "prisma") {
    return `import { initTRPC } from "@trpc/server";
import { prisma } from "@packages/db";

export async function createTRPCContext() {
  return { prisma };
}

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
`;
  }

  return `import { initTRPC } from "@trpc/server";

export async function createTRPCContext() {
  return {};
}

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
`;
}

function generateHelloRouter(): string {
  return `import { z } from "zod";
import { publicProcedure, router } from "../trpc";

export const helloRouter = router({
  greet: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => ({
      greeting: \`Hello \${input.name ?? "world"}\`,
    })),
});
`;
}

function generateRoot(): string {
  return `import { createCallerFactory, router } from "./trpc";
import { helloRouter } from "./router/hello";

export const appRouter = router({
  hello: helloRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
`;
}

function generateClient(): string {
  return `import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./root";

export function createApiClient(url: string) {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url })],
  });
}
`;
}

function generateIndex(): string {
  return `export { appRouter, createCaller, type AppRouter } from "./root";
export { createTRPCContext } from "./trpc";
`;
}

function generateReadme(dbOrm: SupportedDbOrm | undefined): string {
  const dbSection = dbOrm
    ? `When a database ORM is selected, context includes \`${dbOrm === "prisma" ? "prisma" : "db"}\`. Add procedures after you define your own schema.

`
    : "";

  return `# @packages/api

Shared tRPC router and client for the monorepo.

## Usage

Call procedures from a server (no HTTP) with \`createCaller\`:

\`\`\`ts
import { createCaller, createTRPCContext } from "@packages/api";

const caller = createCaller(await createTRPCContext());
const { greeting } = await caller.hello.greet({ name: "Ada" });
\`\`\`

Or from any app with the vanilla client:

\`\`\`ts
import { createApiClient } from "@packages/api/client";

const api = createApiClient("http://localhost:3000/api/trpc");
const { greeting } = await api.hello.greet.query({ name: "Ada" });
\`\`\`

React Query stays in the app. Type-only import the router:

\`\`\`ts
import type { AppRouter } from "@packages/api";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();
\`\`\`

${dbSection}## Mount it yourself

App templates do not mount this package. Add a host after scaffold.

### Next.js App Router

\`\`\`ts
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@packages/api";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
\`\`\`

### Express

\`\`\`ts
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createTRPCContext } from "@packages/api";

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
  }),
);
\`\`\`

### Fastify

\`\`\`ts
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter, createTRPCContext } from "@packages/api";

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: createTRPCContext,
  },
});
\`\`\`
`;
}
