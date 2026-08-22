import { defineConfig } from "tsup";

/**
 * Landing page bundle (GitHub Pages). `site/public/` is copied verbatim into
 * the output next to the compiled script, so `site/dist/` is the complete,
 * self-contained artifact the Pages workflow uploads.
 */
export default defineConfig({
  entry: { "js/site": "site/src/main.ts" },
  format: ["esm"],
  target: "es2022",
  platform: "browser",
  outDir: "site/dist",
  publicDir: "site/public",
  clean: true,
  sourcemap: false,
  minify: true,
  tsconfig: "site/tsconfig.json",
});
