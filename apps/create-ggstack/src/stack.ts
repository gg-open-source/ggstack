import {
  APP_CHOICES,
  DEFAULT_APP_NAMES,
  DEFAULT_AUTH_PROVIDER,
  DEFAULT_DB_DIALECT,
  DEFAULT_DB_ORM,
  DEFAULT_EMAIL_PROVIDER,
  DEFAULT_PACKAGE_MANAGER,
  DEFAULT_PAYMENT_PROVIDER,
  DEFAULT_PROJECT_NAME,
  DEFAULT_SHADCN_BASE,
  DEFAULT_SHADCN_PRESET,
  DEFAULT_VITE_FRAMEWORK,
  DEFAULT_VITE_VARIANT,
  isAppType,
  isAuthProvider,
  isDbDialect,
  isDbOrm,
  isEmailProvider,
  isPackageManager,
  isPaymentProvider,
  isShadcnBase,
  isShadcnPreset,
  isToolingType,
  isViteFramework,
  isViteVariant,
  TOOLING_CHOICES,
} from "./config.js";
import type {
  AppConfig,
  AppType,
  PackageConfig,
  PackageManager,
  ShadcnBase,
  StackConfig,
  ToolingConfig,
  ToolingType,
  ViteFramework,
  ViteVariant,
} from "./types.js";

export {
  isShadcnPreset,
  APP_CHOICES,
  AUTH_CHOICES,
  DB_DIALECT_CHOICES,
  DB_ORM_CHOICES,
  DEFAULT_APP_NAMES,
  DEFAULT_AUTH_PROVIDER,
  DEFAULT_DB_DIALECT,
  DEFAULT_DB_ORM,
  DEFAULT_EMAIL_PROVIDER,
  DEFAULT_PACKAGE_MANAGER,
  DEFAULT_PAYMENT_PROVIDER,
  DEFAULT_PROJECT_NAME,
  DEFAULT_SHADCN_BASE,
  DEFAULT_SHADCN_PRESET,
  DEFAULT_VITE_FRAMEWORK,
  DEFAULT_VITE_VARIANT,
  EMAIL_CHOICES,
  PACKAGE_CHOICES,
  PAYMENT_CHOICES,
  SHADCN_BASE_CHOICES,
  SHADCN_STYLES,
  TOOLING_CHOICES,
  VITE_FRAMEWORK_CHOICES,
  VITE_REACT_VARIANT_CHOICES,
} from "./config.js";

export const STACK_CODE_PREFIX = "g1";
export const STACK_CODE_VERSION = 1;
const MAX_STACK_JSON_BYTES = 4096;

export type {
  AppType,
  AuthProvider,
  DbDialect,
  DbOrm,
  EmailProvider,
  PackageManager,
  PackageType,
  PaymentProvider,
  ShadcnBase,
  ToolingType,
  ViteFramework,
  ViteVariant,
} from "./types.js";

export type StackPreset = Omit<StackConfig, "projectName" | "targetDir">;

export class StackCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StackCodeError";
  }
}

interface EncodedAppV1 {
  t: AppType;
  n?: string;
  vf?: ViteFramework;
  vv?: ViteVariant;
}

interface EncodedStackV1 {
  a?: EncodedAppV1[];
  p?: Array<"shadcn" | "trpc">;
  sb?: ShadcnBase;
  sp?: string;
  au?: StackPreset["auth"]["provider"];
  db?: StackPreset["db"]["orm"];
  dd?: StackPreset["db"]["dialect"];
  py?: StackPreset["payments"]["provider"];
  em?: StackPreset["email"]["provider"];
  tl?: ToolingType[];
  pm?: PackageManager;
}

const APP_TYPE_ORDER = APP_CHOICES.map((choice) => choice.value);
const TOOLING_TYPE_ORDER = TOOLING_CHOICES.map((choice) => choice.value);

export function sanitizeAppName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export function isStackCode(value: string): boolean {
  return /^g1[A-Za-z0-9_-]+$/.test(value);
}

