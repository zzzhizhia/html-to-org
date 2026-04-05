import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/dom.ts"],
  format: ["cjs", "esm"],
  dts: true,
  target: "node20",
  clean: true,
  splitting: true,
});
