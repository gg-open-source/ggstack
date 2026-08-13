import type { ProjectBuilder, StackConfig } from "../../types.js";

type SupportedDbOrm = "drizzle" | "prisma";

function isSupportedDbOrm(orm: string): orm is SupportedDbOrm {
  return ["drizzle", "prisma"].includes(orm);
}

export function generateDbPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;
  const orm = config.db.orm;

  if (!isSupportedDbOrm(orm)) {
    return;
  }

  builder.addFile(
    "packages/db/package.json",
    JSON.stringify(getPackageJson(projectName, orm), null, 2),
  );

  builder.addFile(
    "packages/db/tsconfig.json",
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

  if (orm === "drizzle") {
    generateDrizzleFiles(projectName, builder);
  } else {
    generatePrismaFiles(projectName, builder);
  }
}

function getPackageJson(
  projectName: string,
  orm: SupportedDbOrm,
): Record<string, unknown> {
  const base = {
    name: `@${projectName}/db`,
    version: "0.0.0",
    private: true,
    type: "module",
    main: "./src/index.ts",
    types: "./src/index.ts",
    scripts: {
      build: ":",
      lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
      format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
      "check-types": "tsc --noEmit",
    },
    devDependencies: {
      [`@${projectName}/tsconfig`]: "workspace:*",
      typescript: "^5.8.0",
    },
  };

  if (orm === "drizzle") {
    return {
      ...base,
      scripts: {
        ...base.scripts,
        "db:generate": "drizzle-kit generate",
        "db:migrate": "drizzle-kit migrate",
        "db:push": "drizzle-kit push",
        "db:studio": "drizzle-kit studio",
      },
      dependencies: {
        [`@${projectName}/env`]: "workspace:*",
        "drizzle-orm": "^0.40.0",
        pg: "^8.14.0",
      },
      devDependencies: {
        ...base.devDependencies,
        "@types/pg": "^8.11.0",
        "drizzle-kit": "^0.30.0",
      },
    };
  }

  return {
    ...base,
    scripts: {
      ...base.scripts,
      "db:generate": "prisma generate",
      "db:push": "prisma db push",
      "db:migrate": "prisma migrate dev",
      "db:studio": "prisma studio",
    },
    dependencies: {
      [`@${projectName}/env`]: "workspace:*",
      "@prisma/client": "^6.5.0",
    },
    devDependencies: {
      ...base.devDependencies,
      prisma: "^6.5.0",
    },
  };
}

function generateDrizzleFiles(
  projectName: string,
  builder: ProjectBuilder,
): void {
  builder.addFile(
    "packages/db/drizzle.config.ts",
    `import { defineConfig } from "drizzle-kit";
import { serverEnv } from "@${projectName}/env/server";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: serverEnv.DATABASE_URL,
  },
});
`,
  );

  builder.addFile(
    "packages/db/src/schema.ts",
    `import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`,
  );

  builder.addFile(
    "packages/db/src/index.ts",
    `import { drizzle } from "drizzle-orm/node-postgres";
import { serverEnv } from "@${projectName}/env/server";
import * as schema from "./schema";

export const db = drizzle(serverEnv.DATABASE_URL, { schema });
export { schema };
export type { User, NewUser } from "./schema";
`,
  );

  builder.addFile("packages/db/README.md", generateDrizzleReadme(projectName));
}

function generateDrizzleReadme(projectName: string): string {
  return `# @${projectName}/db

Shared database package using **Drizzle ORM** with PostgreSQL.

## Setup

1. Copy the repo-root \`.env.example\` to \`.env\` and fill in \`DATABASE_URL\`.
2. Run migrations: \`pnpm db:migrate\`
3. Use the exported \`db\` client in your apps:

\`\`\`ts
import { db, schema } from "@${projectName}/db";

const allUsers = await db.select().from(schema.users);
\`\`\`

## Scripts

- \`db:generate\` — generate migration files
- \`db:migrate\` — run migrations
- \`db:push\` — push schema changes
- \`db:studio\` — open Drizzle Studio
`;
}

function generatePrismaFiles(
  projectName: string,
  builder: ProjectBuilder,
): void {
  builder.addFile(
    "packages/db/prisma/schema.prisma",
    `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
`,
  );

  builder.addFile(
    "packages/db/src/index.ts",
    `import { PrismaClient } from "@prisma/client";
import { serverEnv } from "@${projectName}/env/server";

void serverEnv.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { User } from "@prisma/client";
`,
  );

  builder.addFile("packages/db/README.md", generatePrismaReadme(projectName));
}

function generatePrismaReadme(projectName: string): string {
  return `# @${projectName}/db

Shared database package using **Prisma ORM** with PostgreSQL.

## Setup

1. Copy the repo-root \`.env.example\` to \`.env\` and fill in \`DATABASE_URL\`.
2. Generate the Prisma client: \`pnpm db:generate\`
3. Push schema changes: \`pnpm db:push\`
4. Use the exported \`prisma\` client in your apps:

\`\`\`ts
import { prisma } from "@${projectName}/db";

const allUsers = await prisma.user.findMany();
\`\`\`

## Scripts

- \`db:generate\` — generate Prisma client
- \`db:push\` — push schema changes
- \`db:migrate\` — run migrations
- \`db:studio\` — open Prisma Studio
`;
}
