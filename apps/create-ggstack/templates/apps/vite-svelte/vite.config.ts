import { createViteEnv } from "@packages/env/client";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

createViteEnv(process.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [svelte()],
  server: {
    port: 5173,
  },
});
