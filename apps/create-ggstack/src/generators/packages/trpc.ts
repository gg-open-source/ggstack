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
  const projectName = config.projectName;
  const dbOrm = getDbOrm(config);

  builder.addFile(
    "packages/api/package.json",
    JSON.stringify(getPackageJson(projectName, dbOrm), null, 2),
  );

  builder.addFile(
    "packages/api/tsconfig.json",
    JSON.stringify(
      {
        extends: `@${projectName}/tsconfig/base.json`,
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

  builder.addFile("packages/api/src/trpc.ts", generateTrpc(projectName, dbOrm));
  builder.addFile("packages/api/src/router/hello.ts", generateHelloRouter());
  if (dbOrm) {
    builder.addFile(
      "packages/api/src/router/users.ts",
      generateUsersRouter(projectName, dbOrm),
    );
  }
  builder.addFile("packages/api/src/root.ts", generateRoot(dbOrm));
  builder.addFile("packages/api/src/client.ts", generateClient());
  builder.addFile("packages/api/src/index.ts", generateIndex());
  builder.addFile("packages/api/README.md", generateReadme(projectName, dbOrm));
}

function getPackageJson(
  projectName: string,
  dbOrm: SupportedDbOrm | undefined,
): Record<string, unknown> {
  return {
    name: `@${projectName}/api`,
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
      ...(dbOrm ? { [`@${projectName}/db`]: "workspace:*" } : {}),
    },
    devDependencies: {
      [`@${projectName}/tsconfig`]: "workspace:*",
      typescript: "^5.8.0",
    },
  };
}

function generateTrpc(
  projectName: string,
  dbOrm: SupportedDbOrm | undefined,
): string {
  if (dbOrm === "drizzle") {
    return `import { initTRPC } from "@trpc/server";
import { db } from "@${projectName}/db";

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
import { prisma } from "@${projectName}/db";

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

function generateUsersRouter(
  projectName: string,
  dbOrm: SupportedDbOrm,
): string {
  if (dbOrm === "drizzle") {
    return `import { schema } from "@${projectName}/db";
import { publicProcedure, router } from "../trpc";

export const usersRouter = router({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.select().from(schema.users);
  }),
});
`;
  }

  return `import { publicProcedure, router } from "../trpc";

export const usersRouter = router({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findMany();
  }),
});
`;
}

function generateRoot(dbOrm: SupportedDbOrm | undefined): string {
  if (dbOrm) {
    return `import { createCallerFactory, router } from "./trpc";
import { helloRouter } from "./router/hello";
import { usersRouter } from "./router/users";

export const appRouter = router({
  hello: helloRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
`;
  }

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

function generateReadme(
  projectName: string,
  dbOrm: SupportedDbOrm | undefined,
): string {
  const dbSection = dbOrm
    ? `When a database ORM is selected, context includes \`${dbOrm === "prisma" ? "prisma" : "db"}\` and \`users.list\` queries the starter \`User\` table.

`
    : "";

  return `# @${projectName}/api

Shared tRPC router and client for the monorepo.

## Usage

Call procedures from a server (no HTTP) with \`createCaller\`:

\`\`\`ts
import { createCaller, createTRPCContext } from "@${projectName}/api";

const caller = createCaller(await createTRPCContext());
const { greeting } = await caller.hello.greet({ name: "Ada" });
\`\`\`

Or from any app with the vanilla client:

\`\`\`ts
import { createApiClient } from "@${projectName}/api/client";

const api = createApiClient("http://localhost:3000/api/trpc");
const { greeting } = await api.hello.greet.query({ name: "Ada" });
\`\`\`

React Query stays in the app. Type-only import the router:

\`\`\`ts
import type { AppRouter } from "@${projectName}/api";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();
\`\`\`

${dbSection}## Mount it yourself

App templates do not mount this package. Add a host after scaffold.

### Next.js App Router

\`\`\`ts
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@${projectName}/api";

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
import { appRouter, createTRPCContext } from "@${projectName}/api";

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
import { appRouter, createTRPCContext } from "@${projectName}/api";

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
