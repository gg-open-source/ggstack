import { createViteEnv } from "@packages/env/client";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

createViteEnv(process.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [vue()],
  server: {
    port: 5173,
  },
});
