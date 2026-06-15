import { defineConfig } from "vite-plus";

// https://vite.dev/config/
export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    tsconfig: "tsconfig.src.json",
    unbundle: true,
    dts: {
      tsconfig: "tsconfig.src.json",
      tsgo: true,
    },
    exports: true,
  },
});
