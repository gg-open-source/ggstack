import { createViteEnv } from "@{{PROJECT_NAME}}/env/client";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

createViteEnv(import.meta.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
});
