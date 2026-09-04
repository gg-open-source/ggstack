<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  APP_CHOICES,
  AUTH_CHOICES,
  createDefaultStackPreset,
  DB_DIALECT_CHOICES,
  DB_ORM_CHOICES,
  DEFAULT_APP_NAMES,
  DEFAULT_PROJECT_NAME,
  DEFAULT_SHADCN_BASE,
  DEFAULT_SHADCN_PRESET,
  DEFAULT_VITE_FRAMEWORK,
  DEFAULT_VITE_VARIANT,
  describeStack,
  decodeStack,
  encodeStack,
  formatCreateCommand,
  isShadcnPreset,
  EMAIL_CHOICES,
  PACKAGE_CHOICES,
  PAYMENT_CHOICES,
  sanitizeAppName,
  SHADCN_BASE_CHOICES,
  SHADCN_STYLES,
  TOOLING_CHOICES,
  VITE_FRAMEWORK_CHOICES,
  VITE_REACT_VARIANT_CHOICES,
  type AppType,
  type PackageManager,
  type ShadcnBase,
  type StackPreset,
  type ToolingType,
  type ViteFramework,
  type ViteVariant,
} from "create-ggstack/stack";

const PACKAGE_MANAGERS: Array<{ value: PackageManager; label: string }> = [
  { value: "pnpm", label: "pnpm" },
  { value: "npm", label: "npm" },
  { value: "yarn", label: "yarn" },
  { value: "bun", label: "bun" },
];

const projectName = ref(DEFAULT_PROJECT_NAME);
const preset = reactive<StackPreset>(createDefaultStackPreset());
const copied = ref(false);
const urlError = ref("");
const ready = ref(false);
const customShadcn = ref("");

const sanitizedName = computed(
  () => sanitizeAppName(projectName.value) || DEFAULT_PROJECT_NAME,
);
const code = computed(() => encodeStack(preset));
const command = computed(() =>
  formatCreateCommand(
    projectName.value,
    code.value,
    preset.packageManager,
  ),
);
const summary = computed(() => describeStack(preset).filter((row) => row.label !== "version"));
const sharePath = computed(() => {
  const params = new URLSearchParams();
  params.set("stack", code.value);
  if (sanitizedName.value !== DEFAULT_PROJECT_NAME) {
    params.set("name", sanitizedName.value);
  }
  return `/create?${params.toString()}`;
});
const shareUrl = computed(() => {
  if (typeof window === "undefined") return sharePath.value;
  return `${window.location.origin}${sharePath.value}`;
});

const selectedApps = computed(() =>
  APP_CHOICES.filter((choice) => hasApp(choice.value)).map((choice) => {
    const app = preset.apps.find((item) => item.type === choice.value);
    return app ?? { type: choice.value, name: DEFAULT_APP_NAMES[choice.value] };
  }),
);

const hasShadcn = computed(() =>
  preset.packages.some((pkg) => pkg.type === "shadcn"),
);
const shadcnBase = computed(
  () =>
    preset.packages.find((pkg) => pkg.type === "shadcn")?.shadcn?.base ??
    DEFAULT_SHADCN_BASE,
);
const shadcnPreset = computed(
  () =>
    preset.packages.find((pkg) => pkg.type === "shadcn")?.shadcn?.preset ??
    DEFAULT_SHADCN_PRESET,
);
const namedShadcnStyle = computed(() => {
  if (customShadcn.value.trim().length > 0) return "custom";
  return (SHADCN_STYLES as readonly string[]).includes(shadcnPreset.value)
    ? shadcnPreset.value
    : "custom";
});
const customShadcnError = computed(() => {
  const trimmed = customShadcn.value.trim();
  if (trimmed.length === 0) return "";
  if (!isShadcnPreset(trimmed)) {
    return "Use a named style like nova, or a preset code from ui.shadcn.com/create";
  }
  return "";
});

function hasApp(type: AppType): boolean {
  return preset.apps.some((app) => app.type === type);
}

