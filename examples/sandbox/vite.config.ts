import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ["@haydn/core", "@haydn/renderer-webgpu"],
  },
});
