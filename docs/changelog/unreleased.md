# Unreleased

| | |
| --- | --- |
| Period | 2026-08-08 → 2026-08-22 (9 commits) |
| Tag | not tagged yet |
| npm | not published |
| Release notes | none |

Nine commits on main since v1.6.0 with no code change to the CLI itself (nothing under src/ is
touched). The project gained a public landing page (site/) with an interactive, keyboard-driven
replica of the console, built by a second tsup bundle and deployed to GitHub Pages by a new
workflow. The README was cut down to a front page and its content moved into a linked docs/ set plus
CONTRIBUTING.md and CODE_OF_CONDUCT.md; a sponsor button and support section were added. Dependabot
moved from a monthly to a weekly cadence, dev dependencies were refreshed in the lockfile, and
github/codeql-action was bumped. package.json still reads 1.6.0.

## Added

- Landing page under `site/`: static markup and styles in `site/public/` (`index.html`,
  `css/base.css`, `css/sections.css`, `css/terminal.css`, `assets/favicon.svg` and four tool icons
  as SVG) and the behaviour in `site/src/` (`effects/`: hero glow, animated stats counter, scroll
  reveal, scroll spy, copy-to-clipboard buttons; `effects/motion.ts` reads `prefers-reduced-motion`
  once and `main.ts` then skips the glow, counter and reveal effects and starts the demo paused). No
  framework, no runtime dependency; the only external fetches are two Google Fonts families (Chivo
  Mono, Instrument Sans).
  ([`b98459d`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/b98459d))
- Interactive console demo (`site/src/terminal/`): autoplay loops over four scripted scenarios —
  `diff`, `migrate`, `trello`, `pr` (labelled pr-resume) — selectable from chips and from the tool
  cards (`data-scenario`), with pause/play and a speed cycle (1×, 1.5×, 2×, 0.5×; frames never held
  under 20 ms). Clicking the screen with a non-touch pointer, or pressing one of the handled keys,
  hands the keyboard to the visitor: a pure reducer (`live-session.ts`, `(state, key) → (state,
  effect)`) models the TUI's main menu, locale/category/tools/docs pickers and settings screen on
  ArrowUp/ArrowDown/Enter/Escape and can 'run' six fake tools (diff, migrate tips & buffs, migrate
  custom levels, Trello export, duplicate check, PR recap), revealing one row every 300 ms (scaled
  by speed). Escape during a run shows a 'cancelled' screen then returns to the main menu; 'Exit'
  shows a farewell screen then resumes autoplay. Screens are built as data (`catalog.ts`,
  `screens/`), rendered through a `TerminalViewPort` interface (`terminal-port.ts`, DOM
  implementation in `terminal-view.ts`, wiring in `terminal-bindings.ts`). Unit tests under
  `tests/site/` cover the autoplay, the live reducer, the scenarios, the screens and the controller
  without a DOM.
  ([`b98459d`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/b98459d))
- Documentation set under `docs/`: `docs/README.md` (index by audience), `usage.md` (install,
  project-root discovery, every menu screen, headless commands, exit codes, CI usage), `catalog.md`
  (locales, diff sources, categories, migration targets, duplicate targets, Trello lists, out of
  scope), `configuration.md` (settings reference, per-platform storage, on-disk format, environment
  variables, upgrade notes from 1.4.1), `outputs.md` (anatomy of every report, JSON diff, CSV and
  summary), `architecture.md` (layers, seams, invariants, enforced limits, testing strategy,
  extension points), `troubleshooting.md`, plus SVG diagrams and icons in `docs/assets/` (banner,
  layers, scan pipeline, four tool icons).
  ([`4df68ca`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4df68ca))
- `CONTRIBUTING.md` (ways to help, dev setup, npm scripts, code standards, tests, commit and branch
  conventions, pull requests, adding a translation category, releasing, vulnerability reporting) and
  a short `CODE_OF_CONDUCT.md` adapted in spirit from the Contributor Covenant, with private
  reporting to charles.lindecker@outlook.fr.
  ([`4df68ca`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4df68ca))
- `.github/FUNDING.yml` (`github: [LINDECKER-Charles]`, `ko_fi: charleslindecker`) enabling the
  repository's Sponsor button, and a Support section in both `README.md` (with two new badges,
  GitHub Sponsors and Ko-fi) and the npm `README.dist.md`.
  ([`cda9fe3`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/cda9fe3),
  [`3e2f39f`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/3e2f39f))

## Changed

- `README.md` no longer carries the whole manual (597 lines removed): it is now a front page — Quick
  start, What it does, Using the console, Using it headlessly, Where things land, Documentation,
  Security, Contributing, Credits, License — linking to `docs/` and `CONTRIBUTING.md`. The commit
  body states the old README had drifted from the code.
  ([`4df68ca`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4df68ca))
