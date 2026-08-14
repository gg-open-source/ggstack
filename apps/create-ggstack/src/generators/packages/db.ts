import { resolveDrizzleDialect } from "../../config.js";
import type { DbDialect, ProjectBuilder, StackConfig } from "../../types.js";

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

  const dialect =
    orm === "drizzle" ? resolveDrizzleDialect(config.db.dialect) : undefined;

  builder.addFile(
    "packages/db/package.json",
    JSON.stringify(getPackageJson(projectName, orm, dialect), null, 2),
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

  if (orm === "drizzle" && dialect) {
    generateDrizzleFiles(projectName, dialect, builder);
  } else {
    generatePrismaFiles(projectName, builder);
  }
}

function getPackageJson(
  projectName: string,
  orm: SupportedDbOrm,
  dialect: DbDialect | undefined,
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
        ...getDrizzleDriverDependencies(dialect ?? "postgresql"),
      },
      devDependencies: {
        ...base.devDependencies,
        ...getDrizzleDriverDevDependencies(dialect ?? "postgresql"),
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

function getDrizzleDriverDependencies(
  dialect: DbDialect,
): Record<string, string> {
  switch (dialect) {
    case "mysql":
      return { mysql2: "^3.14.0" };
    case "sqlite":
      return { "@libsql/client": "^0.15.0" };
    case "postgresql":
      return { pg: "^8.14.0" };
  }
}

function getDrizzleDriverDevDependencies(
  dialect: DbDialect,
): Record<string, string> {
  if (dialect === "postgresql") {
    return { "@types/pg": "^8.11.0" };
  }
  return {};
}

function generateDrizzleFiles(
  projectName: string,
  dialect: DbDialect,
  builder: ProjectBuilder,
): void {
  builder.addFile(
    "packages/db/drizzle.config.ts",
    `import { defineConfig } from "drizzle-kit";
import { serverEnv } from "@${projectName}/env/server";

export default defineConfig({
  dialect: "${dialect}",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: serverEnv.DATABASE_URL,
  },
});
`,
  );

  builder.addFile("packages/db/src/schema.ts", getDrizzleSchemaSource(dialect));

  builder.addFile(
    "packages/db/src/index.ts",
    getDrizzleClientSource(projectName, dialect),
  );

  builder.addFile(
    "packages/db/README.md",
    generateDrizzleReadme(projectName, dialect),
  );
}

function getDrizzleSchemaSource(dialect: DbDialect): string {
  if (dialect === "mysql") {
    return `import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;
  }

  if (dialect === "sqlite") {
    return `import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;
  }

  return `import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;
}

function getDrizzleClientSource(
  projectName: string,
  dialect: DbDialect,
): string {
  if (dialect === "mysql") {
    return `import { drizzle } from "drizzle-orm/mysql2";
import { serverEnv } from "@${projectName}/env/server";
import * as schema from "./schema";

export const db = drizzle(serverEnv.DATABASE_URL, { schema, mode: "default" });
export { schema };
export type { User, NewUser } from "./schema";
`;
  }

  if (dialect === "sqlite") {
    return `import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { serverEnv } from "@${projectName}/env/server";
import * as schema from "./schema";

const client = createClient({ url: serverEnv.DATABASE_URL });
export const db = drizzle(client, { schema });
export { schema };
export type { User, NewUser } from "./schema";
`;
  }

  return `import { drizzle } from "drizzle-orm/node-postgres";
import { serverEnv } from "@${projectName}/env/server";
import * as schema from "./schema";

export const db = drizzle(serverEnv.DATABASE_URL, { schema });
export { schema };
export type { User, NewUser } from "./schema";
`;
}

function dialectLabel(dialect: DbDialect): string {
  switch (dialect) {
    case "mysql":
      return "MySQL";
    case "sqlite":
      return "SQLite";
    case "postgresql":
      return "PostgreSQL";
  }
}

function generateDrizzleReadme(
  projectName: string,
  dialect: DbDialect,
): string {
  return `# @${projectName}/db

Shared database package using **Drizzle ORM** with ${dialectLabel(dialect)}.

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
