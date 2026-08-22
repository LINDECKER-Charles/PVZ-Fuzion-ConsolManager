# Supported catalog

Everything the toolkit knows how to read, compare, build and export — and what it
deliberately leaves alone. If a file is not listed here, the console does not touch it.

- [Locales](#locales)
- [Diff sources](#diff-sources)
- [Translation categories](#translation-categories)
- [Migration targets](#migration-targets)
- [Duplicate scan targets](#duplicate-scan-targets)
- [Trello lists](#trello-lists)
- [Out of scope](#out-of-scope)

---

## Locales

Locales are **discovered, never hardcoded**: every directory under
`PvZ_Fusion_Translator/Localization/` is a locale, sorted alphabetically. Drop a new folder
in and it shows up in the picker on the next run.

The bundle currently ships 19:

| | | | |
| --- | --- | --- | --- |
| Arabic | Chinese_cn | English | Filipino |
| French | German | Indonesian | Italian |
| Japanese | Javanese | Korean | Polish |
| Portuguese | Romanian | Russian | Spanish |
| Turkish | Ukrainian | Vietnamese | |

Each locale folder is expected to look like this — every file is optional, and a missing one
is treated as empty rather than as an error:

```text
Localization/<Locale>/
├── Almanac/
│   ├── LawnStringsTranslate.json
│   ├── ZombieStringsTranslate.json
│   └── AchievementsTextTranslate.json
├── Strings/
│   ├── translation_strings.json
│   ├── translation_regexs.json
│   ├── tips_iz.json
│   ├── tips_fs.json
│   ├── abyss_buffs.json
│   ├── travel_buffs.json
│   ├── customlevel_strings.json
│   ├── customlevel_regexs.json
│   └── custom_level_data.json
└── Textures/                    ← not read by the console
```

Files are read as UTF-8 with an optional BOM. A missing file yields an empty diff; a
malformed one is reported as a notice and also yields an empty diff, so a single broken
locale never aborts a run over all of them.

## Diff sources

Every comparison needs a reference. Two source modes exist, chosen in
`[4] Settings` → *Change source locale*:

| Mode | Reference | Notes |
| --- | --- | --- |
| **A locale** (default `English`) | `Localization/<source>/…` | The normal mode. The source locale is excluded from the target picker. |
| **`Dumps`** | `PvZ_Fusion_Translator/Dumps/` | Diffs against the raw game dumps — useful to catch entries the source locale itself has not picked up yet. |

Dump files do not share the locale filenames, so they are mapped:

| Locale filename | Equivalent in `Dumps/` |
| --- | --- |
| `Almanac/LawnStringsTranslate.json` | `LawnStrings.json` |
| `Almanac/ZombieStringsTranslate.json` | `ZombieStrings.json` |
| `Almanac/AchievementsTextTranslate.json` | `AchievementsText.json` |
| `Strings/abyss_buffs.json` | `AbyssBuffData.json` |
| `Strings/tips_iz.json` · `tips_fs.json` · `travel_buffs.json` | same name |
| `Strings/translation_strings.json` | *none* — always an empty diff in `Dumps` mode |
| `Strings/translation_regexs.json` | *none* — always an empty diff in `Dumps` mode |

## Translation categories

The eight categories the diff engine handles. `[0] All types` in the console, and the
headless `diff` command, run all of them.

| # | Category | Source file | Shape | Matched on |
| --- | --- | --- | --- | --- |
| 1 | Plants | `Almanac/LawnStringsTranslate.json` | `{ plants: [ … ] }` | `seedType` |
| 2 | Zombies | `Almanac/ZombieStringsTranslate.json` | `{ zombies: [ … ] }` | `theZombieType` |
| 3 | Achievements | `Almanac/AchievementsTextTranslate.json` | `{ achievements: [ … ] }` | `achievement` |
| 4 | Strings (UI) | `Strings/translation_strings.json` | flat `{ key: value }` | key |
| 5 | Regex | `Strings/translation_regexs.json` | flat `{ key: value }` | key |
| 6 | Tips (IZ + FS) | `Strings/tips_iz.json`, `Strings/tips_fs.json` | flat `{ key: value }` | key |
| 7 | Abyss buffs | `Strings/abyss_buffs.json` | flat `{ key: value }` | key |
| 8 | Travel buffs | `Strings/travel_buffs.json` | nested `{ category: { id: { name, desc } } }` | `category:id` |

What each kind of comparison reports:

- **Almanac categories (1–3)** — entries whose ID exists in the source and not in the target.
  Membership is a set lookup, so the whole comparison is `O(n + m)`, not a nested scan. The
  untouched source object is kept so reports and exports can print it verbatim.
- **Flat categories (4–7)** — two findings per file: keys **missing** from the target, and
  keys present but **empty** while the source has text. Empty is evaluated the way Python
  would: `""`, `null`, `0` and `false` all count as empty.
- **Travel buffs (8)** — presence is checked per `category:id`, and a missing ID keeps its
  complete `{ name, desc }` object in the report, so nothing has to be reassembled by hand.

Categories 6–8 need the file to exist in the target locale: without it the category is
skipped with a warning pointing at the migration tool, since an absent file is a migration
gap rather than a translation gap.

## Migration targets

Files the console can build for a locale that does not have them yet. Existing files are
never overwritten — the write is exclusive, so a translator saving from an editor at the
same moment cannot be clobbered.

### Migrate tips & buffs

Key set from `Dumps/`, values from the target locale's own `translation_strings.json`, looked
up by the original source text.

| Destination (`Strings/`) | Dump source | Extraction |
| --- | --- | --- |
| `tips_iz.json` | `Dumps/tips_iz.json` | every `{ key: text }` pair |
| `tips_fs.json` | `Dumps/tips_fs.json` | every `{ key: text }` pair |
| `abyss_buffs.json` | `Dumps/AbyssBuffData.json` | `infos[*].name` and `infos[*].introduce`, keyed by the text itself |
| `travel_buffs.json` | `Dumps/travel_buffs.json` | every nested string leaf, path preserved |

### Migrate custom levels

`Dumps/` has no complete source for these, so the key set comes from the configured source
locale instead; values still come from the target locale's `translation_strings.json`.

| Destination (`Strings/`) | Key set read from | Extraction |
| --- | --- | --- |
| `customlevel_strings.json` | source locale's `customlevel_strings.json` | the keys themselves |
| `customlevel_regexs.json` | source locale's `customlevel_regexs.json` | the keys themselves |
| `custom_level_data.json` | source locale's `custom_level_data.json` | `<levelId>.name` and `<levelId>.startTip` |

Entries whose text has no translation yet are left out rather than written empty — running a
diff afterwards lists exactly what is still missing. Written files use a UTF-8 BOM and
4-space indentation, matching what the game ships.

## Duplicate scan targets

Six files per locale, scanned for duplicate JSON keys and for one translation reused across
several keys:

| File | Layout |
| --- | --- |
| `translation_strings.json` | flat |
| `translation_regexs.json` | flat |
| `tips_iz.json` | flat |
| `tips_fs.json` | flat |
| `abyss_buffs.json` | flat |
| `travel_buffs.json` | nested (flattened to `category:id:field` first) |

Duplicate keys are found by a strict recursive-descent scan of the raw text, because
`JSON.parse` silently keeps only the last occurrence — the parsed object cannot show you the
problem. Empty and whitespace-only values are ignored when grouping repeated values.

## Trello lists

The export produces one CSV per list, and only for lists that actually have cards:

`Plants` · `Zombies` · `Achievements` · `Strings` · `Regex` · `Tips IZ` · `Tips FS` ·
`Abyss Buffs` · `Travel Buffs`

Each card carries the configured label (default `To be translated`). Card names are capped at
100 characters and descriptions at 15 000, below Trello's own limits.

## Out of scope

Present in the bundle, never read or written by the console:

| Path | Why |
| --- | --- |
| `Localization/<Locale>/Textures/` | Images, not text. |
| `[Custom Audios]`, `[Custom Fonts]`, `[Custom Textures]` | Non-text assets. |
| `Almanac/DetailStringsTranslate.json`, `Dumps/DetailStrings.json` | No category is wired to them yet. |
| `Dumps/CustomLevels.json` | The custom-level migration reads the locale files, not this one. |
| `Dumps/MD5.json`, `MD5Convert.txt`, `changelog.txt` | Game bookkeeping. |

Adding a category is a small, well-defined change — the drill is in
[CONTRIBUTING.md](../../CONTRIBUTING.md#adding-a-translation-category).
