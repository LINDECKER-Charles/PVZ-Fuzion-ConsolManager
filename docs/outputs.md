# Generated files

Every artifact the console produces, and what is inside it. Nothing here is written unless
there is something to say: a category with zero findings produces no file at all, so the
output tree *is* the backlog.

> Headings in generated Markdown carry a category emoji. They are omitted from the samples
> below for readability; everything else is verbatim.

- [Where things land](#where-things-land)
- [Markdown reports](#markdown-reports)
- [JSON diff files](#json-diff-files)
- [Duplicates report](#duplicates-report)
- [Trello export](#trello-export)
- [Contribution summary](#contribution-summary)
- [Encoding and formatting](#encoding-and-formatting)

---

## Where things land

```text
reports/                             # `--out` overrides the root
├── Arabic/
│   ├── missing_plants.md
│   ├── missing_zombies.md
│   ├── missing_strings.md
│   └── missing_travel_buffs.md
└── French/
    ├── missing_plants.md
    ├── missing_strings.md
    ├── missing_regexs.md
    ├── duplicates.md                # only when duplicates were found
    └── strings_diff.json            # only with --with-diff / the TUI opt-in

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

contribution-summary.md              # Documentation tab / pr-resume, path configurable
```

Everything is grouped by locale, so two locales scanned in the same run never collide.

## Markdown reports

One file per category under `reports/<Locale>/`:

| File | Category |
| --- | --- |
| `missing_plants.md` | Plants |
| `missing_zombies.md` | Zombies |
| `missing_achievements.md` | Achievements |
| `missing_strings.md` | Strings (UI) |
| `missing_regexs.md` | Regex |
| `missing_tips_iz.md` · `missing_tips_fs.md` | Tips |
| `missing_abyss_buffs.md` | Abyss buffs |
| `missing_travel_buffs.md` | Travel buffs |

### Almanac reports

Plants, zombies and achievements print each missing entry exactly as it appears in the source
file, so the workflow is copy, translate, paste:

````markdown
# Missing Plant Translations

> **Localization:** `FRENCH`
> **Total missing entries:** `3`
> **Generated automatically by PVZ Fuzion Console Manager**

---

## Summary

There are **3** entries missing in the `FRENCH` translation.

Each entry below is printed as it appears in the source translation file — copy the block,
translate the values, and paste it into the locale file.

---

## Missing Entries

### `Jawbreaker` — id `1390`

```json
{
  "seedType": 1390,
  "name": "Jawbreaker",
  "description": "…"
}
```
````

An entry whose source has no name renders as `Name missing`, keeping its ID.

### Flat reports

Strings, regex, tips and abyss buffs split their findings in two, because the two problems are
fixed differently — one needs a new key, the other needs the existing key filled in:

````markdown
# Missing UI String Translations

> **Localization:** `FRENCH`
> **Missing keys:** `2` — **Empty values:** `1`
> **Total entries to fix:** `3`
> **Generated automatically by PVZ Fuzion Console Manager**

---

## Missing Keys (2)

```json
{
  "MENU_START": "Start",
  "MENU_QUIT": "Quit"
}
```

---

## Empty Values (1)

| Key | Source (English) |
| --- | --- |
| `MENU_OPTIONS` | Options |
````

The *Missing Keys* block is a ready-to-merge JSON object. Table cells escape backslashes
before pipes and turn newlines into a visible marker, so a regex translation containing `\|`
cannot break the row it sits in.

### Travel buffs

Nested by nature, so the report keeps the source shape — a missing ID arrives with its
complete object:

````markdown
# Missing Travel Buff Translations

> **Localization:** `FRENCH`
> **Missing IDs:** `1`

---

## Missing IDs

```json
{
  "advancedBuffs": {
    "0": { "name": "…", "desc": "…" }
  }
}
```
````

## JSON diff files

Opt-in — the `--with-diff` flag, or the prompt in the console. Written next to the Markdown
report, holding the missing entries **in the file's native shape** so they can be merged
straight back into the locale.

| File | Shape |
| --- | --- |
| `plants_diff.json` · `zombies_diff.json` · `achievements_diff.json` | `{ "plants": [ …raw source objects… ] }` |
| `strings_diff.json` · `regexs_diff.json` · `tips_iz_diff.json` · `tips_fs_diff.json` · `abyss_buffs_diff.json` | `{ "key": "source text" }` |
| `travel_buffs_diff.json` | `{ "category": { "id": …raw… } }` |

Two-space indentation, one trailing newline, non-ASCII characters left as-is.

## Duplicates report

`reports/<Locale>/duplicates.md`, written only for locales with findings, and listing only
the files that have them:

```markdown
# Duplicate translations

> **Localization:** `FRENCH`
> **Duplicate keys:** `1` — **Repeated values:** `2`

---

## `translation_strings.json`

### Duplicate keys (1)

| Key | Occurrences |
| --- | --- |
| `MENU_START` | 2 |

### Repeated values (2)

| Value | Keys sharing it |
| --- | --- |
| Retour | `MENU_BACK`, `DIALOG_BACK` |
```

Duplicate keys are counted per object scope, keeping the highest count seen for a key.
Repeated values are grouped largest-first, then alphabetically; empty and whitespace-only
values are ignored.

## Trello export

`exports/<Locale>/`, one CSV per list that actually has cards, plus a generated import guide.

**CSV format** — `Name`, `Description`, `Labels`, `List`; every field quoted, embedded quotes
doubled, `\r\n` line endings. That is what the *Import to Trello by Blue Cat* Power-Up
expects.

````csv
"Name","Description","Labels","List"
"MENU_START","```json
""MENU_START"": ""Start""
```","To be translated","Strings"
````

Descriptions are JSON-fenced so Trello renders them as a monospace snippet. Almanac cards
carry the full source object, braces included; flat entries render as the single JSON member
`"key": "value"`, with escape sequences such as `\n` preserved literally — the translator sees
the text exactly as it will sit in the file. Card names are truncated at 100 characters and
descriptions at 15 000, both with an ellipsis.

**`trello_README.md`** is generated from the export that just ran, so it is never generic. It
contains the exact label to create, the exact lists to create — derived from the CSVs actually
produced — the column mapping to use in the import wizard, and a table of cards per list with
a total. An empty export says so instead of listing steps.

## Contribution summary

Default `contribution-summary.md`, path configurable. One block per contributor, sorted
case-insensitively by name:

```markdown
# Résumés des contributions par contributeur

Période: `01/04/26 → 07/04/26`
PR: [PR#123](https://github.com/owner/repo/pull/123)

---

## @Kurodatenshi

### Semaine — `01/04/26 → 07/04/26`
> [PR#123](https://github.com/owner/repo/pull/123)

**Résumé de la semaine**

* Nouvelles traductions : **0**
* Traductions ajustées : **1**
* Reviews effectuées : **0**

---

#### Détail

## Modified Achievements
* **D'où est-ce que je viens ?** (`achievement: 7`)

---
```

The lead's block ends with an extra **Reviews** section, grouped by recap section and then by
author, listing every item they reviewed. It is derived from everyone else's contributions —
the recap never states reviews explicitly.

The rendered text is French on purpose: it is pasted verbatim into the French contributor
documentation. A recap with no recognisable contributor produces the header plus
*Aucune contribution détectée dans le document.*

## Encoding and formatting

| Artifact | Encoding | Formatting |
| --- | --- | --- |
| Markdown reports, CSV, summary | UTF-8, no BOM | — |
| `*_diff.json` | UTF-8, no BOM | 2-space indent, trailing newline |
| Locale files written by a migration | UTF-8 **with BOM** | 4-space indent — matching what the game ships |
| Trello CSV | UTF-8 | every field quoted, `\r\n` terminators |

Output directories are created on demand; reports and exports are safe to delete and
regenerate at any time. The only files the console writes **inside** the game bundle are the
ones a migration creates, and those are never overwritten once they exist.
