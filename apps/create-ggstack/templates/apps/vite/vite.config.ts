import { createViteEnv } from "@{{PROJECT_NAME}}/env/client";
import { defineConfig } from "vite";

createViteEnv(import.meta.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});
