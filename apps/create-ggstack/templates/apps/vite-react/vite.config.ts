import { createViteEnv } from "@packages/env/client";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

createViteEnv(process.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
});