export function createDefaultStackPreset(): StackPreset {
  return {
    packageManager: DEFAULT_PACKAGE_MANAGER,
    apps: [],
    packages: [],
    auth: { provider: DEFAULT_AUTH_PROVIDER },
    db: { orm: DEFAULT_DB_ORM },
    payments: { provider: DEFAULT_PAYMENT_PROVIDER },
    email: { provider: DEFAULT_EMAIL_PROVIDER },
    tooling: [],
  };
}

export function normalizeStackPreset(preset: StackPreset): StackPreset {
  const appsByType = new Map<AppType, AppConfig>();
  for (const app of preset.apps) {
    if (!isAppType(app.type)) continue;
    const defaultName = DEFAULT_APP_NAMES[app.type];
    const name = sanitizeAppName(app.name) || defaultName;
    const next: AppConfig = { type: app.type, name };
    if (app.type === "vite") {
      let framework = DEFAULT_VITE_FRAMEWORK;
      let variant: ViteVariant = DEFAULT_VITE_VARIANT;
      if (app.vite && isViteFramework(app.vite.framework)) {
        framework = app.vite.framework;
        if (framework === "react" && isViteVariant(app.vite.variant)) {
          variant = app.vite.variant;
        }
      }
      next.vite = { framework, variant };
    }
    appsByType.set(app.type, next);
  }

  const apps = APP_TYPE_ORDER.filter((type) => appsByType.has(type)).map(
    (type) => appsByType.get(type)!,
  );

  const names = new Set<string>();
  for (const app of apps) {
    if (names.has(app.name)) {
      throw new StackCodeError(
        `App names must be unique. "${app.name}" is used more than once.`,
      );
    }
    names.add(app.name);
  }

  const selectedPackages = new Set(
    preset.packages
      .map((pkg) => pkg.type)
      .filter((type) => type === "shadcn" || type === "trpc"),
  );

  const shadcnSource = preset.packages.find((pkg) => pkg.type === "shadcn");
  const shadcnSelected = selectedPackages.has("shadcn");
  const packages: PackageConfig[] = [];

  if (shadcnSelected) {
    let base = DEFAULT_SHADCN_BASE;
    let shadcnPreset = DEFAULT_SHADCN_PRESET;
    if (shadcnSource?.shadcn) {
      if (isShadcnBase(shadcnSource.shadcn.base)) {
        base = shadcnSource.shadcn.base;
      }
      const presetCode = shadcnSource.shadcn.preset.trim();
      if (presetCode.length > 0 && isShadcnPreset(presetCode)) {
        shadcnPreset = presetCode;
      }
    }
    packages.push({
      type: "shadcn",
      shadcn: { preset: shadcnPreset, base },
    });
  }

  if (selectedPackages.has("trpc")) {
    packages.push({ type: "trpc" });
  }

  const orm = isDbOrm(preset.db.orm) ? preset.db.orm : DEFAULT_DB_ORM;
  const db =
    orm === "none"
      ? { orm }
      : {
          orm,
          dialect: isDbDialect(preset.db.dialect ?? "")
            ? preset.db.dialect
            : DEFAULT_DB_DIALECT,
        };

  if (db.orm !== "none") {
    packages.push({ type: "db" });
  }

  const toolingTypes = new Set<ToolingType>();
  for (const item of preset.tooling) {
    if (isToolingType(item.type)) {
      toolingTypes.add(item.type);
    }
  }
  if (shadcnSelected) {
    toolingTypes.add("tailwind");
  }
  const tooling: ToolingConfig[] = TOOLING_TYPE_ORDER.filter((type) =>
    toolingTypes.has(type),
  ).map((type) => ({ type }));

  return {
    packageManager: isPackageManager(preset.packageManager)
      ? preset.packageManager
      : DEFAULT_PACKAGE_MANAGER,
    apps,
    packages,
    auth: {
      provider: isAuthProvider(preset.auth.provider)
        ? preset.auth.provider
        : DEFAULT_AUTH_PROVIDER,
    },
    db,
    payments: {
      provider: isPaymentProvider(preset.payments.provider)
        ? preset.payments.provider
        : DEFAULT_PAYMENT_PROVIDER,
    },
    email: {
      provider: isEmailProvider(preset.email.provider)
        ? preset.email.provider
        : DEFAULT_EMAIL_PROVIDER,
    },
    tooling,
  };
}