- `.gitignore` stops ignoring `docs` wholesale; only the working material stays local:
  `docs/reports/`, `docs/release-notes.md`, `docs/discord-announcement.md`,
  `docs/old-release-note.md`.
  ([`4df68ca`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4df68ca))
- `README.dist.md` (npm README): the 'Migrate tips & buffs' paragraph is rewritten to match current
  behaviour — keys come from the raw `Dumps/`, each value is looked up in the locale's own
  `translation_strings.json`, untranslated entries are left out with a `Created tips_iz.json —
  128/402 translated` result line, and an existing file is never overwritten (the previous text
  described an all-or-nothing rebuild from the legacy file). It now points to `CONTRIBUTING.md` and
  `docs/` instead of the repo README.
  ([`4df68ca`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4df68ca))
- Dependabot checks npm and github-actions updates weekly instead of monthly
  (`.github/dependabot.yml`, same 05:00 Europe/Paris slot, same PR limits); the cooldown is
  unchanged and still does the soaking — the weekly schedule only bounds how long an already-cleared
  version waits before being proposed. README badge (`dependabot-weekly + cooldown`) and
  `SECURITY.md` updated accordingly.
  ([`6c9713c`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/6c9713c))
- `npm run typecheck` now also runs `tsc --noEmit -p site/tsconfig.json`; `site/tsconfig.json`
  extends the root config with `lib: [ES2022, DOM, DOM.Iterable]`, `types: []` (no Node types) and
  `include: [src]`.
  ([`b98459d`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/b98459d))

## Dependencies

- Dev dependencies refreshed in `package-lock.json` only (ranges in `package.json` unchanged):
  `@types/node` 26.1.2 → 26.2.0, `tsx` 4.23.7 → 4.23.12, `eslint` 10.8.0 → 10.8.1, `esbuild` 0.28.1
  → 0.28.2 (with its 26 platform packages). Deliberately held back as still inside their cooldown:
  `globals` 17.11.0, `typescript-eslint` 8.67.0, `vitest` 4.1.11, `eslint` 10.9.0. TypeScript 7
  remains blocked by typescript-eslint's peer range (`<6.1.0`).
  ([`7cc916b`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/7cc916b))

## CI

- New `.github/workflows/pages.yml`: on push to `main` touching `site/**`, `tsup.site.config.ts`,
  `tsconfig.json`, `package.json`, `package-lock.json` or the workflow itself (and on
  `workflow_dispatch`), a `build` job on Node 22 (`actions/checkout@v7`, `actions/setup-node@v7`)
  runs `npm ci`, lint, typecheck and tests, then `npm run build:site` and uploads `site/dist` with
  `actions/upload-pages-artifact@v5`; a `deploy` job (`actions/configure-pages@v6`,
  `actions/deploy-pages@v5`, `github-pages` environment, `pages: write` and `id-token: write`)
  publishes it. Concurrency group `pages`, no cancel-in-progress. Requires a one-time admin switch
  (Settings → Pages → Source: GitHub Actions, or `gh api -X POST repos/<owner>/<repo>/pages -f
  build_type=workflow`); until then the deploy job fails at 'Configure Pages'.
  ([`4d980e7`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4d980e7))
- `ci.yml` gains a `Build site` step (`npm run build:site`) after the CLI build in every matrix job,
  so pull requests catch a broken page before it reaches `main`.
  ([`4d980e7`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4d980e7))
- `github/codeql-action` (`init` and `analyze` in `ci.yml`) bumped 4.37.4 → 4.37.6.
  ([`bfe0dc4`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/bfe0dc4))

## Build

- New `npm run build:site` script backed by `tsup.site.config.ts`: bundles `site/src/main.ts` as
  minified ESM (target es2022, browser platform, no sourcemap, `clean: true`) to
  `site/dist/js/site.js` and copies `site/public/` next to it (`publicDir`), so `site/dist/` is the
  complete Pages artifact. `site/dist/` is gitignored.
  ([`b98459d`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/b98459d))
- `eslint.config.mjs`: a dedicated block for `site/src/**/*.ts` with browser globals, the same
  size/complexity ceilings (`LIMIT_RULES`) and the full security ruleset, except
  `security/detect-object-injection` (lookups are keyed by closed string-literal unions
  `RunId`/`LiveScreen` over the static catalog); `site/dist/` added to the ignore list; the
  `@typescript-eslint/no-unused-vars` configuration extracted into a shared `UNUSED_VARS_RULE`
  constant.
  ([`b98459d`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/b98459d))

## Docs

