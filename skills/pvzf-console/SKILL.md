---
name: pvzf-console
description: >-
  Audit and prepare Plants vs Zombies: Fusion translations with the pvzf-console CLI —
  missing entries per locale and category, duplicate keys and values, Trello CSV export,
  creation of missing tips / custom-level locale files, and the weekly PR recap turned into
  contributor documentation. Use when working on PvZ Fusion localization files
  (PvZ_Fusion_Translator/Localization), an incomplete locale, or translation reports.
---

# pvzf-console

Command-line toolkit for the *Plants vs Zombies: Fusion* translation files.

## Run it

- Installed: `pvzf-console <command> …`; otherwise `npx -y @charles_lindecker/pvzf-console <command> …`.
- **Always pass a command.** Without one it starts an interactive console that needs a
  terminal; in a non-interactive shell it exits with code 2.
- **Always pass `--json`**: stdout then holds exactly one JSON document; warnings go to stderr.
- Discover options with `pvzf-console --help` and `pvzf-console <command> --help`.

## Point it at the game files

Commands that read the game need the `PvZ_Fusion_Translator/` folder (it contains
`Localization/` and usually `Dumps/`). It is found next to the working directory or from the
user's saved settings; otherwise pass `--project-root <dir>`. If a command fails with
`Directory does not exist` or `Missing 'Localization' subfolder`, ask the user where that
folder is — do not guess.

Locales are folder names under `Localization/` (`French`, `Chinese_cn`…), case-sensitive.
An unknown locale fails with the list of valid ones in the error message.

## Commands

| Command | Use it to | Writes |
| --- | --- | --- |
| `diff --lang L [--with-diff]` | Count what `L` is missing, per category | `reports/L/*.md` (+ `*_diff.json`) |
| `duplicates --lang L` | Find duplicate keys and values shared by several keys | `reports/L/duplicates.md` |
| `trello --lang L` | Export every untranslated entry as Trello CSVs | `exports/L/` |
| `migrate-tips --lang L` | Create `L`'s missing tips / abyss / travel buff files | inside the game folder |
| `migrate-levels --lang L` | Create `L`'s missing custom-level files | inside the game folder |
| `pr-resume [--input F] [--output F]` | Turn the weekly PR recap into contributor docs | `contribution-summary.md` |

`--out <dir>` relocates `reports/` or `exports/`. The two `migrate-*` commands write into the
user's game folder (they never overwrite an existing file): confirm with the user first.

## Output

```json
{ "ok": true, "command": "diff", "result": { "locale": "French", "totalMissing": 12, "categories": [ … ] } }
{ "ok": false, "command": "diff", "error": { "message": "locale 'french' not found. …", "exitCode": 2 } }
```

Exit codes: `0` success · `1` runtime failure (unreadable file…) · `2` bad arguments, unknown
locale, source locale used as a target, or invalid game folder.

## Typical flow

1. `pvzf-console diff --lang French --json` → which categories still have missing entries.
2. Read the matching `reports/French/missing_*.md` for the entries themselves.
3. `pvzf-console duplicates --lang French --json` before a release, to catch copy-paste slips.
