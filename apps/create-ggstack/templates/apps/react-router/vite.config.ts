import "@packages/env/server";
import { createViteEnv } from "@packages/env/client";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

createViteEnv(process.env);

export default defineConfig({
  server: {
    port: 5174,
  },
  plugins: [reactRouter()],
});
