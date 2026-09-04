import "@packages/env/server";
import { createViteEnv } from "@packages/env/client";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

createViteEnv(import.meta.env);

export default defineConfig({
  server: {
    port: 3003,
  },
  plugins: [tanstackStart({ srcDirectory: "src" }), viteReact()],
});
