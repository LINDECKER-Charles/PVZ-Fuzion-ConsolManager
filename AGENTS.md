# AGENTS.md

Instructions for coding agents working **on** this repository. To **use** the CLI from an
agent instead, read [skills/pvzf-console/SKILL.md](skills/pvzf-console/SKILL.md).
Human contributors: [CONTRIBUTING.md](CONTRIBUTING.md) states the same rules with their
rationale, and [docs/internals/architecture.md](docs/internals/architecture.md) maps the code.

`@charles_lindecker/pvzf-console` is a TypeScript CLI/TUI (strict, ESM, Node ≥ 20) that manages
the translations of *Plants vs Zombies: Fusion*: it scans the localization files, writes
per-locale reports, exports Trello CSVs and turns PR recaps into contributor documentation.

## Project map

| Path | Holds |
| --- | --- |
| `src/core/` | Data shapes, comparison logic, the strict JSON scanner — no IO |
| `src/parsers/` | Reading game JSON, enumerating locales, per-file diffs |
| `src/reporting/` | Every output format: Markdown, JSON diff, CSV |
| `src/tools/` | Orchestration of parsers + reporting; `agent-skills/` wraps the `skills` library |
| `src/cli/` | `main.ts` dispatch, prompts, theming; `headless/` = argv commands, `screens/` = TUI |
| `skills/pvzf-console/` | The Agent Skill shipped in the npm package and installed by the TUI |
| `site/` | Landing page (`public/` static, `src/` behaviour); `site/public/llms.txt` |
| `docs/` | Published documentation; `docs/archived/` is local-only |
| `tests/` | Vitest suites mirroring `src/` |

Each layer imports only the ones below it: `core` ← `parsers`/`reporting` ← `tools` ← `cli`.
Screens never import prompt functions from `menus.ts` (types are fine): they go through
`AppDeps`. Headless commands are registered in `src/cli/headless/registry.ts`.

## Commands

```bash
npm ci
npm run dev -- --help     # run from source (tsx)
npm run typecheck
npm run lint:security     # ESLint, zero warnings — the CI gate, size limits included
npm test                  # npm run test:cov for the 75% coverage gate
npm run build             # dist/cli.js; npm run build:site for the landing page
```

Before handing work over: `npm run lint:security && npm run typecheck && npm run test:cov &&
npm run build`. Tests need no game files; fixtures are built in temporary directories. Never
write into a real `PvZ_Fusion_Translator/` folder while testing, and never commit one.

## commit

- Style: Conventional Commits — language: en
- Scopes (path → scope):
  - `src/cli/screens/**` → `cli/screens`
  - `src/cli.ts`, `src/cli/**` → `cli`
  - `src/core/**` → `core`
  - `src/parsers/**` → `parsers`
  - `src/reporting/**` → `reporting`
  - `src/tools/pr-resume/**` → `tools/pr-resume`
  - `src/tools/**` → `tools`
  - `src/config.ts`, `src/settings.ts`, `src/settings-storage.ts` → `settings`
  - `skills/**` → `skills`
  - `site/**` → `site`
  - `data/**` → `data`
  - `.github/workflows/**` → `workflows`
  - `.github/**` → `ci`
  - `tsconfig.json`, `tsup.config.ts`, `tsup.site.config.ts`, `vitest.config.ts`, `package.json`,
    `package-lock.json` → `infra`
  - `eslint.config.mjs`, `.semgrep.yml`, `.gitleaks.toml` → `lint`
  - `README.md`, `README.dist.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`, `docs/**` → `docs`

Format `type(scope): description` — types `feat`, `fix`, `docs`, `refactor`, `perf`, `test`,
`style`, `build`, `ci`, `chore`, `revert`. The scope is mandatory, the subject is at most 72
characters, lower-case, imperative, without a trailing period. Breaking changes carry a
`BREAKING CHANGE:` footer.

Exception: a commit whose *type* is `ci` and which only touches `.github/` is written
`ci(workflows): …`, never `ci(ci): …`.

One commit is one coherent change: group by feature, never mix two subjects. Tests
(`*.test.*`, `tests/**`) travel with the code they test; changelog entries travel with the
feature or fix they document.

Branches use the same vocabulary: `type/short-description`, kebab-case, two to five words
(`feat/detail-strings-diff`), always the short type (`feat/`, never `feature/`).

## Code conventions

The numeric limits are **enforced by ESLint** (`npm run lint:security` fails on them); the
principles are defaults to follow unless there is an explicit, stated reason not to.

| Rule | Limit |
| --- | --- |
| Lines per file | 300 |
| Files per directory | 10 — split into a sub-folder by domain past it |
| Lines per function | 30 (tests exempt) |
| Parameters | 3 — group them into an object past that |
| Nesting depth | 3 |
| Cyclomatic complexity | 10 |
| Line length | 100 |

- **DRY**: one rule lives in one place — but do not abstract before the third repetition.
- **KISS**: the simplest solution that really solves the problem.
- **SOLID**, notably single responsibility and depending on abstractions (`AppDeps`,
  `AppContext`, the `AgentSkillsGateway` port) rather than on implementations.
- **One public element per file**, named after the file.
- **No magic numbers or strings**: named constants that state the intent.
- **Naming**: `camelCase` values and functions, `PascalCase` types and classes,
  `SCREAMING_SNAKE_CASE` module constants, `kebab-case` file names; intention-revealing names,
  no cryptic abbreviations; booleans read as questions (`isActive`, `hasSkill`).
- **Functions** do one thing, are pure where possible, return early instead of nesting, take no
  flag parameter, and either change state or return a value, never both (CQS).
- **ESM and strict TypeScript**: `node:` specifiers, extension-less intra-package imports, no
  `any` in `src/`. Comments explain a *why* the code cannot.
- **Runtime dependencies** are `@clack/prompts`, `picocolors` and `skills` (lazy-loaded, Node
  22.20+). Adding one needs a good reason: each lands on every user's machine.

## Invariants

Breaking one is a bug, not a design change — the full list is in
[architecture.md](docs/internals/architecture.md#invariants).

- An existing locale file is never overwritten (`wx` writes in `src/tools/migration.ts`).
- Nothing is written after a cancelled prompt.
- No network call: the `skills` library is only handed a local folder, with telemetry off.
- `main()` returns an exit code instead of calling `process.exit`; headless runs print one JSON
  document on stdout with `--json`, warnings on stderr. Exit codes: 0 ok, 1 runtime, 2 usage.

## Tests

- Every feature ships with its tests, in the same branch and pull request.
- Only what the feature needs: the nominal path and the edge cases it introduces. No
  coverage-chasing, no redundant tests, no testing the framework or third-party libraries.
- A good test fails when the **behaviour** breaks, not when the implementation changes.
- Screens are driven through a stubbed `AppDeps` (`tests/cli/_fakes.ts`); clack prompts against
  in-memory streams (`tests/cli/_scripted-io.ts`).

## Documentation to keep in sync

| When you change… | Update |
| --- | --- |
| A screen or a headless command | `docs/guide/usage.md`, `README.md`, `README.dist.md` |
| A headless command, option or exit code | `skills/pvzf-console/SKILL.md` |
| A translation category or game file | `docs/guide/catalog.md` |
| An output file | `docs/guide/outputs.md` |
| The code layout | `docs/internals/architecture.md`, the project map above |
| A documentation path | `site/public/llms.txt` |