export function encodeStack(preset: StackPreset): string {
  const normalized = normalizeStackPreset(preset);
  const encoded = toEncoded(normalized);
  return STACK_CODE_PREFIX + utf8ToBase64Url(JSON.stringify(encoded));
}

export function decodeStack(code: string): StackPreset {
  const trimmed = code.trim();
  if (!isStackCode(trimmed)) {
    throw new StackCodeError(
      "Invalid --stack code. Build one at the docs /create page.",
    );
  }

  const payload = trimmed.slice(STACK_CODE_PREFIX.length);
  let json: string;
  try {
    json = base64UrlToUtf8(payload);
  } catch {
    throw new StackCodeError(
      "Invalid --stack code. Build one at the docs /create page.",
    );
  }

  if (new TextEncoder().encode(json).length > MAX_STACK_JSON_BYTES) {
    throw new StackCodeError("Invalid --stack code. Payload is too large.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new StackCodeError(
      "Invalid --stack code. Build one at the docs /create page.",
    );
  }

  const encoded = parseEncoded(parsed);
  return normalizeStackPreset(fromEncoded(encoded));
}

export function formatCreateCommand(
  projectName: string,
  code: string,
  packageManager: PackageManager,
): string {
  const name = sanitizeAppName(projectName) || DEFAULT_PROJECT_NAME;
  switch (packageManager) {
    case "pnpm":
      return `pnpm create ggstack@latest ${name} --stack ${code}`;
    case "npm":
      return `npx create-ggstack@latest ${name} --stack ${code}`;
    case "yarn":
      return `yarn dlx create-ggstack@latest ${name} --stack ${code}`;
    case "bun":
      return `bunx create-ggstack@latest ${name} --stack ${code}`;
  }
}

export function describeStack(
  preset: StackPreset,
): Array<{ label: string; value: string }> {
  const normalized = normalizeStackPreset(preset);
  const shadcn = normalized.packages.find((pkg) => pkg.type === "shadcn");
  const packages = normalized.packages
    .filter((pkg) => pkg.type === "shadcn" || pkg.type === "trpc")
    .map((pkg) => pkg.type);

  const rows: Array<{ label: string; value: string }> = [
    { label: "version", value: String(STACK_CODE_VERSION) },
    { label: "package manager", value: normalized.packageManager },
    {
      label: "apps",
      value:
        normalized.apps
          .map((app) => {
            if (app.type === "vite" && app.vite) {
              const variant =
                app.vite.framework === "react" &&
                app.vite.variant === "react-compiler"
                  ? "react-compiler"
                  : app.vite.framework;
              return `${app.name} (${app.type}/${variant})`;
            }
            return `${app.name} (${app.type})`;
          })
          .join(", ") || "none",
    },
    { label: "packages", value: packages.join(", ") || "none" },
  ];

  if (shadcn?.shadcn) {
    rows.push({
      label: "shadcn",
      value: `${shadcn.shadcn.base} / ${shadcn.shadcn.preset}`,
    });
  }

  rows.push(
    {
      label: "tooling",
      value: normalized.tooling.map((item) => item.type).join(", ") || "none",
    },
    { label: "auth", value: normalized.auth.provider },
    {
      label: "database",
      value:
        normalized.db.orm === "none"
          ? "none"
          : `${normalized.db.orm} / ${normalized.db.dialect ?? DEFAULT_DB_DIALECT}`,
    },
    { label: "payments", value: normalized.payments.provider },
    { label: "email", value: normalized.email.provider },
  );

  return rows;
}

export function formatDecodedStack(code: string, preset: StackPreset): string {
  const rows = describeStack(preset);
  const labelWidth = Math.max(
    "code".length,
    ...rows.map((row) => row.label.length),
  );
  const lines = [
    "Stack",
    `  ${"code".padEnd(labelWidth)}  ${code}`,
    ...rows.map((row) => `  ${row.label.padEnd(labelWidth)}  ${row.value}`),
  ];
  return lines.join("\n");
}

