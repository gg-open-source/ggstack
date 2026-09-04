import { createViteEnv } from "@packages/env/client";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

createViteEnv(import.meta.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [preact()],
  server: {
    port: 5173,
  },
});