function hasPackage(type: "shadcn" | "trpc"): boolean {
  return preset.packages.some((pkg) => pkg.type === type);
}

function hasTooling(type: ToolingType): boolean {
  return preset.tooling.some((item) => item.type === type);
}

function toggleApp(type: AppType): void {
  if (hasApp(type)) {
    preset.apps = preset.apps.filter((app) => app.type !== type);
    return;
  }
  const app: StackPreset["apps"][number] = {
    type,
    name: DEFAULT_APP_NAMES[type],
  };
  if (type === "vite") {
    app.vite = {
      framework: DEFAULT_VITE_FRAMEWORK,
      variant: DEFAULT_VITE_VARIANT,
    };
  }
  preset.apps = [...preset.apps, app];
}

function setAppName(type: AppType, name: string): void {
  preset.apps = preset.apps.map((app) =>
    app.type === type ? { ...app, name } : app,
  );
}

function setViteFramework(framework: ViteFramework): void {
  preset.apps = preset.apps.map((app) => {
    if (app.type !== "vite") return app;
    return {
      ...app,
      vite: {
        framework,
        variant:
          framework === "react"
            ? (app.vite?.variant ?? DEFAULT_VITE_VARIANT)
            : DEFAULT_VITE_VARIANT,
      },
    };
  });
}

function setViteVariant(variant: ViteVariant): void {
  preset.apps = preset.apps.map((app) => {
    if (app.type !== "vite") return app;
    return {
      ...app,
      vite: {
        framework: app.vite?.framework ?? "react",
        variant,
      },
    };
  });
}

function togglePackage(type: "shadcn" | "trpc"): void {
  const exists = hasPackage(type);
  let packages = preset.packages.filter((pkg) => pkg.type !== "db");
  if (exists) {
    packages = packages.filter((pkg) => pkg.type !== type);
  } else if (type === "shadcn") {
    packages = [
      ...packages,
      {
        type: "shadcn",
        shadcn: { preset: DEFAULT_SHADCN_PRESET, base: DEFAULT_SHADCN_BASE },
      },
    ];
    customShadcn.value = "";
  } else {
    packages = [...packages, { type: "trpc" }];
  }
  preset.packages = packages;
}

function updateShadcn(partial: { base?: ShadcnBase; preset?: string }): void {
  if (!hasShadcn.value) return;
  preset.packages = preset.packages.map((pkg) => {
    if (pkg.type !== "shadcn") return pkg;
    return {
      type: "shadcn",
      shadcn: {
        base: partial.base ?? pkg.shadcn?.base ?? DEFAULT_SHADCN_BASE,
        preset: partial.preset ?? pkg.shadcn?.preset ?? DEFAULT_SHADCN_PRESET,
      },
    };
  });
}

function setNamedShadcnStyle(value: string): void {
  if (value === "custom") {
    if (customShadcn.value.trim().length === 0) {
      customShadcn.value = shadcnPreset.value;
    }
    return;
  }
  customShadcn.value = "";
  updateShadcn({ preset: value });
}

function setCustomShadcn(value: string): void {
  customShadcn.value = value;
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    if (isShadcnPreset(trimmed)) {
      updateShadcn({ preset: trimmed });
    }
    return;
  }
  updateShadcn({ preset: DEFAULT_SHADCN_PRESET });
}

function toggleTooling(type: ToolingType): void {
  if (type === "tailwind" && hasShadcn.value) return;
  if (hasTooling(type)) {
    preset.tooling = preset.tooling.filter((item) => item.type !== type);
    return;
  }
  preset.tooling = [...preset.tooling, { type }];
}

function viteApp() {
  return preset.apps.find((app) => app.type === "vite");
}

function assignPreset(next: StackPreset): void {
  preset.packageManager = next.packageManager;
  preset.apps = next.apps;
  preset.packages = next.packages;
  preset.auth = next.auth;
  preset.db = next.db;
  preset.payments = next.payments;
  preset.email = next.email;
  preset.tooling = next.tooling;
  const current = next.packages.find((pkg) => pkg.type === "shadcn")?.shadcn
    ?.preset;
  customShadcn.value =
    current && !(SHADCN_STYLES as readonly string[]).includes(current)
      ? current
      : "";
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}

