# 🌱 PVZ Fuzion Console Manager

A small companion tool for **Plants vs Zombies: Fusion** translators.
It scans every locale in `PvZ_Fusion_Translator/` against the English source
and tells you exactly **what's still missing**, then generates ready-to-use
Markdown reports and Trello CSVs — and writes the weekly contributor
documentation from your PR recap.

Just Node, and two tiny dependencies for the terminal UI.

---

## 🚀 First run in 30 seconds

1. Make sure **Node.js 20 or newer** is installed.
   Download: [nodejs.org](https://nodejs.org/).
2. Install (or run) the tool, then open a terminal **next to** your
   `PvZ_Fusion_Translator/` folder so your working directory looks like this:

   ```
   some-folder/
   └── PvZ_Fusion_Translator/
       ├── Localization/
       ├── Dumps/
       └── …
   ```
3. Run:

   ```bash
   npx @charles_lindecker/pvzf-console
   ```

   That's it — the interactive menu opens. (Install it globally with
   `npm install -g @charles_lindecker/pvzf-console` to get the `pvzf-console`
   command directly.)

> Not at the same level? No problem. Launch it anywhere, then go to
> **[4] Settings → Change PvZ_Fusion_Translator folder** and paste the
> absolute path to the folder. The setting is remembered across runs.

---

## 🧭 How to use it

Move with `↑` `↓`, confirm with `Enter`, and press `Esc` to back out of any
screen. The main menu always looks like this:

```
┌  PVZF CONSOLE
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

Pick a locale (or `*` for all), then pick what to check:

| Option       | What it compares                                                          |
| ------------ | ------------------------------------------------------------------------- |
| Plants       | Plant almanac (`Almanac/LawnStringsTranslate.json`)                       |
| Zombies      | Zombie almanac (`Almanac/ZombieStringsTranslate.json`)                    |
| Achievements | Achievements (`Almanac/AchievementsTextTranslate.json`)                   |
| Strings      | UI strings (`Strings/translation_strings.json`)                           |
| Regex        | Regex translations (`Strings/translation_regexs.json`)                    |
| Tips         | Both `tips_iz.json` and `tips_fs.json`                                    |
| Abyss buffs  | `Strings/abyss_buffs.json`                                                |
| Travel buffs | `Strings/travel_buffs.json`                                               |
| All types    | Runs every check back-to-back                                             |

You get one Markdown report per type under **`reports/<Locale>/`**. Each
report shows the exact JSON block to copy/translate/paste into the locale
file. The tool also offers to write `*_diff.json` files alongside the reports —
say yes if you want the missing entries in re-injectable JSON form.

### [2] Translator tools

**Migrate tips & buffs** — builds `tips_iz.json` / `tips_fs.json` /
`abyss_buffs.json` / `travel_buffs.json` for a locale that doesn't have them.
The key set comes from the raw `Dumps/`, and each translation is looked up in
that locale's own `translation_strings.json`. Entries with no translation yet
are left out — the result line tells you how many made it
(`Created tips_iz.json — 128/402 translated`), and a diff afterwards lists the
rest. An existing file is never overwritten.

**Migrate custom levels** — builds `customlevel_strings` /
`customlevel_regexs` / `custom_level_data` for a locale: the key set comes from
the source locale, the translations from the target.

**Export Trello CSV** — turns a full locale's backlog into a Trello-ready
import. You'll get one CSV per category under `exports/<Locale>/`:

```
exports/French/
├── trello_Plants.csv
├── trello_Zombies.csv
├── trello_Strings.csv
├── trello_Regex.csv
├── trello_Tips_IZ.csv
├── trello_Tips_FS.csv
├── trello_Abyss_Buffs.csv
├── trello_Travel_Buffs.csv
└── trello_README.md      # full Blue Cat Power-Up import walkthrough
```

Every card description is a `json` code block so Trello renders it as a
monospace snippet — escape sequences like `\n` stay exactly as they appear in
the source files.

Follow the generated `trello_README.md` for the one-time board setup
(labels, lists, the Blue Cat plugin).

**Check duplicates** — scans every string file for duplicate JSON keys and for
values reused across multiple keys. Any locale with matches gets a
`duplicates.md` report under `reports/<Locale>/`.

### [3] Documentation

**PR recap → contributor summary** — takes the weekly translation-PR recap and
writes **one Markdown block per contributor**, ready to paste into the
contributor documentation.

Your recap only needs two header lines, then the usual sections:

```markdown
2026-04-01..2026-04-07
https://github.com/owner/repo/pull/123

## 🌱 Newly Added Plants

@lafourmiedugaming-collab :
* **Briseur de Machoir** (`seedType: 1390`)

## 🔧 Modified Achievements

