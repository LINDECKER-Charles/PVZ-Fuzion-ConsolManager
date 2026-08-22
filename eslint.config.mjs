import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import globals from "globals";

/**
 * Flat config (ESLint 9/10).
 *
 * Layers:
 *   - @eslint/js recommended
 *   - typescript-eslint recommended (NON type-checked: keeps lint fast, no
 *     program build; the `npm run typecheck` script covers type-aware checks)
 *   - eslint-plugin-security recommended
 *   - the numeric limits declared in CLAUDE.md, so "vérifiable" means the
 *     linter actually verifies them instead of leaving them to review
 */

/** Size and complexity ceilings — mirror of the CLAUDE.md table. */
const LIMIT_RULES = {
  "max-lines": ["error", { max: 300, skipBlankLines: false, skipComments: false }],
  "max-lines-per-function": [
    "error",
    { max: 30, skipBlankLines: false, skipComments: false, IIFEs: true },
  ],
  "max-params": ["error", 3],
  "max-depth": ["error", 3],
  complexity: ["error", 10],
  "max-len": ["error", { code: 100, ignoreUrls: true }],
};
/**
 * Underscore-prefixed args/vars are intentional placeholders (unused interface
 * params, destructuring rest). Standard convention, shared by every source tree.
 */
const UNUSED_VARS_RULE = {
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
  ],
};

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "coverage/",
      "PvZ_Fusion_Translator/",
      "site/dist/",
      "**/*.config.ts",
      "**/*.config.mjs",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,

  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...LIMIT_RULES,
      ...UNUSED_VARS_RULE,

      /**
       * Disabled security rules — high false-positive rate for a *local CLI
       * tool*, not a network-facing service.
       *
       * This binary is run by a developer/translator on their own machine to
       * read and rewrite Plants vs Zombies: Fusion game files. Paths are built
       * from a project root + known game filenames, and object keys come from
       * the game's own JSON dumps — there is no untrusted remote input and no
       * injection surface, so these rules only flag intentional, safe patterns.
       */
      // Dynamic object indexing (node[segment], obj[key]) is pervasive and safe
      // here: keys originate from parsed game JSON, not user-controlled input.
      "security/detect-object-injection": "off",
      // The tool's whole job is reading/writing game files via constructed paths
      // (src/parsers/loaders.ts, src/tools/migration.ts). Not an injection vector.
      "security/detect-non-literal-fs-filename": "off",
      // No dynamic require() in this ESM codebase; rule only yields noise.
      "security/detect-non-literal-require": "off",
    },
  },

  {
    // Landing page (site/): same ceilings, browser globals instead of Node.
    // The security ruleset stays fully on — this code runs on visitors' machines.
    files: ["site/src/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...LIMIT_RULES,
      ...UNUSED_VARS_RULE,
      // Lookups are keyed by closed string-literal unions (RunId, LiveScreen)
      // over the page's own static catalog — no visitor-controlled key ever
      // reaches them, so the rule would only flag typed table lookups.
      "security/detect-object-injection": "off",
    },
  },

  {
    files: ["tests/**/*.ts"],
    rules: {
      // Test doubles/spies legitimately use `any`; existing targeted disables
      // cover the rest. Relax it project-wide for the test tree only.
      "@typescript-eslint/no-explicit-any": "off",

      // A `describe`/`it` callback is a suite declaration, not a unit of logic:
      // the "one function does one thing" ceiling does not apply to it. File
      // size, parameters, nesting, complexity and line length still do.
      "max-lines-per-function": "off",
    },
  },
);
