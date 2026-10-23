import { createViteEnv } from "@packages/env/client";
import { defineConfig } from "vite";

createViteEnv(process.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});