@Kurodatenshi :
* **D'où est-ce que je viens ?** (`achievement: 7`)
```

Each block gets the week, the PR link, and the counters — *Nouvelles
traductions*, *Traductions ajustées*, *Reviews effectuées*. The **Reviews block
of the locale lead is computed for you** from everyone else's items (sections
whose name contains `check` don't count as reviews). Set who the lead is in
`[4] Settings` → *Change documentation lead*.

Nothing is written until you've seen the recap: the tool renders it, shows the
per-contributor table, and asks before saving. No GitHub call is made — the PR
URL you type is only reused in the headers.

### [4] Settings

Everything here is optional — defaults are sensible. Changes are saved to
`settings.json`.

| Setting         | Default            | Notes                                          |
| --------------- | ------------------ | ---------------------------------------------- |
| Project folder  | sibling folder     | Absolute path to `PvZ_Fusion_Translator/`      |
| Source locale   | `English`          | The reference used for diffs (`Dumps` for raw dumps) |
| Text color      | `default`          | Color of ordinary text                         |
| Accent color    | `cyan`             | Color of headers, prompts, option keys         |
| Spacing density | `comfortable`      | `compact` · `comfortable` · `spacious`         |
| Show emoji      | `true`             | Swap emojis for `[OK] / [!] / [X]` if `false`  |
| Show banner     | `true`             | ASCII title shown at launch                    |
| Trello label    | `To be translated` | Label written on every exported card           |
| Docs lead       | `Charles LINDECKER` | Whose *Reviews* block the Documentation tab builds |
| Docs aliases    | `@LINDECKER-Charles, LINDECKER-Charles` | Other spellings of the lead, merged into one block |
| Docs output     | `contribution-summary.md` | Where the contributor summary goes by default |

Your settings file lives in your own account, not in the installed package:

| Platform    | Path                                                        |
| ----------- | ----------------------------------------------------------- |
| macOS       | `~/Library/Application Support/pvzf-console/settings.json`   |
| Linux / BSD | `$XDG_CONFIG_HOME/pvzf-console/settings.json`, else `~/.config/pvzf-console/settings.json` |
| Windows     | `%APPDATA%\pvzf-console\settings.json`                       |

`[4] Settings` shows the exact path under *Settings file*. To keep it elsewhere,
set `PVZF_CONSOLE_SETTINGS` to the full path you want. Coming from an older
version that stored `settings.json` next to the program? It is picked up
automatically on first launch — nothing to redo.

---

## ⚡ Power-user mode

Skip the menus and run a single locale from the command line:

```bash
pvzf-console diff --lang French
pvzf-console diff --lang German --out ./out/german
pvzf-console diff --lang French --with-diff      # also write *_diff.json
```

Same for the contributor documentation:

```bash
pvzf-console pr-resume                                   # first .md in the folder
pvzf-console pr-resume --input recap.md --output docs/contributions.md
```

- Exits `0` on success.
- Exits `1` when the recap can't be read or is missing its two header lines.
- Exits `2` on bad arguments or an invalid/unknown locale (name lookup is
  case-sensitive).

Use it from batch scripts or CI to flag regressions automatically.

---

## 🛟 Troubleshooting

**"command not found: pvzf-console"**
Install Node 20+ from [nodejs.org](https://nodejs.org/), then either
`npm install -g @charles_lindecker/pvzf-console` or run it with `npx`.

**"Directory does not exist: …"**
The configured project folder is wrong. Open `[4] Settings` → *Change
PvZ_Fusion_Translator folder* and paste the right absolute path.

**The banner is a scrambled wall of `?` characters**
Your terminal isn't UTF-8 / VT100. The tool enables VT100 on Windows consoles,
but if that fails, go to `[4] Settings` → *Toggle ASCII banner* / *Toggle emoji*
for a plain-text fallback.

**A generated CSV is huge**
That's expected on day-one locales (thousands of strings). Import one CSV at
a time using the Blue Cat plugin — the instructions in
`trello_README.md` walk you through each step.

---

## 📦 What's in this package

- The translation-diff engine (plants, zombies, achievements, strings,
  regex, tips IZ / FS, abyss buffs, travel buffs).
- The tips/buffs and custom-level migration tools.
- The duplicate checker.
- The Trello CSV exporter + import guide generator.
- The PR-recap → contributor-documentation generator.
- A configurable interactive TUI and a headless CLI.

No telemetry, no network calls, no data leaves your machine.

---

## 🔗 Source, issues, contributing

Open source on GitHub:
<https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager>

If you hit a bug or want a new feature, open an issue or a pull request
there. `CONTRIBUTING.md` explains how to set up a dev environment and how to
add new translation types, and the `docs/` folder documents the architecture,
every supported file and every generated artifact.

---

## 👤 Author

**Charles Lindecker**
[charles.lindecker@outlook.fr](mailto:charles.lindecker@outlook.fr)
