# Configuration

Every setting, what it changes, where it is stored, and how to override the storage location.
All of it is optional — the defaults work out of the box.

- [Settings reference](#settings-reference)
- [Where settings live](#where-settings-live)
- [On-disk format](#on-disk-format)
- [Environment variables](#environment-variables)
- [Upgrading from 1.4.1 or earlier](#upgrading-from-141-or-earlier)

---

## Settings reference

Edit them in `[4] Settings`. The panel at the top of that screen always shows the current
values plus the exact path of the file in use.

| Setting | Default | What it does |
| --- | --- | --- |
| Project root | auto-discovered | Absolute path to `PvZ_Fusion_Translator/`. A leading `~` is expanded. |
| Source locale | `English` | The reference every diff is taken against. Pick `Dumps` to diff against the raw game dumps instead. |
| Text color | `default` | Primary text colour. |
| Accent color | `cyan` | Headers, prompts, option keys. |
| Spacing density | `comfortable` | `compact` · `comfortable` · `spacious`. |
| Show emoji | `true` | Off falls back to `[OK] / [!] / [X]` markers. |
| Show banner | `true` | The ASCII title drawn at launch. |
| Trello label | `To be translated` | Label stamped on every exported card. |
| Docs lead | `Charles LINDECKER` | Whose *Reviews* block the Documentation tab derives. |
| Docs aliases | `@LINDECKER-Charles, LINDECKER-Charles` | Every other spelling of the lead a recap may use, folded into one block. Comma-separated; blanks and duplicates are dropped. |
| Docs output | `contribution-summary.md` | Default target of the contributor summary. |

Available colours: `default`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
and their `bright_*` variants.

Two settings are **validated before they are accepted**, and the previous value is kept when
validation fails:

- *Project root* must exist and contain a `Localization/` subfolder.
- *Source locale* must exist as `Localization/<name>/`, or — in `Dumps` mode — the project
  must have a `Dumps/` folder.

Theme changes apply immediately, without restarting the console. Every change is persisted as
soon as it is made; if the file cannot be written, the console warns and keeps the change for
the current session rather than failing.

## Where settings live

`settings.json` is stored **per user, outside the package**, so a global install in a
root-owned prefix (`/usr/local/lib/node_modules`, `C:\Program Files\nodejs`) stays writable:

| Platform | Path |
| --- | --- |
| Windows | `%APPDATA%\pvzf-console\settings.json` — then `%LOCALAPPDATA%`, then `~\AppData\Roaming\pvzf-console\` |
| macOS | `~/Library/Application Support/pvzf-console/settings.json` |
| Linux / BSD | `$XDG_CONFIG_HOME/pvzf-console/settings.json`, else `~/.config/pvzf-console/settings.json` |

`$XDG_CONFIG_HOME` wins on every POSIX platform, macOS included, when it is set to an
absolute path — the specification says relative values must be ignored. When no home
directory can be resolved at all, the console falls back to the legacy in-package path.

## On-disk format

Keys are snake_case, kept that way for backward compatibility. Unknown keys are dropped on
load, and a hand-edited alias list is filtered down to usable strings, so an edited file can
never crash the console.

```json
{
  "project_root": "/home/alice/PvZ_Fusion_Translator",
  "source_locale": "English",
  "color": "default",
  "accent_color": "cyan",
  "density": "comfortable",
  "show_emoji": true,
  "show_banner": true,
  "trello_label": "To be translated",
  "docs_lead_name": "Charles LINDECKER",
  "docs_lead_aliases": ["@LINDECKER-Charles", "LINDECKER-Charles"],
  "docs_output": "contribution-summary.md"
}
```

`"project_root": null` means "use the auto-discovered folder".

Files round-trip in both directions: a file written by an older minor loads with the missing
fields defaulted, and a newer file read by an older install simply drops the keys it does not
know. Downgrading is safe.

## Environment variables

| Variable | Effect |
| --- | --- |
| `PVZF_CONSOLE_SETTINGS` | Absolute path to the settings file to use, overriding the per-user location. A leading `~` is expanded. |
| `XDG_CONFIG_HOME` | Standard XDG override for the config directory on POSIX platforms, honoured on macOS too. |
| `APPDATA` / `LOCALAPPDATA` | Windows config directory, in that order of preference. |
| `HOME` / `USERPROFILE` | Consulted when resolving `~` and the fallback config directory. |

`PVZF_CONSOLE_SETTINGS` is the clean way to pin a configuration in CI or for a portable
install:

```bash
PVZF_CONSOLE_SETTINGS=./ci-settings.json pvzf-console diff --lang French
```

Resolution order is: the environment override, then the per-user config directory, then the
legacy in-package path.

## Upgrading from 1.4.1 or earlier

Versions up to 1.4.1 kept `settings.json` inside the installed package. That file is still
**read** on first launch and copied to the new per-user location on the next save, so an
upgrade needs no action. The old copy is left in place — an older install alongside keeps
working — but from that point the two files no longer track each other.
