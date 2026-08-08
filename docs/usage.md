# Usage

Everything the console can do, screen by screen, plus the headless commands.
For what each generated file looks like, see [outputs.md](outputs.md); for what the
toolkit knows how to read, see [catalog.md](catalog.md).

- [Requirements](#requirements)
- [Install](#install)
- [Pointing it at the game files](#pointing-it-at-the-game-files)
- [Interactive console](#interactive-console)
  - [1 — Show what's missing](#1--show-whats-missing)
  - [2 — Translator tools](#2--translator-tools)
  - [3 — Documentation](#3--documentation)
  - [4 — Settings](#4--settings)
- [Headless CLI](#headless-cli)
- [Using it in CI](#using-it-in-ci)

---

## Requirements

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | **20 or newer** | The whole engine is TypeScript bundled to ESM. |
| A terminal | any modern one | Interactive mode needs a TTY; the commands do not. |
| Git | any | Only to clone and contribute. |

Windows, macOS and Linux are all supported and all covered by CI. There is no Python
dependency, no compiler step on install, and no network access at runtime.

## Install

```bash
# one-off, nothing installed
npx @charles_lindecker/pvzf-console

# permanent `pvzf-console` command
npm install -g @charles_lindecker/pvzf-console

# from source, for development
git clone https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager.git
cd PVZ-Fuzion-ConsolManager
npm install
npm run dev          # live TUI via tsx
npm run build        # bundle to dist/cli.js, then: node dist/cli.js
```

## Pointing it at the game files

The console works on the `PvZ_Fusion_Translator/` bundle — the folder holding
`Localization/` and `Dumps/`. It probes four locations, once each, in this order:

1. next to the installed package,
2. that folder's parent,
3. next to the current working directory,
4. that directory's parent.

The search is deliberately **not recursive**. The simplest setup is therefore to run the
console from a folder that sits beside the bundle:

```text
some-folder/
├── PvZ_Fusion_Translator/
│   ├── Localization/
│   └── Dumps/
└── (run pvzf-console here)
```

Anywhere else, open `[4] Settings` → *Change PvZ_Fusion_Translator folder* and paste the
absolute path once. It is validated on the spot — a path without a `Localization/` subfolder
is rejected and the previous value kept — then remembered across runs
(see [configuration.md](configuration.md)).

---

## Interactive console

Launch with no arguments. Move with the arrow keys, confirm with `Enter`, and leave the
current screen with `Esc` or `Ctrl+C`.

```text
┌  PVZF CONSOLE
│
◇  Status ──────────────────────────────────────────╮
│                                                   │
│  [OK]  project   …/PvZ_Fusion_Translator          │
│  [OK]  source    English                          │
│  [OK]  reports   reports/                         │
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

Three rules hold everywhere:

- **Cancelling never acts.** `Esc` backs out of the screen and never triggers the action it
  interrupted; nothing is written. Only the main menu's *Exit* ends the session.
- **A broken project root is caught twice** — once in the startup panel, once before every
  tool action, with a message pointing at the setting to fix.
- **The locale picker adapts**: a plain list up to ten locales, a type-to-filter
  autocomplete beyond that. Screens that diff against the source hide the source locale from
  the list, since diffing the reference against itself means nothing.

The status panel above is shown with emoji turned off; by default it uses check marks.
Both are toggles in Settings.

### 1 — Show what's missing

Pick a locale — or *All locales* — then a category:

| Key | Category | Compared file |
| --- | --- | --- |
| `[0]` | All types | every row below, back to back |
| `[1]` | Plants | `Almanac/LawnStringsTranslate.json` |
| `[2]` | Zombies | `Almanac/ZombieStringsTranslate.json` |
| `[3]` | Achievements | `Almanac/AchievementsTextTranslate.json` |
| `[4]` | Strings (UI) | `Strings/translation_strings.json` |
| `[5]` | Regex | `Strings/translation_regexs.json` |
| `[6]` | Tips (IZ + FS) | `Strings/tips_iz.json` and `Strings/tips_fs.json` |
| `[7]` | Abyss buffs | `Strings/abyss_buffs.json` |
| `[8]` | Travel buffs | `Strings/travel_buffs.json` (nested) |

The console then asks whether to **also export JSON diff files**, shows the plan it is about
to run, and prints the total number of missing entries when it is done.

Two kinds of finding are reported: keys **missing** from the locale, and keys present but
holding an **empty** translation. Reports land in `reports/<Locale>/`, one file per category,
and a category with nothing to fix writes no file at all.

If a locale does not have `tips_iz.json`, `tips_fs.json`, `abyss_buffs.json` or
`travel_buffs.json` yet, that category is skipped with a warning telling you to run the
migration first — see below.

### 2 — Translator tools

| Key | Tool | Scope |
| --- | --- | --- |
| `[1]` | Migrate tips & buffs | one locale |
| `[2]` | Migrate custom levels | one locale |
| `[3]` | Export Trello CSV | one locale |
| `[4]` | Check duplicates | one locale or all |

**Migrate tips & buffs** builds `tips_iz.json`, `tips_fs.json`, `abyss_buffs.json` and
`travel_buffs.json` for a locale that does not have them. The key set comes from the raw
`Dumps/`; each value is looked up in that same locale's `translation_strings.json`, keyed by
the original source text. Entries with no translation yet are simply left out — run a diff
afterwards to list them.

The result line reads `Created tips_iz.json — 128/402 translated`: how many entries were
written out of how many the dump offered.

> **Existing files are never touched.** The write is exclusive: if the destination already
> exists, the file is reported as skipped and the translator's work is left alone. A file
> whose dump source is absent is skipped too, with a different message.

**Migrate custom levels** does the same for `customlevel_strings.json`,
`customlevel_regexs.json` and `custom_level_data.json`. Those have no complete source in
`Dumps/`, so the key set is taken from the configured source locale instead, while values
still come from the target locale's own `translation_strings.json`.

**Export Trello CSV** turns a locale's entire backlog into one CSV per category under
`exports/<Locale>/`, plus a generated `trello_README.md` naming the exact label and lists to
create and walking through the *Import to Trello by Blue Cat* Power-Up. One CSV per category
keeps the Trello UI responsive on day-one locales with thousands of strings.

**Check duplicates** scans the six string files of each selected locale for two problems:
JSON keys that appear more than once in the same object (`JSON.parse` silently keeps the
last one, so the file is read by a strict scanner instead), and one translation reused across
several keys. Locales with findings get a `duplicates.md`; clean locales produce nothing.

### 3 — Documentation

`[1] PR recap → contributor summary` reads the weekly translation-PR recap and writes one
Markdown block per contributor.

Expected input — the first two non-empty lines are the header:

```markdown
2026-04-01..2026-04-07                      ← period (or an already-formatted 01/04/26 → 07/04/26)
https://github.com/owner/repo/pull/123      ← PR URL; the number is read from /pull/(\d+)

## Newly Added Plants                       ← section

@lafourmiedugaming-collab :                 ← contributor: @handle, or [Name](link) :
* **Briseur de Machoir** (`seedType: 1390`) ← item

## Modified Achievements

@Kurodatenshi :
* **D'où est-ce que je viens ?** (`achievement: 7`)
```

The screen suggests the first candidate `.md` in the working directory, renders the result
**without touching the disk**, shows a per-contributor table (`new` / `mod` / `rev`), and
writes only once you confirm. No GitHub API call is made — the PR URL you pass is only
reinjected into each block's header.

Two derivations are worth knowing about:

- **The lead's *Reviews* block is computed**, not written: every item authored by somebody
  else is mirrored under the lead, grouped by section then by author. Sections whose name
  contains `check` are proof-reading passes and are excluded.
- **Counters come from the section names.** `new` / `nouveau` / `nouvelle` feed *Nouvelles
  traductions*; `modified` / `modifi` feed *Traductions ajustées*.

Who the lead is, and every alias a recap may spell them with, is a setting — so any locale
maintainer can use the tool. The rendered output is French by design: it lands verbatim in
the French contributor files.

### 4 — Settings

Eleven entries plus *Back*: project root, source locale, text colour, accent colour, spacing
density, emoji toggle, banner toggle, Trello label, documentation lead, default summary
output, and reset to defaults. The panel at the top of the screen always shows the current
values and the exact path of the settings file in use.

Full reference, defaults and file locations: [configuration.md](configuration.md).

---

## Headless CLI

```bash
pvzf-console diff --lang French
pvzf-console diff --lang German --out ./out --with-diff
pvzf-console pr-resume
pvzf-console pr-resume --input recap.md --output docs/contributions.md
```

| Command | Effect |
| --- | --- |
| `pvzf-console` | Launch the interactive console. |
| `diff --lang <locale>` | Run every category for that locale, writing to `reports/<locale>/`. |
| `diff --lang <locale> --out <dir>` | Same, writing to `<dir>/<locale>/` instead. |
| `diff --lang <locale> --with-diff` | Same, plus `*_diff.json` next to each Markdown report. |
| `pr-resume` | Contributor summary from the first candidate `.md` in the working directory. |
| `pr-resume --input <f> --output <f>` | Same, with both paths given. |

Long flags only, no aliases; `--name value` and `--name=value` are both accepted. Any
unknown flag is rejected the way `argparse` would.

Auto-detection of the recap skips repository boilerplate — `README.md`, `README.dist.md`,
`CHANGELOG.md`, `LICENSE.md`, `CONTRIBUTING.md`, `release.md` — and the output file itself.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | Runtime failure — recap missing, unreadable, or lacking its two header lines. |
| `2` | Invalid arguments, unknown locale, target equal to the source locale, or an invalid project root (no `Localization/` subfolder). |

Locale names are case-sensitive and must match a folder under `Localization/`. On an unknown
locale the error message lists the ones that exist.

## Using it in CI

`diff` is a read-then-write operation with a stable exit code, so it slots into a pipeline
that fails when a locale regresses:

```yaml
- run: npx @charles_lindecker/pvzf-console diff --lang French --out reports
- run: test ! -s reports/French/missing_strings.md   # example gate
```

`pr-resume` regenerates the contributor documentation when the weekly PR merges. Both
commands honour `PVZF_CONSOLE_SETTINGS`, which is the clean way to pin a settings file in a
runner instead of relying on the per-user config directory.
