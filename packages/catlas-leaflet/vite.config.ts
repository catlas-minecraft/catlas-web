import { defineConfig } from "vite-plus";

export default defineConfig({
  server: {
    host: process.env.HOST,
    port: Number(process.env.PORT),
  },
  pack: {
    entry: ["src/index.ts"],
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