onMounted(() => {
  const url = new URL(window.location.href);
  const stackParam = url.searchParams.get("stack");
  const nameParam = url.searchParams.get("name");
  if (stackParam) {
    try {
      assignPreset(decodeStack(stackParam));
    } catch {
      urlError.value =
        "That stack code is invalid. Showing the default config.";
    }
  }
  if (nameParam) {
    projectName.value = nameParam;
  }
  ready.value = true;
});

watch(
  [projectName, () => encodeStack(preset)],
  () => {
    if (!ready.value || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("stack", code.value);
    if (sanitizedName.value !== DEFAULT_PROJECT_NAME) {
      url.searchParams.set("name", sanitizedName.value);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  },
);
</script>

<template>
  <div class="builder">
    <p v-if="urlError" class="banner">{{ urlError }}</p>

    <div class="layout">
      <form class="form" @submit.prevent>
        <section class="card">
          <h2>Project</h2>
          <label class="field">
            <span>Project name</span>
            <input
              v-model="projectName"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="project"
            />
          </label>
          <p v-if="sanitizedName !== projectName.trim()" class="hint">
            Folder name will be <code>{{ sanitizedName }}</code>
          </p>
        </section>

        <section class="card">
          <h2>Apps</h2>
          <p class="lede">Optional. You can scaffold packages with no apps.</p>
          <div class="chips" role="group" aria-label="Apps">
            <button
              v-for="choice in APP_CHOICES"
              :key="choice.value"
              type="button"
              class="chip"
              :class="{ on: hasApp(choice.value) }"
              :aria-pressed="hasApp(choice.value)"
              @click="toggleApp(choice.value)"
            >
              {{ choice.label }}
            </button>
          </div>

          <div v-if="selectedApps.length > 0" class="app-list">
            <div v-for="app in selectedApps" :key="app.type" class="app-row">
              <label class="field">
                <span>{{ app.type }} folder</span>
                <input
                  :value="app.name"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  @input="
                    setAppName(
                      app.type,
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
              </label>
              <template v-if="app.type === 'vite'">
                <label class="field">
                  <span>Vite framework</span>
                  <select
                    :value="viteApp()?.vite?.framework ?? DEFAULT_VITE_FRAMEWORK"
                    @change="
                      setViteFramework(
                        ($event.target as HTMLSelectElement)
                          .value as ViteFramework,
                      )
                    "
                  >
                    <option
                      v-for="choice in VITE_FRAMEWORK_CHOICES"
                      :key="choice.value"
                      :value="choice.value"
                    >
                      {{ choice.label }}
                    </option>
                  </select>
                </label>
                <label
                  v-if="viteApp()?.vite?.framework === 'react'"
                  class="field"
                >
                  <span>React variant</span>
                  <select
                    :value="viteApp()?.vite?.variant ?? DEFAULT_VITE_VARIANT"
                    @change="
                      setViteVariant(
                        ($event.target as HTMLSelectElement).value as ViteVariant,
                      )
                    "
                  >
                    <option
                      v-for="choice in VITE_REACT_VARIANT_CHOICES"
                      :key="choice.value"
                      :value="choice.value"
                    >
                      {{ choice.label }}
                    </option>
                  </select>
                </label>
              </template>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>Packages</h2>
          <div class="chips" role="group" aria-label="Packages">
            <button
              v-for="choice in PACKAGE_CHOICES"
              :key="choice.value"
              type="button"
              class="chip"
              :class="{ on: hasPackage(choice.value) }"
              :aria-pressed="hasPackage(choice.value)"
              @click="togglePackage(choice.value)"
            >
              {{ choice.label }}
            </button>
          </div>

          <div v-if="hasShadcn" class="subfields">
            <p class="lede">
              Component base and a named style, or a code from
              <a href="https://ui.shadcn.com/create" target="_blank" rel="noreferrer"
                >shadcn/create</a
              >.
            </p>
            <div class="chips" role="radiogroup" aria-label="shadcn base">
              <button
                v-for="choice in SHADCN_BASE_CHOICES"
                :key="choice.value"
                type="button"
                class="chip"
                role="radio"
                :class="{ on: shadcnBase === choice.value }"
                :aria-checked="shadcnBase === choice.value"
                @click="updateShadcn({ base: choice.value })"
              >
                {{ choice.label }}
              </button>
            </div>
            <label class="field">
              <span>Named style</span>
              <select
                :value="namedShadcnStyle"
                @change="
                  setNamedShadcnStyle(
                    ($event.target as HTMLSelectElement).value,
                  )
                "
              >
                <option
                  v-for="style in SHADCN_STYLES"
                  :key="style"
                  :value="style"
                >
                  {{ style }}
                </option>
                <option value="custom">Custom code</option>
              </select>
            </label>
            <label class="field">
              <span>Or paste a shadcn preset code</span>
              <input
                :value="customShadcn"
                type="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="b2D0vQ7G4"
                @input="
                  setCustomShadcn(($event.target as HTMLInputElement).value)
                "
              />
            </label>
            <p v-if="customShadcnError" class="hint">{{ customShadcnError }}</p>
          </div>
        </section>

        <section class="card">
          <h2>Tooling</h2>
          <div class="chips" role="group" aria-label="Tooling">
            <button
              v-for="choice in TOOLING_CHOICES"
              :key="choice.value"
              type="button"
              class="chip"
              :class="{ on: hasTooling(choice.value) || (choice.value === 'tailwind' && hasShadcn) }"
              :aria-pressed="hasTooling(choice.value) || (choice.value === 'tailwind' && hasShadcn)"
              :disabled="choice.value === 'tailwind' && hasShadcn"
              @click="toggleTooling(choice.value)"
            >
              {{ choice.label }}
              <span v-if="choice.value === 'tailwind' && hasShadcn" class="lock"
                >required</span
              >
            </button>
          </div>
        </section>

        <section class="card">
          <h2>Auth</h2>
          <div class="chips" role="radiogroup" aria-label="Authentication">
            <button
              v-for="choice in AUTH_CHOICES"
              :key="choice.value"
              type="button"
              class="chip"
              role="radio"
              :class="{ on: preset.auth.provider === choice.value }"
              :aria-checked="preset.auth.provider === choice.value"
              @click="preset.auth = { provider: choice.value }"
            >
              {{ choice.label }}
            </button>
          </div>
        </section>

        <section class="card">
          <h2>Database</h2>
          <div class="chips" role="radiogroup" aria-label="Database ORM">
            <button
              v-for="choice in DB_ORM_CHOICES"
              :key="choice.value"
              type="button"
              class="chip"
              role="radio"
              :class="{ on: preset.db.orm === choice.value }"
              :aria-checked="preset.db.orm === choice.value"
              @click="
                preset.db =
                  choice.value === 'none'
                    ? { orm: 'none' }
                    : {
                        orm: choice.value,
                        dialect: preset.db.dialect ?? 'postgresql',
                      }
              "
            >
              {{ choice.label }}
            </button>
          </div>
          <div
            v-if="preset.db.orm !== 'none'"
            class="chips dialect"
            role="radiogroup"
            aria-label="Database dialect"
          >
            <button
              v-for="choice in DB_DIALECT_CHOICES"
              :key="choice.value"
              type="button"
              class="chip"
              role="radio"
              :class="{ on: (preset.db.dialect ?? 'postgresql') === choice.value }"
              :aria-checked="(preset.db.dialect ?? 'postgresql') === choice.value"
              @click="preset.db = { orm: preset.db.orm, dialect: choice.value }"
            >
              {{ choice.label }}
            </button>
          </div>
        </section>

        <section class="card">
          <h2>Payments</h2>
          <div class="chips" role="radiogroup" aria-label="Payments">
            <button
              v-for="choice in PAYMENT_CHOICES"
              :key="choice.value"
              type="button"
              class="chip"
              role="radio"
              :class="{ on: preset.payments.provider === choice.value }"
              :aria-checked="preset.payments.provider === choice.value"
              @click="preset.payments = { provider: choice.value }"
            >
              {{ choice.label }}
            </button>
          </div>
        </section>

        <section class="card">
          <h2>Email</h2>
          <div class="chips" role="radiogroup" aria-label="Email">
            <button
              v-for="choice in EMAIL_CHOICES"
              :key="choice.value"
              type="button"
              class="chip"
              role="radio"
              :class="{ on: preset.email.provider === choice.value }"
              :aria-checked="preset.email.provider === choice.value"
              @click="preset.email = { provider: choice.value }"
            >
              {{ choice.label }}
            </button>
          </div>
        </section>
      </form>

      <aside class="panel">
        <section class="card command-card">
          <h2>Your command</h2>
          <p class="lede">
            Paste this in a terminal. <code>--stack</code> applies this exact
            config with no prompts.
          </p>

          <div class="chips pm" role="radiogroup" aria-label="Package manager">
            <button
              v-for="choice in PACKAGE_MANAGERS"
              :key="choice.value"
              type="button"
              class="chip"
              role="radio"
              :class="{ on: preset.packageManager === choice.value }"
              :aria-checked="preset.packageManager === choice.value"
              @click="preset.packageManager = choice.value"
            >
              {{ choice.label }}
            </button>
          </div>

          <pre class="command"><code>{{ command }}</code></pre>

          <div class="actions">
            <button type="button" class="primary" @click="copyText(command)">
              {{ copied ? "Copied" : "Copy command" }}
            </button>
            <button type="button" class="ghost" @click="copyText(shareUrl)">
              Copy share link
            </button>
          </div>

          <dl class="summary">
            <div v-for="row in summary" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
            <div>
              <dt>code</dt>
              <dd><code>{{ code }}</code></dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.builder {
  margin-top: 12px;
}

.banner {
  margin: 0 0 20px;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-warning-1, #c49b00);
  border-radius: 10px;
  background: var(--vp-c-warning-soft, rgba(234, 179, 8, 0.12));
  color: var(--vp-c-text-1);
}

.layout {
  display: grid;
  gap: 24px;
}

@media (min-width: 960px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: start;
  }

  .panel {
    position: sticky;
    top: 88px;
  }
}

.card {
  margin-bottom: 16px;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}

.card h2 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.lede {
  margin: 0 0 14px;
  color: var(--vp-c-text-2);
  font-size: 13.5px;
  line-height: 1.5;
}

.hint {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.field input,
.field select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chips.dialect,
.chips.pm {
  margin-top: 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--vp-c-brand-1);
}

.chip.on {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.chip:disabled {
  cursor: default;
  opacity: 1;
}

.lock {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
}

.app-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.app-row {
  padding: 4px 0 8px;
  border-top: 1px solid var(--vp-c-divider);
}

.subfields {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
}

.command-card {
  margin-bottom: 0;
}

.command {
  margin: 14px 0;
  padding: 12px 14px;
  overflow-x: auto;
  border-radius: 10px;
  background: var(--vp-code-bg, var(--vp-c-bg));
  color: var(--vp-c-text-1);
  font-size: 12.5px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-all;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.primary,
.ghost {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.primary {
  border: 1px solid transparent;
  background: var(--vp-button-brand-bg, var(--vp-c-brand-1));
  color: var(--vp-button-brand-text, #fff);
}

.ghost {
  border: 1px solid var(--vp-c-border);
  background: transparent;
  color: var(--vp-c-text-1);
}

.summary {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
}

.summary div {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 8px;
  font-size: 12.5px;
}

.summary dt {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.summary dd {
  margin: 0;
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}
</style>