function toEncoded(preset: StackPreset): EncodedStackV1 {
  const encoded: EncodedStackV1 = {};
  const apps: EncodedAppV1[] = preset.apps.map((app) => {
    const item: EncodedAppV1 = { t: app.type };
    if (app.name !== DEFAULT_APP_NAMES[app.type]) {
      item.n = app.name;
    }
    if (app.type === "vite" && app.vite) {
      if (app.vite.framework !== DEFAULT_VITE_FRAMEWORK) {
        item.vf = app.vite.framework;
      }
      if (
        app.vite.framework === "react" &&
        app.vite.variant !== DEFAULT_VITE_VARIANT
      ) {
        item.vv = app.vite.variant;
      }
    }
    return item;
  });
  if (apps.length > 0) {
    encoded.a = apps;
  }

  const extraPackages = preset.packages
    .map((pkg) => pkg.type)
    .filter(
      (type): type is "shadcn" | "trpc" => type === "shadcn" || type === "trpc",
    );
  if (extraPackages.length > 0) {
    encoded.p = extraPackages;
  }

  const shadcn = preset.packages.find((pkg) => pkg.type === "shadcn")?.shadcn;
  if (shadcn) {
    if (shadcn.base !== DEFAULT_SHADCN_BASE) {
      encoded.sb = shadcn.base;
    }
    if (shadcn.preset !== DEFAULT_SHADCN_PRESET) {
      encoded.sp = shadcn.preset;
    }
  }

  if (preset.auth.provider !== DEFAULT_AUTH_PROVIDER) {
    encoded.au = preset.auth.provider;
  }

  if (preset.db.orm !== DEFAULT_DB_ORM) {
    encoded.db = preset.db.orm;
    if (preset.db.dialect && preset.db.dialect !== DEFAULT_DB_DIALECT) {
      encoded.dd = preset.db.dialect;
    }
  }

  if (preset.payments.provider !== DEFAULT_PAYMENT_PROVIDER) {
    encoded.py = preset.payments.provider;
  }

  if (preset.email.provider !== DEFAULT_EMAIL_PROVIDER) {
    encoded.em = preset.email.provider;
  }

  const tooling = preset.tooling.map((item) => item.type);
  if (tooling.length > 0) {
    encoded.tl = tooling;
  }

  if (preset.packageManager !== DEFAULT_PACKAGE_MANAGER) {
    encoded.pm = preset.packageManager;
  }

  return encoded;
}

function fromEncoded(encoded: EncodedStackV1): StackPreset {
  const preset = createDefaultStackPreset();

  if (encoded.pm) {
    preset.packageManager = encoded.pm;
  }

  preset.apps = (encoded.a ?? []).map((app) => {
    const name = app.n ?? DEFAULT_APP_NAMES[app.t];
    const config: AppConfig = { type: app.t, name };
    if (app.t === "vite") {
      config.vite = {
        framework: app.vf ?? DEFAULT_VITE_FRAMEWORK,
        variant: app.vv ?? DEFAULT_VITE_VARIANT,
      };
    }
    return config;
  });

  const packages: PackageConfig[] = [];
  const selected = new Set(encoded.p ?? []);
  if (selected.has("shadcn") || encoded.sb || encoded.sp) {
    packages.push({
      type: "shadcn",
      shadcn: {
        base: encoded.sb ?? DEFAULT_SHADCN_BASE,
        preset: encoded.sp ?? DEFAULT_SHADCN_PRESET,
      },
    });
  }
  if (selected.has("trpc")) {
    packages.push({ type: "trpc" });
  }
  preset.packages = packages;

  if (encoded.au) {
    preset.auth = { provider: encoded.au };
  }

  if (encoded.db) {
    preset.db = {
      orm: encoded.db,
      dialect: encoded.dd ?? DEFAULT_DB_DIALECT,
    };
  }

  if (encoded.py) {
    preset.payments = { provider: encoded.py };
  }

  if (encoded.em) {
    preset.email = { provider: encoded.em };
  }

  if (encoded.tl) {
    preset.tooling = encoded.tl.map((type) => ({ type }));
  }

  return preset;
}

