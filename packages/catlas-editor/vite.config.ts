import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\/(.*)$/,
        replacement: fileURLToPath(new URL("./src/$1", import.meta.url)),
      },
      {
        find: /^@catlas\/domain$/,
        replacement: fileURLToPath(new URL("../domain/src/index.ts", import.meta.url)),
      },
      {
        find: /^@catlas\/domain\/(.*)$/,
        replacement: fileURLToPath(new URL("../domain/src/$1", import.meta.url)),
      },
      {
        find: /^@catlas\/schema$/,
        replacement: fileURLToPath(new URL("../schema/src/index.ts", import.meta.url)),
      },
      {
        find: /^@catlas\/schema\/(.*)$/,
        replacement: fileURLToPath(new URL("../schema/src/$1", import.meta.url)),
      },
    ],
  },
  server: {
    proxy: {
      "/auth": "http://api.catlas.localhost:1355",
      "/changesets": "http://api.catlas.localhost:1355",
      "/nodes": "http://api.catlas.localhost:1355",
      "/relations": "http://api.catlas.localhost:1355",
      "/viewport": "http://api.catlas.localhost:1355",
      "/ways": "http://api.catlas.localhost:1355",
    },
  },
  plugins: [react(), tailwindcss()],
});
