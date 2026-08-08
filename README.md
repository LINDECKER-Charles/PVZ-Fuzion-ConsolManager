# 🌱 PVZ Fuzion Console Manager

> Translation toolkit for **Plants vs Zombies: Fusion**.
> Scans every locale against the English source, generates per-locale Markdown
> reports, migrates the new tips format, checks for duplicates, exports
> Trello-ready CSV backlogs, and turns the weekly PR recap into contributor
> documentation.

[![node](https://img.shields.io/badge/node-%E2%89%A520-green)](https://nodejs.org/)
[![typescript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](#-license)

---

## 📑 Table of contents

- [What it does](#-what-it-does)
- [Prerequisites](#-prerequisites)
- [Install & run](#-install--run)
- [Features](#-features)
- [Interactive menu reference](#-interactive-menu-reference)
- [Headless CLI](#-headless-cli)
- [Generated files](#-generated-files)
- [Settings](#-settings)
- [Project structure](#-project-structure)
- [Build & distribute](#-build--distribute)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Security](#-security)
- [Credits](#-credits)
- [License](#-license)

---

## 🎯 What it does

1. **Detects untranslated content** across every file type the game uses:
   plants, zombies, achievements, UI strings, regex translations, tips
   (I, Zombie + Fusion Showcase), Abyss buffs, Travel buffs.
2. **Writes per-locale Markdown reports** so translators see the exact source
   JSON blocks they need to translate, and optionally emits machine-readable
   **JSON diff files** that can be re-injected into the locale.
3. **Migrates the new tips format** — rebuilds `tips_iz.json` / `tips_fs.json`
   from the legacy `translation_strings.json`, all-or-nothing.
4. **Checks for duplicates** — surfaces duplicate JSON keys and values shared
   by multiple keys, per locale.
5. **Exports Trello CSV backlogs** — one CSV per category, ready for the
   *Import to Trello by Blue Cat* Power-Up.
6. **Writes the contributor documentation** — splits the weekly translation-PR
   recap into one Markdown block per contributor, counters and reviews
   included, ready to archive.
7. **Ships as a single npm package** (`@charles_lindecker/pvzf-console`) bundled
   to one file with [tsup](https://tsup.egoist.dev/). No Python — just Node and
   two small runtime dependencies (`@clack/prompts`, `picocolors`).

---

## 📋 Prerequisites

| Tool        | Version    | Why                                                  |
| ----------- | ---------- | ---------------------------------------------------- |
| **Node.js** | **≥ 20**   | The whole engine is TypeScript bundled to ESM.       |
| Git         | any        | To clone and contribute.                             |

You also need the `PvZ_Fusion_Translator/` folder. By default the tool probes
four locations (next to the install → one level up → cwd → cwd parent), and the
path is configurable from the Settings menu.

---

## 🚀 Install & run

### Option A — via npm (recommended)

```bash
npm install -g @charles_lindecker/pvzf-console   # once published

pvzf-console                           # interactive TUI
pvzf-console diff --lang French        # non-interactive
```

Or run it without installing:

```bash
npx @charles_lindecker/pvzf-console
npx @charles_lindecker/pvzf-console diff --lang French
```

### Option B — from source (recommended for devs)

```bash
git clone https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager.git
cd PVZ-Fuzion-ConsolManager
npm install

# Launch the interactive TUI live (no build step, via tsx)
npm run dev

# Or build the bundle and run it
npm run build
node dist/cli.js
```

The published package bundles everything into `dist/cli.js` (the `data/` banner
ships alongside it), so the global `bin` works straight after install.

---

## ✨ Features

### Diff engine

- Detects missing entries by primary-key lookup (O(n + m) using set membership,
  not a naive O(n·m) nested loop).
- Detects **empty values**: keys present in the locale but with an empty
  translation string — reported in a separate section of each report.
- Handles both flat dicts (`translation_strings.json`, `abyss_buffs.json`, …)
  and nested travel buffs (`category:id`, preserving their full `name`/`desc` object).
- Source of truth is configurable: diff against another locale (default
  `English`) **or** against the raw game `Dumps/` (`Dumps` source mode).
- Gracefully logs malformed JSON and continues instead of crashing the run.

### Report generators

- Almanac reports (plants / zombies / achievements): condensed `name + id`
  header plus a fenced ```` ```json ```` block with the raw source entry,
  ready to copy/translate/paste.
- Flat reports (strings / regex / tips / buffs): two sections — *Missing
  Keys* (compact JSON object) and *Empty Values* (table).
- Optional **JSON diff files** (`*_diff.json`) alongside the Markdown, holding
  the missing entries in the file's native shape so they can be merged straight
  back into the locale. Enabled with the `--with-diff` CLI flag or the prompt
  in the TUI.

### Tips migration (Translator tool)

- Rebuilds `tips_iz.json` / `tips_fs.json` from matches in
  `translation_strings.json`.
- **All-or-nothing**: if even one source tip text is missing from the
  translation strings, the migration aborts for that file and reports the gap
  count. No partial writes.
- Already-present files are preserved (no overwrite); files with no dump source
  in `Dumps/` are skipped with a notice.

### Duplicate checker (Translator tool)

- Scans every flat / nested string file for **duplicate JSON keys** (keys that
  appear more than once in the raw text — `JSON.parse` silently keeps the last,
  so a strict recursive-descent scanner catches them) and **repeated values**
  (one translation reused across multiple keys).
- Writes a `duplicates.md` report under `reports/<Locale>/` for any locale with
  matches; clean locales produce nothing.

### Trello CSV export (Translator tool)

- One CSV **per category** (Plants / Zombies / Achievements / Strings / Regex
  / Tips IZ / Tips FS / Abyss Buffs / Travel Buffs) → keeps the Trello UI
  responsive even on the largest locales.
- Columns: `Name`, `Description`, `Labels`, `List`.
- Descriptions are **JSON-fenced** (`` ```json … ``` ``). Almanac entries keep
  the full source JSON (with braces), flat entries render as `"key": "value"`
  — always with escape sequences (`\n`, `\"`, …) preserved literally so
  translators see the file exactly as it will appear on disk.
- Companion `trello_README.md` is generated alongside each export:
  - The exact Trello label to create.
  - The exact Trello lists to create (derived from the CSVs actually
    produced).
  - Full *Import to Trello by Blue Cat* Power-Up walkthrough.

### Contributor documentation (Documentation tab)

- Turns the weekly translation-PR recap into **one Markdown block per
  contributor**: week header, PR link, counters (*new* / *adjusted* /
  *reviews*), then the detail of every item they touched.
- The **lead maintainer's *Reviews* block is derived**, not written: every item
  authored by someone else is mirrored under the lead, grouped by section then
  by author. Sections whose name contains `check` are proof-reading passes and
  are excluded.
- Counters come from the section names (`new` / `nouveau` / `nouvelle` →
  *Nouvelles traductions*; `modified` / `modifi` → *Traductions ajustées*).
- The lead's identity is a **setting**, so any locale maintainer can use the
  tool: a canonical display name plus the aliases the recap may spell them with
  (`@LINDECKER-Charles`, `LINDECKER-Charles`, …) are folded into one block.
- **Nothing is written before you have seen it**: the recap is rendered and its
  stats shown first, and the file is written only on confirmation.
- No GitHub API call — the PR URL you pass in is only reinjected into each
  block's header.
- Ported from the standalone
  [`pvzf-make-pr`](https://github.com/LINDECKER-Charles/PVZF-PR-Resume) CLI;
  output is byte-identical.

### Terminal UI

- Built on [`@clack/prompts`](https://github.com/bombshell-dev/clack): arrow-key
  menus with hints, type-to-filter locale picker, inline validation, boxed
  status and result panels.
- The **locale picker switches to a filterable autocomplete** past ten locales —
  the game ships more than twenty.
- `Esc` / `Ctrl+C` leave the current screen instead of killing the process, and
  never trigger the action they interrupted; the main menu's *Exit* is the way
  out.
- Theme still honours the settings (accent color, emoji, banner) and falls back
  to `[OK] / [!] / [X]` when emoji are off.

### Persistent settings

- Stored per user, outside the package — see
  [Where settings live](#where-settings-live).
- Live-editable from `[4] Settings` in the TUI.
- Theme applied immediately (color, accent, density, emoji/banner toggles).
- On-disk format keeps snake_case keys for backward compatibility, unknown keys
  are ignored on load, and a hand-edited alias list is filtered down to usable
  strings.

### CLI

- Hand-rolled sub-command dispatch mirroring an `argparse`-style surface.
- `pvzf-console diff --lang <locale> [--out <dir>] [--with-diff]` runs every
  diff type for one locale in non-interactive mode.
- `pvzf-console pr-resume [--input <file>] [--output <file>]` generates the
  contributor summary headlessly.
- Exit codes: `0` on success, `1` on a runtime failure (unreadable recap),
  `2` on invalid arguments, locale or project root.

### Auto-discovery

- `PvZ_Fusion_Translator/` is probed in four places (install sibling → one
  level up → cwd → cwd parent) — **not recursive**, single pass.

### Cross-platform

- Pure Node runtime, ESM, no shell scripts required.
- Windows VT100 enablement so ANSI colors and emoji render on every modern
  terminal; emoji and banner can be toggled off for legacy hosts.

### Error hygiene

- Invalid project root is detected at startup (warning) **and** before every
  tool action (gated with a friendly `❌` message). No stack traces leak to
  the user.

---

## 🧭 Interactive menu reference

Navigate with `↑` `↓`, confirm with `Enter`, leave a screen with `Esc`.

```
┌  PVZF CONSOLE
│
◇  Status ──────────────────────────────────────────╮
│                                                   │
│  ✅  project   …/PvZ_Fusion_Translator            │
│  ✅  source    English                            │
│  ✅  reports   reports/                           │
│                                                   │
├───────────────────────────────────────────────────╯
│
◆  Main menu
│  ● Show what's missing   diff locales · write reports
│  ○ Translator tools      migrate · trello · duplicates
│  ○ Documentation         PR recap → contributor docs
│  ○ Settings
│  ○ Exit
└
```

### [1] Show what's missing

Pick a locale (or `*` for all), then a type:

| Option         | Source file                                           | Output file (under `reports/<Locale>/`) |
| -------------- | ----------------------------------------------------- | --------------------------------------- |
| `[0] All types`    | every type below                                  | every file below                        |
| `[1] Plants`       | `Almanac/LawnStringsTranslate.json`               | `missing_plants.md`                     |
| `[2] Zombies`      | `Almanac/ZombieStringsTranslate.json`             | `missing_zombies.md`                    |
| `[3] Achievements` | `Almanac/AchievementsTextTranslate.json`          | `missing_achievements.md`               |
| `[4] Strings (UI)` | `Strings/translation_strings.json`                | `missing_strings.md`                    |
| `[5] Regex`        | `Strings/translation_regexs.json`                 | `missing_regexs.md`                     |
| `[6] Tips (IZ + FS)` | `Strings/tips_iz.json`, `Strings/tips_fs.json`  | `missing_tips_iz.md`, `missing_tips_fs.md` |
| `[7] Abyss buffs`  | `Strings/abyss_buffs.json`                        | `missing_abyss_buffs.md`                |
| `[8] Travel buffs` | `Strings/travel_buffs.json` (nested)              | `missing_travel_buffs.md`               |

After picking a type, the TUI asks whether to **also export JSON diff files**.
Answer yes to write `*_diff.json` next to each Markdown report.

### [2] Translator tools

| Option | What it does |
| ------ | ------------ |
| `[1] Migrate tips & buffs` | Rebuilds `tips_iz.json` / `tips_fs.json` / `abyss_buffs.json` / `travel_buffs.json` from `translation_strings.json`. Single-locale only. All-or-nothing. |
| `[2] Migrate custom levels` | Builds `customlevel_strings` / `customlevel_regexs` / `custom_level_data`; key set from the source locale, translations from the target. |
| `[3] Export Trello CSV` | Produces one CSV per category under `exports/<Locale>/` plus a `trello_README.md` with the full import walkthrough. |
| `[4] Check duplicates` | Scans every string file for duplicate keys and repeated values; writes `duplicates.md` per locale with matches. |
| `[0] Back` | Returns to the main menu. |

### [3] Documentation

| Option | What it does |
| ------ | ------------ |
| `[1] PR recap → contributor summary` | Reads the weekly PR recap and writes one Markdown block per contributor. |
| `[0] Back` | Returns to the main menu. |

The tool asks for the recap file (pre-filled with the first candidate `.md` in
the working directory) and the output file (defaults to the *Docs output*
setting), renders the result, shows the per-contributor stats, and writes only
once you confirm.

**Expected input** — the first two non-empty lines are the header:

```markdown
2026-04-01..2026-04-07                      ← period (or already-formatted `01/04/26 → 07/04/26`)
https://github.com/owner/repo/pull/123      ← PR URL; the number is read from /pull/(\d+)

## 🌱 Newly Added Plants                    ← section

@lafourmiedugaming-collab :                 ← contributor: @handle, or [Name](link) :
* **Briseur de Machoir** (`seedType: 1390`) ← item

## 🔧 Modified Achievements

@Kurodatenshi :
* **D'où est-ce que je viens ?** (`achievement: 7`)
```

**Output** — one block per contributor, plus the lead's derived *Reviews*:

```markdown
## 👤 @Kurodatenshi

### 📅 Semaine — `01/04/26 → 07/04/26`
> [PR#123](https://github.com/owner/repo/pull/123)

**Résumé de la semaine**

* Nouvelles traductions : **0**
* Traductions ajustées : **1**
* Reviews effectuées : **0**

---

#### Détail

## 🔧 Modified Achievements
* **D'où est-ce que je viens ?** (`achievement: 7`)
```

The rendered output stays in French by design — it lands verbatim in the French
contributor files.

### [4] Settings

| Key             | Default            | Notes                                          |
| --------------- | ------------------ | ---------------------------------------------- |
| Project root    | auto-discovered    | Absolute path to `PvZ_Fusion_Translator/`      |
| Source locale   | `English`          | Reference used for diffs (`Dumps` for raw dumps) |
| Text color      | `default`          | Primary text                                   |
| Accent color    | `cyan`             | Headers, prompt, option keys                   |
| Density         | `comfortable`      | `compact` · `comfortable` · `spacious`         |
| Show emoji      | `true`             | Fallback: `[OK] / [!] / [X]`                   |
| Show banner     | `true`             | ASCII banner at startup                        |
| Trello label    | `To be translated` | Label written to every exported card           |
| Docs lead       | `Charles LINDECKER` | Whose *Reviews* block the Documentation tab derives |
| Docs aliases    | `@LINDECKER-Charles, LINDECKER-Charles` | Other spellings of the lead, folded into one block |
| Docs output     | `contribution-summary.md` | Default target of the contributor summary |

Supported ANSI colors: `default, red, green, yellow, blue, magenta, cyan,
white` plus their `bright_*` variants.

#### Where settings live

`settings.json` is stored per user, outside the package, so a global install in
a root-owned prefix (`/usr/local/lib/node_modules`, `C:\Program Files\nodejs`)
stays writable:

| Platform    | Path                                                        |
| ----------- | ----------------------------------------------------------- |
| macOS       | `~/Library/Application Support/pvzf-console/settings.json`   |
| Linux / BSD | `$XDG_CONFIG_HOME/pvzf-console/settings.json`, else `~/.config/pvzf-console/settings.json` |
| Windows     | `%APPDATA%\pvzf-console\settings.json`                       |

`$XDG_CONFIG_HOME` is honored on macOS too when set to an absolute path. Set
`PVZF_CONSOLE_SETTINGS=/path/to/settings.json` to pin the file somewhere else
(portable installs, CI). The active path is shown in `[4] Settings` under
*Settings file*.

Upgrading from ≤ 1.4.1, which kept `settings.json` inside the package: that file
is still read on first launch and copied to the per-user location on the next
save. The old copy is left in place, so an older install alongside keeps working
— but from then on the two no longer track each other.

---

## ⚡ Headless CLI

```bash
pvzf-console diff --lang French
pvzf-console diff --lang German --out ./out --with-diff
pvzf-console pr-resume --input recap.md --output docs/contributions.md
```

| Command                                              | Effect                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `pvzf-console`                                       | Launch the interactive TUI.                                                 |
| `pvzf-console diff --lang French`                    | Run every diff type for French, write to `./reports/French/`.               |
| `pvzf-console diff --lang French --out X`            | Same, writing to `X/French/` instead.                                       |
| `pvzf-console diff --lang French --with-diff`        | Same, plus `*_diff.json` next to each Markdown report.                       |
| `pvzf-console pr-resume`                             | Contributor summary from the first candidate `.md` in the cwd → `contribution-summary.md`. |
| `pvzf-console pr-resume --input R.md --output O.md`  | Same, with both paths given. Aliases: none — long flags only.               |

Auto-detection of the recap skips `README.md`, `README.dist.md`, `CHANGELOG.md`,
`LICENSE.md`, `CONTRIBUTING.md`, `release.md` and the output file itself.

Exit codes:

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| `0`  | Success.                                             |
| `1`  | Runtime failure — recap missing, unreadable, or lacking its two header lines. |
| `2`  | Invalid arguments, invalid locale, source locale rejected, or invalid project root (missing `Localization/` subfolder). |

Use the `diff` command in CI to fail builds when a locale regresses, and
`pr-resume` to regenerate the contributor documentation when the weekly PR
merges.

---

## 📁 Generated files

Every artifact is **grouped by locale**.

```
reports/
├── Arabic/
│   ├── missing_plants.md
│   ├── missing_zombies.md
│   ├── missing_strings.md
│   ├── missing_regexs.md
│   └── missing_travel_buffs.md
└── French/
    ├── missing_plants.md
    ├── missing_zombies.md
    ├── missing_strings.md
    ├── missing_regexs.md
    ├── duplicates.md                # only when duplicates were found
    └── strings_diff.json            # only with --with-diff / TUI opt-in

exports/
└── French/
    ├── trello_Plants.csv
    ├── trello_Zombies.csv
    ├── trello_Strings.csv
    ├── trello_Regex.csv
    ├── trello_Tips_IZ.csv
    ├── trello_Tips_FS.csv
    ├── trello_Abyss_Buffs.csv
    ├── trello_Travel_Buffs.csv
    └── trello_README.md

contribution-summary.md              # Documentation tab / pr-resume (path configurable)
```

Empty categories (0 missing entries) do not produce a file — keeps the
output tidy.

---

## 🗂️ Project structure

```
PVZ-Fuzion-ConsolManager/
├── package.json                   # npm package metadata + bin entry (dist/cli.js)
├── tsconfig.json                  # strict TypeScript, ESM, Bundler resolution
├── tsup.config.ts                 # bundle config: src/cli.ts → dist/cli.js (ESM)
├── vitest.config.ts               # test + coverage config (75% gate)
├── README.md                      # this file
├── README.dist.md                 # end-user README shipped in the npm tarball
├── data/                          # ASCII banner (title.md, logo.md)
├── tests/                         # Vitest suites mirroring src/ layout
└── src/
    ├── cli.ts                     # executable entry point (shebang injected by tsup)
    ├── config.ts                  # paths, source locale, auto-discovery
    ├── settings.ts                # AppSettings + load/save (snake_case on disk)
    ├── cli/
    │   ├── app.ts                 # App orchestration + argv parsing (DI seam)
    │   ├── banner.ts              # title renderer (reads data/title.md)
    │   ├── menus.ts               # prompts, sections, locale picker, ConsoleIO
    │   └── theme.ts               # ANSI colors + density + emoji toggle
    ├── core/
    │   ├── diff.ts                # missingById (O(n + m))
    │   └── models.ts              # AlmanacEntry / StringEntry / TrelloCard …
    ├── parsers/
    │   ├── loaders.ts             # JSON reader + locale enumeration + Dumps source
    │   ├── almanac.ts             # plant / zombie / achievement loaders
    │   └── strings.ts             # flat + nested diff helpers
    ├── reporting/
    │   ├── markdown.ts            # per-locale Markdown writers + duplicates report
    │   ├── diff-json.ts           # *_diff.json writers (native file shape)
    │   └── trello-csv.ts          # per-category CSVs + README template
    └── tools/
        ├── migration.ts           # tips/buffs + custom-level builders (all-or-nothing)
        ├── trello-export.ts       # collects cards + calls the writer
        ├── duplicate-checker.ts   # duplicate keys + repeated values scanner
        └── pr-resume/             # PR recap → contributor documentation
            ├── index.ts           # orchestration + input/output resolution
            ├── parser.ts          # header split, section/contributor/bullet detection
            ├── service.ts         # per-contributor aggregation + derived reviews
            ├── renderer.ts        # final Markdown rendering
            └── period.ts          # ISO range → dd/mm/yy
```

---

## 🏗️ Build & distribute

### Bundle

```bash
npm run build           # tsup: src/cli.ts → dist/cli.js (ESM, sourcemaps)
node dist/cli.js
```

`tsup` emits a single ESM bundle targeting Node 20, injecting the
`#!/usr/bin/env node` shebang so `dist/cli.js` is directly executable. The
`data/` banner is resolved at runtime relative to the package root, so it still
renders from a global install.

### npm package

```bash
npm install
npm run build           # or rely on prepublishOnly
npm publish             # prepublishOnly re-runs tsup automatically
```

The published tarball ships `dist/`, `data/`, and both README files (see the
`files` array in `package.json`). The `bin` entry maps `pvzf-console` →
`dist/cli.js`, so the command works the moment install finishes — Node is the
only requirement.

---

## 🛟 Troubleshooting

| Symptom                                           | Fix                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `command not found: pvzf-console`                 | Install Node ≥ 20, then `npm install -g @charles_lindecker/pvzf-console` (or use `npx`).          |
| `Directory does not exist: …PvZ_Fusion_Translator` | Settings → `[1] Change PvZ_Fusion_Translator folder`, paste the correct absolute path.           |
| `Missing 'Localization' subfolder in …`           | Same as above — the configured path exists but isn't the translator bundle.                      |
| `<locale>: tips_iz.json missing`                  | Run Translator Tools → `[1] Migrate tips` for that locale first, then rerun the diff.             |
| `Settings could not be saved — …`                 | The per-user config directory isn't writable. Fix its permissions, or point `PVZF_CONSOLE_SETTINGS` at a writable file. Settings still apply for the session. |
| `Skipped tips_iz.json — N source string(s) missing` | Your `translation_strings.json` is still missing some source tip keys. Finish those first, then rerun the migration. |
| Emoji show up as `??` in your terminal            | `[4] Settings` → `[6] Toggle emoji` for the `[OK] / [!] / [X]` fallback.                         |
| Banner ASCII art renders as mojibake              | `[4] Settings` → `[7] Toggle ASCII banner`. The tool enables VT100 on Windows but some legacy hosts still fail. |
| Report file says 0 entries / no file at all       | 0 missing / empty-values is intentionally silent — the tool only writes a file when there's something to report. |
| Travel-buffs keys look like `advancedBuffs:0`     | Expected: presence is checked by `category:id`; a missing ID keeps its complete `{name, desc}` object in the report. |

---

## 🤝 Contributing

Issues and PRs welcome. To get hacking:

```bash
git clone https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager.git
cd PVZ-Fuzion-ConsolManager
npm install

npm run dev            # run the TUI live (tsx)
npm run typecheck      # tsc --noEmit (strict)
npm test               # vitest run
npm run test:cov       # vitest run --coverage (75% gate)
```

### Guidelines

1. **Respect the layer boundaries** (one responsibility per directory, IO
   pushed to the edges):
   - `core/` — pure data models + comparison logic, **no IO**.
   - `parsers/` — JSON loading + locale enumeration + diff helpers.
   - `reporting/` — every output format lives here (Markdown, JSON diff, CSV).
   - `tools/` — higher-level orchestrations that combine parsers + reporting.
   - `cli/` — prompts, menus, argv parsing, theming; nothing domain-specific.
   - `settings.ts` — persistence only.
2. **Keep it dependency-free at runtime.** The engine is plain Node + the
   standard library (`node:fs`, `node:path`, …). Dev tooling (tsup, tsx,
   vitest, typescript) is the only allowed `devDependencies`.
3. **ESM + strict TypeScript.** `"type": "module"`, `strict: true`,
   `noImplicitOverride`, Bundler module resolution. Use `node:` import
   specifiers; intra-package imports are extension-less (`./menus`,
   `../core/diff`) and the bundler resolves them.
4. **The app is built around a DI seam.** `cli/app.ts` exposes an `App` class
   holding mutable state and an injectable `AppDeps` bundle of every UI/menu
   function (ESM bindings can't be monkeypatched), so tests script answers and
   capture writes. Keep new UI interactions behind `AppDeps`.
5. **Adding a new translation type** is a 4-step drill:
   - Drop a loader in `parsers/` (`almanac.ts` for typed entities, `strings.ts`
     for flat/nested key-value files).
   - Add the corresponding `diff<Kind>` helper in `parsers/strings.ts` (or reuse
     `missingById` from `core/diff.ts` for almanac types).
   - Add `build<Kind>Report` in `reporting/markdown.ts`, `build<Kind>Diff` in
     `reporting/diff-json.ts`, and wire the category into
     `tools/trello-export.ts`.
   - Register it in `App.translationTypes` in `cli/app.ts` (the numbered
     dispatch map drives both the menu and `runAll`).
6. **Don't rebuild the wheel for a new Trello list**: reuse the flat-file and
   almanac card collectors in `tools/trello-export.ts` and let the CSV writer
   in `reporting/trello-csv.ts` do the per-list grouping.
7. **Commit style**: `type(scope): summary`. Seen so far: `feat(reports)`,
   `fix(cli)`, `chore(build)`, `docs(readme)`.
8. **Keep settings JSON backward-compatible** — `loadSettings` already filters
   unknown keys and the on-disk format stays snake_case; don't rename fields,
   add new ones with a default in `AppSettings`.

### npm scripts

| Script              | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Run the TUI live from source via `tsx`.               |
| `npm run build`     | Bundle `src/cli.ts` → `dist/cli.js` with `tsup`.      |
| `npm run typecheck` | `tsc --noEmit` against `src` + `tests` (strict).      |
| `npm test`          | Run the Vitest suite once.                            |
| `npm run test:cov`  | Run tests with V8 coverage (75% gate on lines/functions/branches/statements). |

---

## 🔐 Security

Found a vulnerability? **Don't open a public issue** — report it privately via a
[GitHub security advisory](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/security/advisories/new)
or by email. Supported versions, scope and response targets live in
[SECURITY.md](SECURITY.md).

Every push and PR to `main` (plus a weekly schedule) runs the `Security`
workflow: `npm audit` (blocking on high/critical production advisories), the
ESLint security ruleset, Semgrep and Gitleaks.

---

## 👤 Credits

**Charles Lindecker** — senior backend dev, translation-pipeline enthusiast,
long-time PvZ fan.

- GitHub: [@LINDECKER-Charles](https://github.com/LINDECKER-Charles)
- Email: [charles.lindecker@outlook.fr](mailto:charles.lindecker@outlook.fr)

Huge thanks to the **PVZ Fusion translator community** — especially
**@cassidy [BLMS]** for the original `migrate.py` / `migrate_odyssey.py`
scripts that inspired the Translator Tools.

---

## 📜 License

[MIT](LICENSE). Do what you want, keep the copyright notice, no warranty.