function parseEncoded(value: unknown): EncodedStackV1 {
  const record = asRecord(value);
  if (!record) {
    throw new StackCodeError(
      "Invalid --stack code. Build one at the docs /create page.",
    );
  }

  const encoded: EncodedStackV1 = {};

  if (record.a !== undefined) {
    if (!Array.isArray(record.a)) {
      throw new StackCodeError("Invalid --stack code. Apps must be a list.");
    }
    encoded.a = record.a.map(parseEncodedApp);
    const types = encoded.a.map((app) => app.t);
    if (new Set(types).size !== types.length) {
      throw new StackCodeError("Invalid --stack code. Duplicate app types.");
    }
  }

  if (record.p !== undefined) {
    if (!Array.isArray(record.p)) {
      throw new StackCodeError(
        "Invalid --stack code. Packages must be a list.",
      );
    }
    encoded.p = record.p.map((item) => {
      if (item !== "shadcn" && item !== "trpc") {
        throw new StackCodeError(`Invalid --stack package "${String(item)}".`);
      }
      return item;
    });
  }

  if (record.sb !== undefined) {
    if (typeof record.sb !== "string" || !isShadcnBase(record.sb)) {
      throw new StackCodeError("Invalid --stack shadcn base.");
    }
    encoded.sb = record.sb;
  }

  if (record.sp !== undefined) {
    if (typeof record.sp !== "string" || !isShadcnPreset(record.sp)) {
      throw new StackCodeError("Invalid --stack shadcn preset.");
    }
    encoded.sp = record.sp;
  }

  if (record.au !== undefined) {
    if (typeof record.au !== "string" || !isAuthProvider(record.au)) {
      throw new StackCodeError("Invalid --stack auth provider.");
    }
    encoded.au = record.au;
  }

  if (record.db !== undefined) {
    if (typeof record.db !== "string" || !isDbOrm(record.db)) {
      throw new StackCodeError("Invalid --stack database ORM.");
    }
    encoded.db = record.db;
  }

  if (record.dd !== undefined) {
    if (typeof record.dd !== "string" || !isDbDialect(record.dd)) {
      throw new StackCodeError("Invalid --stack database dialect.");
    }
    encoded.dd = record.dd;
  }

  if (record.py !== undefined) {
    if (typeof record.py !== "string" || !isPaymentProvider(record.py)) {
      throw new StackCodeError("Invalid --stack payment provider.");
    }
    encoded.py = record.py;
  }

  if (record.em !== undefined) {
    if (typeof record.em !== "string" || !isEmailProvider(record.em)) {
      throw new StackCodeError("Invalid --stack email provider.");
    }
    encoded.em = record.em;
  }

  if (record.tl !== undefined) {
    if (!Array.isArray(record.tl)) {
      throw new StackCodeError("Invalid --stack code. Tooling must be a list.");
    }
    encoded.tl = record.tl.map((item) => {
      if (typeof item !== "string" || !isToolingType(item)) {
        throw new StackCodeError(`Invalid --stack tooling "${String(item)}".`);
      }
      return item;
    });
  }

  if (record.pm !== undefined) {
    if (typeof record.pm !== "string" || !isPackageManager(record.pm)) {
      throw new StackCodeError("Invalid --stack package manager.");
    }
    encoded.pm = record.pm;
  }

  return encoded;
}

function parseEncodedApp(value: unknown): EncodedAppV1 {
  const record = asRecord(value);
  if (!record || typeof record.t !== "string" || !isAppType(record.t)) {
    throw new StackCodeError("Invalid --stack app.");
  }

  const app: EncodedAppV1 = { t: record.t };

  if (record.n !== undefined) {
    if (typeof record.n !== "string") {
      throw new StackCodeError("Invalid --stack app name.");
    }
    app.n = record.n;
  }

  if (record.vf !== undefined) {
    if (typeof record.vf !== "string" || !isViteFramework(record.vf)) {
      throw new StackCodeError("Invalid --stack Vite framework.");
    }
    app.vf = record.vf;
  }

  if (record.vv !== undefined) {
    if (typeof record.vv !== "string" || !isViteVariant(record.vv)) {
      throw new StackCodeError("Invalid --stack Vite variant.");
    }
    app.vv = record.vv;
  }

  return app;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function utf8ToBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToUtf8(code: string): string {
  const padLength = (4 - (code.length % 4)) % 4;
  const padded =
    code.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
