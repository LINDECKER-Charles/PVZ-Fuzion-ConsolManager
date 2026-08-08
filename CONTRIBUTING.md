# Contributing

Thanks for taking the time. Issues, bug reports and pull requests are all welcome — this is a
small, single-maintainer project, so a short issue before a large pull request usually saves
everyone effort.

- [Ways to help](#ways-to-help)
- [Development setup](#development-setup)
- [npm scripts](#npm-scripts)
- [Code standards](#code-standards)
- [Tests](#tests)
- [Commits](#commits)
- [Branches](#branches)
- [Pull requests](#pull-requests)
- [Adding a translation category](#adding-a-translation-category)
- [Releasing](#releasing)
- [Reporting a vulnerability](#reporting-a-vulnerability)

---

## Ways to help

- **Report a bug** — include your OS, `node --version`, the command or menu path you took,
  and what the console printed. A locale name and the offending JSON snippet help a lot.
- **Suggest a translation category** the game added and the toolkit does not cover yet.
  See the current list in [docs/catalog.md](docs/catalog.md).
- **Improve the docs** — if something in this repository misled you, that is a bug too.
- **Send a patch.** Small, focused pull requests get reviewed fastest.

## Development setup

```bash
git clone https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager.git
cd PVZ-Fuzion-ConsolManager
npm install

npm run dev          # run the console live from source, via tsx
npm test             # the full Vitest suite
npm run typecheck    # tsc --noEmit, strict
npm run lint         # style + the size/complexity limits
```

You need Node 20 or newer, and a `PvZ_Fusion_Translator/` folder to exercise the tools by
hand — the repository already sits next to one in the usual layout, and the auto-discovery
described in [docs/usage.md](docs/usage.md#pointing-it-at-the-game-files) will find it.

Nothing in the test suite needs the game files: fixtures are built in temporary directories.

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run the TUI live from source (`tsx src/cli.ts`). |
| `npm run build` | Bundle `src/cli.ts` to `dist/cli.js` with tsup. |
| `npm run typecheck` | `tsc --noEmit` over `src/` and `tests/`, strict. |
| `npm run lint` | ESLint: style, TypeScript rules, security ruleset, size and complexity limits. |
| `npm run lint:security` | Same, failing on any warning — the gate CI uses. |
| `npm test` | Vitest, one pass. |
| `npm run test:cov` | Vitest with V8 coverage and the 75% gate. |

CI runs lint, typecheck, coverage and build on Node 20 and 22 (Linux) plus one macOS and one
Windows job, because path handling and the per-user config directory differ per platform.

## Code standards

The full rationale lives in [docs/architecture.md](docs/architecture.md); this is the short
version. **The numeric limits are enforced by ESLint**, so a build failure is the first
feedback you will get:

| Rule | Limit |
| --- | --- |
| Lines per file | 300 |
| Lines per function | 30 |
| Parameters | 3 (group them into an object past that) |
| Nesting depth | 3 |
| Cyclomatic complexity | 10 |
| Line length | 100 |
| Files per directory | 10 — split into a sub-folder by domain past it |

Beyond the numbers:

- **Respect the layer boundaries.** `core/` is pure, `parsers/` reads, `reporting/` writes,
  `tools/` orchestrates, `cli/` talks to the human. No layer imports the one above it, and no
  screen imports `menus.ts` directly — go through `AppDeps`.
- **One public element per file**, named after the file. `kebab-case` filenames,
  `camelCase` values, `PascalCase` types, `SCREAMING_SNAKE_CASE` module constants.
- **No magic numbers or strings** — name them, so the constant explains the intent.
- **Guard clauses over nesting**, pure functions where possible, and a function that needs an
  "and" to be described should be two functions.
- **Booleans read as questions**: `isDumpsSource`, `hasDuplicates`, `shouldRetry`.
- **Keep the runtime dependency-free.** The engine is plain Node plus the standard library;
  the only runtime dependencies are the two terminal ones already present, and adding a third
  needs a good reason — every one of them lands on end users' machines.
- **ESM and strict TypeScript.** `node:` specifiers for built-ins, extension-less intra-package
  imports, no `any` in `src/`.
- **Comments earn their place.** Explain a *why* that the code cannot; skip the rest.

## Tests

Every feature ships with its tests, in the same pull request.

- Cover the nominal path and the edge cases the feature introduces — nothing more. No
  coverage-chasing, no re-testing Vitest or Node.
- A good test fails when the **behaviour** breaks, not when the implementation is
  rearranged. Assert on written files, returned values and printed lines, not on internals.
- Screens are tested through a stubbed `AppDeps` with scripted answers; see
  `tests/cli/_fakes.ts` and `tests/cli/_scripted-io.ts` for the helpers.
- The coverage gate is 75% on lines, functions, branches and statements. It is a floor, not a
  target.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), **in English**, subject at most
72 characters, no trailing period, imperative-ish description in lower case:

```text
type(scope): description
```

| Type | Use for |
| --- | --- |
| `feat` | a new capability |
| `fix` | a bug fix |
| `docs` | documentation only |
| `refactor` | behaviour-preserving restructuring |
| `perf` | performance |
| `test` | tests only |
| `style` | formatting with no semantic effect |
| `build` | dependencies, bundling, tooling |
| `ci` | pipelines |
| `chore` | maintenance that fits nowhere else |
| `revert` | undo a previous commit |

The scope is mandatory and comes from the path you touched:

| Path | Scope |
| --- | --- |
| `src/cli/screens/**` | `cli/screens` |
| `src/cli.ts`, `src/cli/**` | `cli` |
| `src/core/**` | `core` |
| `src/parsers/**` | `parsers` |
| `src/reporting/**` | `reporting` |
| `src/tools/pr-resume/**` | `tools/pr-resume` |
| `src/tools/**` | `tools` |
| `src/config.ts`, `src/settings.ts`, `src/settings-storage.ts` | `settings` |
| `data/**` | `data` |
| `.github/workflows/**` | `workflows` |
| `.github/**` | `ci` |
| `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `package*.json` | `infra` |
| `eslint.config.mjs`, `.semgrep.yml`, `.gitleaks.toml` | `lint` |
| `README*.md`, `docs/**` | `docs` |

One commit is one coherent change: group by feature, never mix two subjects. Tests travel
with the code they test. A commit whose type is `ci` and which only touches `.github/` is
written `ci(workflows): …`, never `ci(ci): …`. Breaking changes carry a `BREAKING CHANGE:`
footer.

## Branches

Same vocabulary, applied to the branch name:

```text
type/short-description
```

`kebab-case`, no accents, two to five words that name the subject — `feat/detail-strings-diff`,
`fix/windows-config-path`, `docs/architecture-map`. Always the short form (`feat/`, not
`feature/`). One branch, one subject; it starts from `main` and returns through a pull request.

## Pull requests

Before opening one:

```bash
npm run lint && npm run typecheck && npm run test:cov && npm run build
```

Then check that:

- [ ] the change is covered by tests that fail without it;
- [ ] user-visible behaviour is reflected in the docs — [docs/usage.md](docs/usage.md) for
      screens and commands, [docs/catalog.md](docs/catalog.md) for new files or categories,
      [docs/outputs.md](docs/outputs.md) for new artifacts;
- [ ] settings stay backward-compatible — no field renamed, new fields have a default;
- [ ] no new runtime dependency slipped in;
- [ ] commits follow the convention above.

Describe *why* in the pull request body. The *what* is in the diff.

## Adding a translation category

The most common contribution, and a deliberately mechanical one. Say the game ships a new
`Strings/detail_strings.json`:

**1. Parse it.** In `src/parsers/strings.ts`, export the filename constant and a
`diffDetailStrings(root, sourceLocale, target)` built on the existing `diffFile` helper. For
an ID-matched entity file, add a loader to `parsers/almanac.ts` instead and reuse
`missingById` from `core/diff.ts`.

**2. Report it.** Add `buildDetailStringsReport` to `reporting/strings-report.ts` — a spec
object plus one exported function — and `buildDetailStringsDiff` to `reporting/diff-json.ts`.
Both must return `null` on an empty input, so a clean locale writes no file.

**3. Register it.** In `src/tools/scan.ts`, build the scanner with `stringsScanner` (or
`almanacScanner`) and append the descriptor to `TRANSLATION_TYPES` with the next free key.
Pass `requiredFile` and a `hint` if the locale has to own the file before the diff means
anything. The interactive menu, `[0] All types` and the headless `diff` command all read this
registry — there is nothing else to wire.

**4. Export it.** Add the list constant in `src/tools/trello-export.ts` and one line in
`stringListCards`. The CSV writer groups by list name on its own.

**5. Document and test it.** Add the row to [docs/catalog.md](docs/catalog.md), and a suite
covering: an entry missing from the target, an entry present but empty, and a clean locale
writing nothing.

## Releasing

Maintainer checklist:

1. Bump `version` in `package.json` and write the release notes (`docs/release-notes.md`,
   kept local, then published on the GitHub release).
2. Update the supported-versions table in [SECURITY.md](SECURITY.md) if the minor changed.
3. `npm run lint && npm run typecheck && npm run test:cov && npm run build`.
4. `npm publish` — `prepublishOnly` re-runs the bundler, so `dist/` can never be stale.
5. Tag the release and let CI confirm green on all four platform jobs.

## Reporting a vulnerability

Do not open a public issue. [SECURITY.md](SECURITY.md) has the private channels, the
in-scope/out-of-scope list and the response targets.
