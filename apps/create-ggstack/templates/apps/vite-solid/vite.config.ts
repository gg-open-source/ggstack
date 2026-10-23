import { createViteEnv } from "@packages/env/client";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

createViteEnv(process.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [solid()],
  server: {
    port: 5173,
  },
});
