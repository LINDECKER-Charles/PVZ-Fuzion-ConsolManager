# Troubleshooting

Symptom, cause, fix. If none of this matches, open an
[issue](https://github.com/LINDECKER-Charles/PVZ-Fuzion-ConsolManager/issues) with your OS,
`node --version`, and what the console printed.

- [Install and launch](#install-and-launch)
- [Finding the game files](#finding-the-game-files)
- [Scanning](#scanning)
- [Migrations](#migrations)
- [Trello export](#trello-export)
- [Documentation tab](#documentation-tab)
- [Display](#display)
- [Settings](#settings)

---

## Install and launch

| Symptom | What is going on | Fix |
| --- | --- | --- |
| `command not found: pvzf-console` | The package is not installed globally, or npm's global `bin` is not on your `PATH`. | Install Node 20 or newer, then `npm install -g @charles_lindecker/pvzf-console` — or skip the install entirely with `npx @charles_lindecker/pvzf-console`. |
| The console prints the first menu and exits immediately | Interactive mode needs a TTY; you piped or redirected stdin. | Use the headless commands (`diff`, `pr-resume`) for scripted runs. |
| A syntax error mentioning `??=` or `import` | Node is older than 20. | Upgrade Node — the bundle targets Node 20. |

## Finding the game files

| Symptom | What is going on | Fix |
| --- | --- | --- |
| `Directory does not exist: …PvZ_Fusion_Translator` | Auto-discovery found nothing: the bundle is not in any of the four probed locations. | `[4] Settings` → *Change PvZ_Fusion_Translator folder*, paste the absolute path. |
| `Missing 'Localization' subfolder in …` | The configured path exists but is not the translator bundle — often one level too high or too low. | Point at the folder that directly contains `Localization/` and `Dumps/`. |
| `Source locale folder not found: Localization/<name>` | The configured source locale was renamed or removed. | `[4] Settings` → *Change source locale*, pick from the list. |
| `Missing 'Dumps' subfolder in …` | The source is set to `Dumps` but the bundle has no dumps folder. | Switch the source back to a locale, or add `Dumps/`. |
| The setting refuses to take my path | Validation runs before the value is accepted, and the previous one is kept on failure. | Check for a typo, and pass an absolute path — `~` is expanded, relative paths are not what you think they are. |

## Scanning

| Symptom | What is going on | Fix |
| --- | --- | --- |
| No report file at all for a category | Zero findings writes zero files, on purpose. | Nothing to do — that category is fully translated. |
| `<locale>: tips_iz.json missing` | The locale does not have that file yet, so there is nothing to diff. | Translator tools → *Migrate tips & buffs* for that locale, then rerun the scan. |
| `Error reading …: Unexpected token` | A locale file is malformed. The scan reports it and continues with an empty result for that file. | Fix the JSON, then rerun. The message names the exact file. |
| Everything shows as missing in `Dumps` mode | `translation_strings.json` and `translation_regexs.json` have no equivalent in `Dumps/`, so they always come back empty there. | Use a locale as source for those two categories. |
| Travel-buff keys look like `advancedBuffs:0` | Expected: presence is checked per `category:id`. | The missing ID keeps its full `{ name, desc }` object in the report — copy that. |
| `error: locale 'french' not found` | Locale names are case-sensitive and must match a folder name. | Use `French`. The error message lists the available names. |
| `error: 'English' is the source locale` | You asked to diff the reference against itself. | Diff a different locale, or change the source in Settings. |

## Migrations

| Symptom | What is going on | Fix |
| --- | --- | --- |
| `Skipped tips_iz.json (already present)` | The file already exists, and a migration never overwrites a translator's work. | Delete or rename the file first if you really want it rebuilt. |
| `Skipped abyss_buffs.json (no source found)` | The matching file in `Dumps/` is absent. | Nothing to migrate from — the dump has to ship it first. |
| `Created tips_iz.json — 0/402 translated` | The file was created empty: none of the source texts have a translation in that locale's `translation_strings.json` yet. | Expected on a young locale. Run a diff to list exactly what is missing. |
| Custom-level migration produces nothing | The key set comes from the **source locale**, which may not have those files. | Check that `customlevel_strings.json`, `customlevel_regexs.json` and `custom_level_data.json` exist in the source locale. |

## Trello export

| Symptom | What is going on | Fix |
| --- | --- | --- |
| `Nothing to export — the target locale looks fully translated.` | No missing entries, so no CSV. | Nothing to do. |
| A CSV is enormous | Expected on day-one locales — thousands of strings. | That is why there is one CSV per category: import them one at a time, as the generated `trello_README.md` describes. |
| Cards all land in the same Trello list | The lists named in the CSV `List` column do not exist on the board yet. | Create them first — the generated `trello_README.md` lists the exact names to create. |
| The label is missing on imported cards | The Power-Up matches labels by exact name, and the label must exist beforehand. | Create the label named in `trello_README.md`, or change the text in `[4] Settings`. |

## Documentation tab

| Symptom | What is going on | Fix |
| --- | --- | --- |
| `No contributor detected — check the recap's @handle : markers.` | The parser found no contributor line. | Each contributor line must read `@handle :` or `[Name](link) :`, with the bullets below it. |
| Exit code `1` with "missing its two header lines" | The recap needs a period on the first non-empty line and a PR URL on the second. | Add them: `2026-04-01..2026-04-07` then the `/pull/123` URL. |
| Reviews counter is `0` for the lead | Either the lead's name does not match what the recap uses, or the sections are proof-reading passes. | Add the spelling to *Docs aliases* in Settings. Sections whose name contains `check` never count as reviews. |
| A contributor appears twice under different spellings | Only the lead's aliases are folded. | Normalise the spelling in the recap, or add the alias if that person is the lead. |
| The wrong `.md` was picked up | Auto-detection takes the first candidate `.md` in the working directory. | Pass `--input` explicitly, or answer the prompt with the right path. |

## Display

| Symptom | What is going on | Fix |
| --- | --- | --- |
| Emoji render as `??` or boxes | The terminal is not UTF-8. | `[4] Settings` → *Toggle emoji* for the `[OK] / [!] / [X]` fallback. |
| The ASCII banner is mojibake | VT100 could not be enabled on a legacy host. | `[4] Settings` → *Toggle ASCII banner*. |
| Colours look wrong or absent | The terminal does not support the ANSI colour chosen. | Set *Text color* back to `default`, or pick a `bright_*` variant. |
| Menus feel cramped or too airy | Spacing is configurable. | `[4] Settings` → *Change spacing density*: `compact`, `comfortable` or `spacious`. |

## Settings

| Symptom | What is going on | Fix |
| --- | --- | --- |
| `Settings could not be saved — …` | The per-user config directory is not writable. The change still applies for this session. | Fix the directory's permissions, or point `PVZF_CONSOLE_SETTINGS` at a writable file. |
| Settings do not persist between runs | Same cause, or two installs pointing at different files. | The Settings panel shows the exact path in use under *Settings file* — check it is the one you expect. |
| An older install stopped seeing my changes | Since 1.5, settings live in the per-user config directory; the old in-package file is read once and then left behind. | Expected. See [configuration.md](configuration.md#upgrading-from-141-or-earlier). |
| A hand-edited settings file seems ignored | Unknown keys are dropped on load and an unusable alias list is filtered. | Match the snake_case format in [configuration.md](configuration.md#on-disk-format). |
