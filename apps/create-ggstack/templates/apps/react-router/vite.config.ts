import "@{{PROJECT_NAME}}/env/server";
import { createViteEnv } from "@{{PROJECT_NAME}}/env/client";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

createViteEnv(import.meta.env);

export default defineConfig({
  server: {
    port: 5174,
  },
  plugins: [reactRouter()],
});
