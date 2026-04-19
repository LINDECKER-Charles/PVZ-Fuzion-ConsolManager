# 🌱 PVZ Fuzion Console Manager

> Translation toolkit for **Plants vs Zombies: Fusion**.
> Scans every locale against the English source, generates per-locale Markdown
> reports, migrates the new tips format, and exports Trello-ready CSV backlogs.

[![python](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org/downloads/)
[![node](https://img.shields.io/badge/node-14%2B-green)](https://nodejs.org/)
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
- [Credits](#-credits)
- [License](#-license)

---

## 🎯 What it does

1. **Detects untranslated content** across every file type the game uses:
   plants, zombies, achievements, UI strings, regex translations, tips
   (I, Zombie + Fusion Showcase), Abyss buffs, Travel buffs.
2. **Writes per-locale Markdown reports** so translators see the exact source
   JSON blocks they need to translate.
3. **Migrates the new tips format** — rebuilds `tips_iz.json` / `tips_fs.json`
   from the legacy `translation_strings.json`, all-or-nothing.
4. **Exports Trello CSV backlogs** — one CSV per category, ready for the
   *Import to Trello by Blue Cat* Power-Up.
5. **Ships both as source code and as a single-file `.pyz`**, and as an
   **npm package** (`pvzf-console`) with an auto-detecting Python wrapper.

---

## 📋 Prerequisites

| Tool         | Version    | Why                                                  |
| ------------ | ---------- | ---------------------------------------------------- |
| **Python**   | **≥ 3.10** | The whole engine is Python. Uses `match` statements. |
| Node.js      | ≥ 14       | Only for the npm wrapper / `.pyz` build step.        |
| Git          | any        | To clone and contribute.                             |

You also need the `PvZ_Fusion_Translator/` folder. By default the tool looks
for it as a sibling of the install, and if not found, one directory above
(useful when the `.pyz` sits in a `ConsolManager/` sub-folder of the overall
project tree). The path is also configurable from the Settings menu.

---

## 🚀 Install & run

### Option A — from source (recommended for devs)

```bash
git clone https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager.git
cd PVZ-Fuzion-ConsolManager

# Launch the interactive TUI
./scripts/run.sh                       # macOS / Linux / Git Bash
scripts\run.bat                        # Windows cmd / PowerShell
```

Or as a proper editable install:

```bash
python -m venv .venv
.venv\Scripts\activate                 # POSIX: source .venv/bin/activate
pip install -e .

pvzf-console                           # exposed by pyproject.toml entry point
```

### Option B — standalone `.pyz` archive

```bash
./scripts/build.sh                     # scripts\build.bat on Windows
python dist/pvzf_console.pyz
```

The archive is self-contained (the `data/` banner is bundled inside).

### Option C — via npm (no Python installation beyond Python itself)

```bash
npm install -g pvzf-console            # once published

pvzf-console                           # interactive
pvzf-console diff --lang French        # non-interactive
```

The npm wrapper verifies Python 3.10+ is on PATH and will **lazily rebuild**
the bundled `.pyz` if it's missing — so the command always works after a
fresh install, even when the archive is stripped from the tarball.

---

## ✨ Features

### Diff engine

- Detects missing entries by primary-key lookup (O(n + m) using set membership,
  not the original O(n·m) nested loop).
- Detects **empty values**: keys present in the locale but with an empty
  translation string — reported in a separate section of each report.
- Handles both flat dicts (`translation_strings.json`, `abyss_buffs.json`, …)
  and nested dicts (`travel_buffs.json` with `category:id` compound keys).
- Gracefully logs malformed JSON and continues instead of crashing the run.

### Report generators

- Almanac reports (plants / zombies / achievements): condensed `name + id`
  header plus a fenced ```` ```json ```` block with the raw source entry,
  ready to copy/translate/paste.
- Flat reports (strings / regex / tips / buffs): two sections — *Missing
  Keys* (compact JSON object) and *Empty Values* (table).

### Tips migration (Translator tool)

- Rebuilds `tips_iz.json` / `tips_fs.json` from matches in
  `translation_strings.json`.
- **All-or-nothing**: if even one source tip text is missing from the
  translation strings, the migration aborts for that file and reports the gap
  count. No partial writes.
- Already-present files are preserved (no overwrite).

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

### Persistent settings

- Stored in `settings.json` at the repo root (gitignored).
- Live-editable from `[3] Settings` in the TUI.
- Theme applied immediately (color, accent, density, emoji/banner toggles).

### CLI

- `argparse` sub-command dispatch.
- `pvzf-console diff --lang <locale> [--out <dir>]` runs every diff type for
  one locale in non-interactive mode.
- Exit codes: `0` on success, `2` on invalid locale or missing project root.

### Auto-discovery

- `PvZ_Fusion_Translator/` is probed in four places (install sibling → one
  level up → cwd → cwd parent) — **not recursive**, single pass.

### Cross-platform

- Shell scripts probe `python` → `python3` → `py` and reject the Windows
  Store stub (`python3 --version` returns a non-Python message).
- `os.system("cls" | "clear")` + `sys.stdout.reconfigure(encoding="utf-8")`
  + Windows VT100 enablement so ANSI colors and emoji render on every
  modern terminal.

### Error hygiene

- Invalid project root is detected at startup (warning) **and** before every
  tool action (gated with a friendly `❌` message). No tracebacks leak to
  the user.
- Archive missing at launch (npm install) → lazy rebuild from bundled
  sources.

---

## 🧭 Interactive menu reference

```
  MAIN MENU
  ─────────
    [1]  Show what's missing
    [2]  Translator tools
    [3]  Settings
    [0]  Exit
```

### [1] Show what's missing

Pick a locale (or `*` for all), then a type:

| Option         | Source file                                           | Output file (under `reports/<Locale>/`) |
| -------------- | ----------------------------------------------------- | --------------------------------------- |
| `[0] All`      | every type below                                      | every file below                        |
| `[1] Plants`       | `Almanac/LawnStringsTranslate.json`               | `missing_plants.md`                     |
| `[2] Zombies`      | `Almanac/ZombieStringsTranslate.json`             | `missing_zombies.md`                    |
| `[3] Achievements` | `Almanac/AchievementsTextTranslate.json`          | `missing_achievements.md`               |
| `[4] Strings`      | `Strings/translation_strings.json`                | `missing_strings.md`                    |
| `[5] Regex`        | `Strings/translation_regexs.json`                 | `missing_regexs.md`                     |
| `[6] Tips`         | `Strings/tips_iz.json`, `Strings/tips_fs.json`    | `missing_tips_iz.md`, `missing_tips_fs.md` |
| `[7] Abyss buffs`  | `Strings/abyss_buffs.json`                        | `missing_abyss_buffs.md`                |
| `[8] Travel buffs` | `Strings/travel_buffs.json` (nested)              | `missing_travel_buffs.md`               |

### [2] Translator tools

| Option | What it does |
| ------ | ------------ |
| `[1] Migrate tips` | Rebuilds `tips_iz.json` / `tips_fs.json` from `translation_strings.json`. Single-locale only. All-or-nothing. |
| `[2] Export Trello CSV` | Produces one CSV per category under `exports/<Locale>/` plus a `trello_README.md` with the full import walkthrough. |
| `[0] Back` | Returns to the main menu. |

### [3] Settings

| Key             | Default            | Notes                                          |
| --------------- | ------------------ | ---------------------------------------------- |
| Project root    | auto-discovered    | Absolute path to `PvZ_Fusion_Translator/`      |
| Source locale   | `English`          | Reference locale used for diffs                |
| Text color      | `default`          | Primary text                                   |
| Accent color    | `cyan`             | Headers, prompt, option keys                   |
| Density         | `comfortable`      | `compact` · `comfortable` · `spacious`         |
| Show emoji      | `true`             | Fallback: `[OK] / [!] / [X]`                   |
| Show banner     | `true`             | ASCII banner at startup                        |
| Trello label    | `To be translated` | Label written to every exported card           |

Supported ANSI colors: `default, red, green, yellow, blue, magenta, cyan,
white` plus their `bright_*` variants.

---

## ⚡ Headless CLI

```bash
pvzf-console --help
pvzf-console diff --help
```

| Command                                   | Effect                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `pvzf-console`                            | Launch the interactive TUI.                                                 |
| `pvzf-console diff --lang French`         | Run every diff type for French, write to `./reports/French/`.               |
| `pvzf-console diff --lang French --out X` | Same, writing to `X/French/` instead.                                       |

Exit codes:

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| `0`  | Success.                                             |
| `2`  | Invalid locale, source locale rejected, or invalid project root (missing `Localization/` subfolder). |

Use the `diff` command in CI to fail builds when a locale regresses.

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
    └── missing_regexs.md

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
```

Empty categories (0 missing entries) do not produce a file — keeps the
output tidy.

---

## 🗂️ Project structure

```
PVZ-Fuzion-ConsolManager/
├── pyproject.toml                 # Python package metadata + entry point
├── package.json                   # npm package metadata + bin entry
├── README.md                      # this file
├── README.dist.md                 # end-user README shipped with the .pyz
├── bin/
│   ├── pvzf-console.js            # npm binary: detects Python, lazy-rebuilds
│   └── build.js                   # cross-platform .pyz builder (node module)
├── scripts/
│   ├── run.sh   run.bat           # launch the TUI from source
│   └── build.sh build.bat         # build dist/pvzf_console.pyz
├── data/                          # ASCII banner (bundled into the .pyz)
└── src/pvz_console/
    ├── __init__.py                # __version__
    ├── __main__.py                # `python -m pvz_console`
    ├── config.py                  # paths, source locale, auto-discovery
    ├── settings.py                # AppSettings + load/save
    ├── cli/
    │   ├── app.py                 # orchestration + argparse
    │   ├── banner.py              # title renderer (fs + importlib.resources)
    │   ├── menus.py               # prompts, sections, locale picker
    │   └── theme.py               # ANSI colors + density + emoji toggle
    ├── core/
    │   ├── diff.py                # missing_by_id (O(n + m))
    │   └── models.py              # Plant / Zombie / Achievement / StringEntry / TrelloCard
    ├── parsers/
    │   ├── loaders.py             # JSON reader + locale enumeration
    │   ├── almanac.py             # plant / zombie / achievement loaders
    │   └── strings.py             # flat + nested diff helpers
    ├── reporting/
    │   ├── markdown.py            # per-locale Markdown writers
    │   └── trello_csv.py          # per-category CSVs + README template
    └── tools/
        ├── tips_migration.py      # tips_*.json builder (all-or-nothing)
        └── trello_export.py       # collects cards + calls the writer
```

---

## 🏗️ Build & distribute

### Single-file Python archive

```bash
./scripts/build.sh                 # or scripts\build.bat
# → dist/pvzf_console.pyz
# → dist/README.md                 (copy of README.dist.md)
```

The build stages `src/pvz_console/` + `data/` into a temp directory, runs
`python -m zipapp`, then cleans up. The banner is resolved via
`importlib.resources` so it still renders from inside the archive.

### npm package

```bash
npm install             # once deps exist — there are none
npm run build           # invokes bin/build.js (same as scripts/build.sh)
npm publish             # prepublishOnly re-runs the build automatically
```

Published tarball ships `bin/`, `dist/` (when available), `src/`, `data/`,
and both README files. The CLI wrapper:

1. Verifies Python 3.10+ is on PATH (prints the python.org URL if missing).
2. Looks for `dist/pvzf_console.pyz`.
3. **If missing, rebuilds it** from the shipped `src/` + `data/` via
   `bin/build.js::buildPyz()`.
4. Spawns `python <pyz> <argv…>` with inherited stdio.

So even after deleting the archive or installing from a stripped tarball,
`pvzf-console` keeps working — you only need Python on PATH.

---

## 🛟 Troubleshooting

| Symptom                                           | Fix                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Python 3.10+ not found on PATH`                  | Install from [python.org/downloads](https://www.python.org/downloads/); tick *Add to PATH*.      |
| `Directory does not exist: …PvZ_Fusion_Translator` | Settings → `[1] Change PvZ_Fusion_Translator folder`, paste the correct absolute path.           |
| `Missing 'Localization' subfolder in …`           | Same as above — the configured path exists but isn't the translator bundle.                      |
| `⛔ Skipped tips_iz.json — N source string(s) missing` | Your `translation_strings.json` is still missing some Chinese tip keys. Finish those first, then rerun the migration. |
| Emoji show up as `??` in your terminal            | `[3] Settings` → `[5] Toggle emoji` for the `[OK] / [!] / [X]` fallback.                         |
| Banner ASCII art renders as mojibake              | `[3] Settings` → `[6] Toggle ASCII banner`. The tool forces UTF-8 on Windows consoles but some legacy hosts still fail. |
| Report file says 0 entries / no file at all       | 0 missing / empty-values is intentionally silent — the tool only writes a file when there's something to report. |
| Travel-buffs keys look like `advancedBuffs:0`     | Expected — the nested `{category: {id: value}}` shape is flattened with `category:id` compound keys for diff/report. |
| `bundled archive not found, building it now…`     | Informational. The npm CLI rebuilds the `.pyz` on first run after install.                       |

---

## 🤝 Contributing

Issues and PRs welcome. To get hacking:

```bash
git clone https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager.git
cd PVZ-Fuzion-ConsolManager

python -m venv .venv
.venv\Scripts\activate         # POSIX: source .venv/bin/activate
pip install -e .

./scripts/run.sh               # run the TUI live
```

### Guidelines

1. **Respect the module boundaries**
   - `core/` — dataclasses + pure comparison logic, **no IO**.
   - `parsers/` — JSON loading + locale enumeration + diff helpers.
   - `reporting/` — every output format lives here (Markdown, CSV, …).
   - `tools/` — higher-level orchestrations that combine parsers + reporting.
   - `cli/` — prompts, menus, argparse, nothing domain-specific.
   - `settings.py` — persistence only.
2. **No runtime Python dependencies.** The toolkit is vanilla stdlib. Build
   tooling may depend on more, but the runtime must stay dependency-free so
   the `.pyz` works on a plain Python install.
3. **Adding a new translation type** is a 4-step drill:
   - Drop a loader in `parsers/`.
   - Add the corresponding `diff_<kind>` helper.
   - Add `build_<kind>_report` in `reporting/markdown.py` and the list
     constant in `tools/trello_export.py`.
   - Register it in `cli/app.py::TRANSLATION_TYPES` (and the number key in
     `interface` if needed).
4. **Don't rebuild the wheel when adding a Trello list**: use
   `_string_cards()` for flat files, `_almanac_cards()` for typed entities,
   and let `write_trello_csvs_by_list()` do the grouping.
5. **Commit style**: `type(scope): summary`. Seen so far: `feat(reports)`,
   `fix(cli)`, `chore(build)`, `docs(readme)`.
6. **Keep settings JSON backward-compatible** — `AppSettings` already ignores
   unknown keys; don't rename fields, add new ones with a default.

### Local scripts

| Script                      | What it does                                |
| --------------------------- | ------------------------------------------- |
| `./scripts/run.sh`          | Launch the TUI from source.                 |
| `./scripts/build.sh`        | Produce `dist/pvzf_console.pyz`.            |
| `node bin/build.js`         | Same build, cross-platform (used by npm).   |
| `node bin/pvzf-console.js`  | Run the wrapper directly without installing.|

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
