import { createViteEnv } from "@{{PROJECT_NAME}}/env/client";
import { defineConfig } from "vite";
import path from "node:path";

createViteEnv(import.meta.env);

export default defineConfig({
  root: path.resolve(import.meta.dirname, "src"),
  base: "./",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/renderer"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
