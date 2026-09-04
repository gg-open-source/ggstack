import { resolveDbDialect } from "../../config.js";
import type { DbDialect, ProjectBuilder, StackConfig } from "../../types.js";

type SupportedDbOrm = "drizzle" | "prisma";

function isSupportedDbOrm(orm: string): orm is SupportedDbOrm {
  return ["drizzle", "prisma"].includes(orm);
}

export function generateDbPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const orm = config.db.orm;

  if (!isSupportedDbOrm(orm)) {
    return;
  }

  const dialect = resolveDbDialect(config.db.dialect);

  builder.addFile(
    "packages/db/package.json",
    JSON.stringify(getPackageJson(orm, dialect), null, 2),
  );

  builder.addFile(
    "packages/db/tsconfig.json",
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

  if (orm === "drizzle") {
    generateDrizzleFiles(dialect, builder);
  } else {
    generatePrismaFiles(dialect, builder);
  }
}

function getPackageJson(
  orm: SupportedDbOrm,
  dialect: DbDialect,
): Record<string, unknown> {
  const base = {
    name: "@packages/db",
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
      "@tooling/tsconfig": "workspace:*",
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
        "@packages/env": "workspace:*",
        "drizzle-orm": "^0.40.0",
        ...getDrizzleDriverDependencies(dialect),
      },
      devDependencies: {
        ...base.devDependencies,
        ...getDrizzleDriverDevDependencies(dialect),
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
      "@packages/env": "workspace:*",
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
  dialect: DbDialect,
  builder: ProjectBuilder,
): void {
  builder.addFile(
    "packages/db/drizzle.config.ts",
    `import { defineConfig } from "drizzle-kit";
import { serverEnv } from "@packages/env/server";

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

  builder.addFile(
    "packages/db/src/schema.ts",
    `// Add your Drizzle tables here.
export {};
`,
  );

  builder.addFile("packages/db/src/index.ts", getDrizzleClientSource(dialect));

  builder.addFile("packages/db/README.md", generateDrizzleReadme(dialect));
}

function getDrizzleClientSource(dialect: DbDialect): string {
  if (dialect === "mysql") {
    return `import { drizzle } from "drizzle-orm/mysql2";
import { serverEnv } from "@packages/env/server";

export const db = drizzle(serverEnv.DATABASE_URL, { mode: "default" });
`;
  }

  if (dialect === "sqlite") {
    return `import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { serverEnv } from "@packages/env/server";

const client = createClient({ url: serverEnv.DATABASE_URL });
export const db = drizzle(client);
`;
  }

  return `import { drizzle } from "drizzle-orm/node-postgres";
import { serverEnv } from "@packages/env/server";

export const db = drizzle(serverEnv.DATABASE_URL);
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

function generateDrizzleReadme(dialect: DbDialect): string {
  return `# @packages/db

Shared database package using **Drizzle ORM** with ${dialectLabel(dialect)}.

## Setup

1. Copy the repo-root \`.env.example\` to \`.env\` and fill in \`DATABASE_URL\`.
2. Add tables in \`src/schema.ts\`.
3. Run migrations: \`pnpm db:migrate\`
4. Use the exported \`db\` client in your apps:

\`\`\`ts
import { db } from "@packages/db";
\`\`\`

## Scripts

- \`db:generate\` — generate migration files
- \`db:migrate\` — run migrations
- \`db:push\` — push schema changes
- \`db:studio\` — open Drizzle Studio
`;
}

function generatePrismaFiles(
  dialect: DbDialect,
  builder: ProjectBuilder,
): void {
  builder.addFile(
    "packages/db/prisma/schema.prisma",
    `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${dialect}"
  url      = env("DATABASE_URL")
}
`,
  );

  builder.addFile(
    "packages/db/src/index.ts",
    `import { PrismaClient } from "@prisma/client";
import { serverEnv } from "@packages/env/server";

void serverEnv.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
`,
  );

  builder.addFile("packages/db/README.md", generatePrismaReadme(dialect));
}

function generatePrismaReadme(dialect: DbDialect): string {
  return `# @packages/db

Shared database package using **Prisma ORM** with ${dialectLabel(dialect)}.

## Setup

1. Copy the repo-root \`.env.example\` to \`.env\` and fill in \`DATABASE_URL\`.
2. Add models in \`prisma/schema.prisma\`.
3. Generate the Prisma client: \`pnpm db:generate\`
4. Push schema changes: \`pnpm db:push\`
5. Use the exported \`prisma\` client in your apps:

\`\`\`ts
import { prisma } from "@packages/db";
\`\`\`

## Scripts

- \`db:generate\` — generate Prisma client
- \`db:push\` — push schema changes
- \`db:migrate\` — run migrations
- \`db:studio\` — open Prisma Studio
`;
}
