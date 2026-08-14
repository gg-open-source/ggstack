import { createViteEnv } from "@{{PROJECT_NAME}}/env/client";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

createViteEnv(import.meta.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [vue()],
  server: {
    port: 5173,
  },
});
