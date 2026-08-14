import { createViteEnv } from "@{{PROJECT_NAME}}/env/client";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { defineConfig } from "vite";

createViteEnv(import.meta.env);

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
