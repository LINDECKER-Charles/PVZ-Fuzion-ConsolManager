import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      // Excluded: code that only exists to reach the real terminal.
      // `cli.ts` is the shebang shim, `banner.ts`/`theme.ts` are pure
      // presentation, `deps.ts` binds the screens to the process streams.
      // `menus.ts` and `output.ts` are measured: they are driven for real
      // against in-memory streams in `tests/cli/`.
      exclude: [
        "src/cli.ts",
        "src/cli/banner.ts",
        "src/cli/deps.ts",
        "src/cli/theme.ts",
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
