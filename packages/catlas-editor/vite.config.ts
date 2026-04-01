import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type ProxyOptions } from "vite-plus";

const createApiProxy = (): ProxyOptions => ({
  target: "http://127.0.0.1:1355",
  changeOrigin: false,
  headers: {
    host: "api.catlas.localhost:1355",
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: process.env.HOST,
    port: Number(process.env.PORT),
    proxy: {
      "/auth": createApiProxy(),
      "/changesets": createApiProxy(),
      "/nodes": createApiProxy(),
      "/relations": createApiProxy(),
      "/viewport": createApiProxy(),
      "/ways": createApiProxy(),
    },
  },
});
