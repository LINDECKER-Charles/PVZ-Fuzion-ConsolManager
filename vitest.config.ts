import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // `site/src/` is listed on purpose: vitest 4 matches `src/**` at any
      // depth and has always counted the demo modules `tests/site/` imports;
      // vitest 5 anchors the glob to the root and would silently drop them.
      include: ["src/**/*.ts", "site/src/**/*.ts"],
      // Excluded: code that only exists to reach the real terminal or the DOM.
      // `cli.ts` is the shebang shim, `banner.ts`/`theme.ts` are pure
      // presentation, `deps.ts` binds the screens to the process streams.
      // `menus.ts` and `output.ts` are measured: they are driven for real
      // against in-memory streams in `tests/cli/`.
      // On the site, `main.ts`, `dom.ts` and `effects/` drive the page, and
      // `terminal-view.ts`/`terminal-bindings.ts` are the DOM side of the
      // `TerminalViewPort` seam; the demo's logic is tested without a DOM.
      exclude: [
        "src/cli.ts",
        "src/cli/banner.ts",
        "src/cli/deps.ts",
        "src/cli/theme.ts",
        "site/src/main.ts",
        "site/src/dom.ts",
        "site/src/effects/**",
        "site/src/terminal/terminal-bindings.ts",
        "site/src/terminal/terminal-view.ts",
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
    },
  },
});
