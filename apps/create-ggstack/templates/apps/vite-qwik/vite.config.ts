import { createViteEnv } from "@packages/env/client";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { defineConfig } from "vite";

createViteEnv(process.env);

export default defineConfig({
  build: {
    outDir: "dist",
  },
  plugins: [
    qwikVite({
      csr: true,
    }),
  ],
  server: {
    port: 5173,
  },
});