- `CONTRIBUTING.md` documents `npm run build:site`, the extended `typecheck`, the fact that CI runs
  both builds, and a new 'Landing page' subsection: layout of `site/`, how to preview (`npm run
  build:site` then `npx serve site/dist` or `python -m http.server -d site/dist`, since the page is
  an ES module browsers refuse to load from `file://`), and the one-time Pages setup. `README.md`
  links the website (https://lindecker-charles.github.io/PVZ-Fuzion-ConsolManager/) at the top and
  in the Documentation table; `docs/architecture.md` describes the landing page as a second,
  independent bundle whose terminal demo re-implements the TUI screens as pure data.
  ([`0722c36`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/0722c36))
- `docs/` sorted by audience and purpose: the user pages move to `docs/guide/` (`usage`,
  `configuration`, `catalog`, `outputs`, `troubleshooting`), `architecture.md` to `docs/internals/`,
  and every link (root README, CONTRIBUTING, the landing page, cross-references) follows. Two
  tracked history folders are added — `docs/release/` (the GitHub release notes reproduced verbatim
  with tag, commit, publish dates and assets, plus the never-published 1.5.0 draft) and
  `docs/changelog/` (this history, one file per version, every commit since 2025-10-30 accounted
  for). The local working material (release drafts, Discord announcement, dated audits) moves under
  the gitignored `docs/archived/`, which replaces the four file-level ignore rules. The release
  checklist in CONTRIBUTING now writes both history files before tagging.

## Notes

- No tag after v1.6.0 (v1.6.0 = c2ee3f1, the commit immediately before this range; HEAD is
  `v1.6.0-9-g0722c36`). `package.json` still reads 1.6.0 across the whole range; no version bump, no
  npm publish implied.
- None of the nine commits touches `src/`: the published CLI is unchanged; this range is docs,
  repository metadata, tooling and the landing page.
- All commit messages are in English, single author (LINDECKER Charles). No Dependabot merge commits
  in this range: the codeql-action bump (bfe0dc4) and the dev-dependency refresh (7cc916b) were
  committed directly by the maintainer, without PR numbers.
- cda9fe3 uses the scope `ci(funding)` although the project's scope map maps `.github/**` to
  `ci`/`workflows`; cosmetic only.
- The landing page is outside the npm tarball (`files` in package.json remains `dist/`, `data/`,
  `README.md`, `README.dist.md`).
- `vitest.config.ts` was not changed: `tests/site/**` runs under `npm test` via the existing
  `tests/**/*.test.ts` include, but coverage `include` is still `src/**/*.ts`, so `site/src/` is not
  counted in the 75% gate. Observed from the config, not stated in any commit.
- Whether the one-time GitHub Pages setup (source = GitHub Actions) has been done is not visible in
  git; the workflow documents that the deploy job fails at 'Configure Pages' until it is.
- The README.dist.md rewrite of the 'Migrate tips & buffs' behaviour (4df68ca) is a documentation
  correction; the behaviour change itself belongs to an earlier release and was not verified in this
  range.
- The demo's numbers (19 locales, 8 categories, row counts such as 128/402) are static fixtures in
  `site/src/terminal/catalog.ts`, not live data.

## Commits (9)

| Hash | Date | Author | Subject |
| --- | --- | --- | --- |
| [`4df68ca`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4df68ca) | 2026-08-08 | LINDECKER Charles | docs: split the README into a linked documentation set |
| [`cda9fe3`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/cda9fe3) | 2026-08-08 | LINDECKER Charles | ci(funding): add FUNDING.yml to enable the sponsor button |
| [`3e2f39f`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/3e2f39f) | 2026-08-08 | LINDECKER Charles | docs: add a support section to the README and the npm README |
| [`6c9713c`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/6c9713c) | 2026-08-21 | LINDECKER Charles | ci(workflows): switch Dependabot to a weekly schedule |
| [`7cc916b`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/7cc916b) | 2026-08-21 | LINDECKER Charles | build(infra): refresh dev dependencies past the cooldown |
| [`bfe0dc4`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/bfe0dc4) | 2026-08-21 | LINDECKER Charles | ci(workflows): bump github/codeql-action from 4.37.4 to 4.37.6 |
| [`b98459d`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/b98459d) | 2026-08-22 | LINDECKER Charles | feat(site): add the landing page bundle with an interactive console demo |
| [`4d980e7`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/4d980e7) | 2026-08-22 | LINDECKER Charles | ci(workflows): build the landing page in CI and deploy it to GitHub Pages |
| [`0722c36`](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/commit/0722c36) | 2026-08-22 | LINDECKER Charles | docs: document the landing page, its preview and the Pages setup |
