from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from typing import Callable, List, Optional

from pvz_console.parsers.loaders import DUMPS_SOURCE, list_localizations

# Force UTF-8 on Windows consoles so emojis and translated strings
# don't crash the program via cp1252.
for _stream in (sys.stdout, sys.stderr):
    _reconfigure = getattr(_stream, "reconfigure", None)
    if _reconfigure is not None:
        _reconfigure(encoding="utf-8", errors="replace")

from pvz_console.cli.banner import render_title
from pvz_console.cli.menus import (
    MenuOption,
    ask_choice,
    ask_choice_from_list,
    ask_text,
    clear_console,
    error,
    info,
    press_enter_to_continue,
    section,
    select_localization,
    success,
    warn,
)
from pvz_console.cli.theme import THEME, enable_ansi_on_windows
from pvz_console.config import (
    EXPORTS_ROOT,
    REPORTS_ROOT,
    TITLE_CANDIDATES,
)
from pvz_console.settings import (
    COLORS,
    DENSITIES,
    AppSettings,
    load_settings,
    save_settings,
)
from pvz_console.core.diff import missing_by_id
from pvz_console.parsers.almanac import load_achievements, load_plants, load_zombies
from pvz_console.parsers.strings import (
    ABYSS_BUFFS_FILE,
    TIPS_FS_FILE,
    TIPS_IZ_FILE,
    TRAVEL_BUFFS_FILE,
    diff_abyss_buffs,
    diff_regexs,
    diff_strings,
    diff_tips_fs,
    diff_tips_iz,
    diff_travel_buffs,
    strings_file_exists,
)
from pvz_console.reporting.markdown import (
    build_abyss_buffs_report,
    build_achievement_report,
    build_plant_report,
    build_regexs_report,
    build_strings_report,
    build_tips_report,
    build_travel_buffs_report,
    build_zombie_report,
)
from pvz_console.tools.tips_migration import MigrationResult, migrate_tips
from pvz_console.tools.trello_export import export_trello

# ---- runtime configuration (loaded at startup, mutated by the Settings menu) --

_SETTINGS: AppSettings = load_settings()


def _apply_theme(settings: AppSettings) -> None:
    THEME.configure(
        color=settings.color,
        accent=settings.accent_color,
        density=settings.density,
        show_emoji=settings.show_emoji,
        show_banner=settings.show_banner,
    )


def _project_root_str() -> str:
    return str(_SETTINGS.resolved_project_root())


def _source_locale() -> str:
    return _SETTINGS.source_locale


# ---------- Show-what's-missing dispatch ---------------------------------------

@dataclass(frozen=True)
class TranslationType:
    label: str
    run: Callable[[List[str]], int]


_REPORTS_ROOT_STR = str(REPORTS_ROOT)


def _run_plants(locales: List[str]) -> int:
    src = load_plants(_project_root_str(), _source_locale())
    total = 0
    for loc in locales:
        if loc == _source_locale():
            continue
        missing = missing_by_id(src, load_plants(_project_root_str(), loc))
        total += len(missing)
        build_plant_report(missing, loc, _REPORTS_ROOT_STR)
    return total


def _run_zombies(locales: List[str]) -> int:
    src = load_zombies(_project_root_str(), _source_locale())
    total = 0
    for loc in locales:
        if loc == _source_locale():
            continue
        missing = missing_by_id(src, load_zombies(_project_root_str(), loc))
        total += len(missing)
        build_zombie_report(missing, loc, _REPORTS_ROOT_STR)
    return total


def _run_achievements(locales: List[str]) -> int:
    src = load_achievements(_project_root_str(), _source_locale())
    total = 0
    for loc in locales:
        if loc == _source_locale():
            continue
        missing = missing_by_id(src, load_achievements(_project_root_str(), loc))
        total += len(missing)
        build_achievement_report(missing, loc, _REPORTS_ROOT_STR)
    return total


def _run_strings(locales: List[str]) -> int:
    total = 0
    for loc in locales:
        if loc == _source_locale():
            continue
        entries = diff_strings(_project_root_str(), _source_locale(), loc)
        total += len(entries)
        build_strings_report(entries, loc, _REPORTS_ROOT_STR)
    return total


def _run_regexs(locales: List[str]) -> int:
    total = 0
    for loc in locales:
        if loc == _source_locale():
            continue
        entries = diff_regexs(_project_root_str(), _source_locale(), loc)
        total += len(entries)
        build_regexs_report(entries, loc, _REPORTS_ROOT_STR)
    return total


def _run_tips(locales: List[str]) -> int:
    total = 0
    for loc in locales:
        if loc == _source_locale():
            continue
        if strings_file_exists(_project_root_str(), loc, TIPS_IZ_FILE):
            entries = diff_tips_iz(_project_root_str(), _source_locale(), loc)
            total += len(entries)
            build_tips_report(entries, loc, _REPORTS_ROOT_STR, kind="iz")
        else:
            warn(f"{loc}: {TIPS_IZ_FILE} missing \u2014 run Translator Tools > Migrate tips")

        if strings_file_exists(_project_root_str(), loc, TIPS_FS_FILE):
            entries = diff_tips_fs(_project_root_str(), _source_locale(), loc)
            total += len(entries)
            build_tips_report(entries, loc, _REPORTS_ROOT_STR, kind="fs")
        else:
            warn(f"{loc}: {TIPS_FS_FILE} missing \u2014 run Translator Tools > Migrate tips")
    return total


def _run_abyss_buffs(locales: List[str]) -> int:
    total = 0
    for loc in locales:
        if loc == _source_locale():
            continue
        if not strings_file_exists(_project_root_str(), loc, ABYSS_BUFFS_FILE):
            warn(f"{loc}: {ABYSS_BUFFS_FILE} missing")
            continue
        entries = diff_abyss_buffs(_project_root_str(), _source_locale(), loc)
        total += len(entries)
        build_abyss_buffs_report(entries, loc, _REPORTS_ROOT_STR)
    return total


def _run_travel_buffs(locales: List[str]) -> int:
    total = 0
    for loc in locales:
        if loc == _source_locale():
            continue
        if not strings_file_exists(_project_root_str(), loc, TRAVEL_BUFFS_FILE):
            warn(f"{loc}: {TRAVEL_BUFFS_FILE} missing")
            continue
        entries = diff_travel_buffs(_project_root_str(), _source_locale(), loc)
        total += len(entries)
        build_travel_buffs_report(entries, loc, _REPORTS_ROOT_STR)
    return total


TRANSLATION_TYPES: dict[int, TranslationType] = {
    1: TranslationType("Plants", _run_plants),
    2: TranslationType("Zombies", _run_zombies),
    3: TranslationType("Achievements", _run_achievements),
    4: TranslationType("Strings (UI)", _run_strings),
    5: TranslationType("Regex", _run_regexs),
    6: TranslationType("Tips (IZ + FS)", _run_tips),
    7: TranslationType("Abyss buffs", _run_abyss_buffs),
    8: TranslationType("Travel buffs", _run_travel_buffs),
}


def _as_list(choice) -> List[str]:
    return choice if isinstance(choice, list) else [choice]


def _run_all(locales: List[str]) -> int:
    return sum(t.run(locales) for t in TRANSLATION_TYPES.values())


def _require_valid_project_root() -> bool:
    """Guard: prints a friendly error and returns False if the configured
    project root is missing or not a ``PvZ_Fusion_Translator/`` layout.
    Prevents the interactive tools from crashing on ``os.listdir`` / ``open``.
    """
    err = _SETTINGS.validate_project_root()
    if err is None:
        return True
    error(err)
    info("Fix it via [3] Settings \u2192 Change PvZ_Fusion_Translator folder.")
    press_enter_to_continue()
    return False


def _show_missing() -> None:
    if not _require_valid_project_root():
        return
    clear_console()
    localiz = select_localization(_project_root_str())
    clear_console()
    info(f"Localization: {localiz if not isinstance(localiz, list) else 'All (' + str(len(localiz)) + ')'}")

    options = [MenuOption("0", "All types")] + [
        MenuOption(str(k), t.label) for k, t in TRANSLATION_TYPES.items()
    ]
    choice = ask_choice("Select translation type", options, default=-1)
    clear_console()

    locales = _as_list(localiz)
    if choice == 0:
        info("Type: All")
        count = _run_all(locales)
    elif choice in TRANSLATION_TYPES:
        trans = TRANSLATION_TYPES[choice]
        info(f"Type: {trans.label}")
        count = trans.run(locales)
    else:
        error("Invalid choice.")
        press_enter_to_continue()
        return

    print()
    success(f"Total missing entries found: {count}")
    press_enter_to_continue()


# ---------- Translator tools ---------------------------------------------------

def _print_migration_result(result: MigrationResult) -> None:
    print()
    info(f"\u2728 {result.locale}")
    if result.skipped_empty_translation_strings:
        error("  translation_strings.json is empty or missing \u2014 nothing to migrate.")
        return
    for name in result.migrated:
        success(f"  Created {name}")
    for name in result.skipped_already_present:
        info(f"  \u21b7 Skipped {name} (already present)")
    for name in result.skipped_missing_source:
        warn(f"  Skipped {name} (no dump source in Dumps/)")
    for name, gap in result.skipped_incomplete.items():
        error(f"  Skipped {name} \u2014 {gap} source string(s) missing from translation_strings.json")
    if not any((result.migrated, result.skipped_already_present,
                result.skipped_missing_source, result.skipped_incomplete)):
        info("  \u2014 nothing to do.")


def _tool_tips_migration() -> None:
    if not _require_valid_project_root():
        return
    clear_console()
    section("Migrate tips (tips_iz / tips_fs)")
    info("Pulls tip translations from translation_strings.json into the new tips files.")
    info("Only runs when every source tip is present \u2014 incomplete sets are skipped.")

    locale = select_localization(
        _project_root_str(),
        allow_multi=False,
        exclude=[_source_locale()],
    )
    clear_console()
    result = migrate_tips(_project_root_str(), locale)
    _print_migration_result(result)
    press_enter_to_continue()


def _tool_trello_export() -> None:
    if not _require_valid_project_root():
        return
    clear_console()
    section("Export Trello CSV")
    info("Generates a CSV of every untranslated entry for the chosen locale,")
    info("ready for import with the 'Import to Trello by Blue Cat' Power-Up.")

    locale = select_localization(
        _project_root_str(),
        allow_multi=False,
        exclude=[_source_locale()],
    )
    clear_console()
    info(f"Building Trello export for {locale}\u2026")
    result = export_trello(
        locale,
        EXPORTS_ROOT,
        root=_project_root_str(),
        label=_SETTINGS.trello_label,
        source=_source_locale(),
    )

    print()
    success(f"Output folder: {result.output_dir}")
    success(f"README:        {result.readme_path}")
    print()
    if not result.counts_by_list:
        info("Nothing to export \u2014 the target locale looks fully translated. \U0001f389")
    else:
        section("Cards per Trello list")
        width = max(len(name) for name in result.counts_by_list) + 2
        for name, count in result.counts_by_list.items():
            csv_name = os.path.basename(result.csv_paths.get(name, ""))
            print(f"    {name:<{width}} {count:>6}   {csv_name}")
        print(f"\n    {'TOTAL':<{width}} {result.total_cards:>6}")
    press_enter_to_continue()


def _translator_tools() -> None:
    options = [
        MenuOption("1", "Migrate tips \u2014 translation_strings.json \u2192 tips_iz/tips_fs"),
        MenuOption("2", "Export Trello CSV \u2014 missing translations for a locale"),
        MenuOption("0", "Back"),
    ]
    while True:
        clear_console()
        choice = ask_choice("Translator Tools", options, default=-1)
        clear_console()
        match choice:
            case 1:
                _tool_tips_migration()
            case 2:
                _tool_trello_export()
            case 0:
                return
            case _:
                error("Invalid choice.")
                press_enter_to_continue()


# ---------- Settings -----------------------------------------------------------

def _show_current_settings() -> None:
    section("Current settings")
    s = _SETTINGS
    root_status = s.validate_project_root()
    root_badge = "\u2705 valid" if root_status is None else f"\u274c {root_status}"
    print(f"    Project root     : {s.resolved_project_root()}  ({root_badge})")
    src_status = s.validate_source_locale() if root_status is None else None
    src_badge = "\u2705 valid" if src_status is None else f"\u274c {src_status}"
    src_suffix = "" if root_status is not None else f"  ({src_badge})"
    print(f"    Source locale    : {s.source_locale}{src_suffix}")
    print(f"    Text color       : {s.color}")
    print(f"    Accent color     : {s.accent_color}")
    print(f"    Density          : {s.density}")
    print(f"    Show emoji       : {s.show_emoji}")
    print(f"    Show banner      : {s.show_banner}")
    print(f"    Trello label     : {s.trello_label}")


def _edit_project_root() -> None:
    clear_console()
    section("Change PvZ_Fusion_Translator folder")
    info(f"Current: {_SETTINGS.resolved_project_root()}")
    info("Leave blank to revert to the bundled default.")
    raw = ask_text("New absolute path", default="")
    previous = _SETTINGS.project_root
    _SETTINGS.project_root = raw or None
    err = _SETTINGS.validate_project_root()
    if err is not None:
        error(err)
        _SETTINGS.project_root = previous
        press_enter_to_continue()
        return
    save_settings(_SETTINGS)
    success("Project root updated.")
    press_enter_to_continue()


def _edit_source_locale() -> None:
    if not _require_valid_project_root():
        return
    clear_console()
    section("Change source locale")
    info("The source locale is the reference used to detect missing translations.")
    info(f"Pick '{DUMPS_SOURCE}' to diff every locale against the raw game dumps.")
    choices = [DUMPS_SOURCE] + list_localizations(_project_root_str())
    choice = ask_choice_from_list("Source locale", choices, _SETTINGS.source_locale)
    previous = _SETTINGS.source_locale
    _SETTINGS.source_locale = choice
    err = _SETTINGS.validate_source_locale()
    if err is not None:
        error(err)
        _SETTINGS.source_locale = previous
        press_enter_to_continue()
        return
    save_settings(_SETTINGS)
    success(f"Source locale set to '{choice}'.")
    press_enter_to_continue()


def _edit_color(attr: str, label: str) -> None:
    current = getattr(_SETTINGS, attr)
    choice = ask_choice_from_list(label, COLORS, current)
    setattr(_SETTINGS, attr, choice)
    _apply_theme(_SETTINGS)
    save_settings(_SETTINGS)


def _edit_density() -> None:
    choice = ask_choice_from_list("Spacing density", DENSITIES, _SETTINGS.density)
    _SETTINGS.density = choice
    _apply_theme(_SETTINGS)
    save_settings(_SETTINGS)


def _toggle(attr: str) -> None:
    setattr(_SETTINGS, attr, not getattr(_SETTINGS, attr))
    _apply_theme(_SETTINGS)
    save_settings(_SETTINGS)


def _reset_settings() -> None:
    global _SETTINGS
    _SETTINGS = AppSettings()
    _apply_theme(_SETTINGS)
    save_settings(_SETTINGS)


def _edit_trello_label() -> None:
    clear_console()
    section("Trello label")
    info(f"Current: {_SETTINGS.trello_label}")
    new_label = ask_text("New label", default=_SETTINGS.trello_label)
    _SETTINGS.trello_label = new_label
    save_settings(_SETTINGS)
    success("Label updated.")
    press_enter_to_continue()


def _settings_menu() -> None:
    options = [
        MenuOption("1", "Change PvZ_Fusion_Translator folder"),
        MenuOption("2", "Change source locale (reference)"),
        MenuOption("3", "Change text color"),
        MenuOption("4", "Change accent color"),
        MenuOption("5", "Change spacing density"),
        MenuOption("6", "Toggle emoji"),
        MenuOption("7", "Toggle ASCII banner"),
        MenuOption("8", "Change Trello label text"),
        MenuOption("9", "Reset to defaults"),
        MenuOption("0", "Back"),
    ]
    while True:
        clear_console()
        _show_current_settings()
        choice = ask_choice("Settings", options, default=-1)
        clear_console()
        match choice:
            case 1:
                _edit_project_root()
            case 2:
                _edit_source_locale()
            case 3:
                _edit_color("color", "Text color")
            case 4:
                _edit_color("accent_color", "Accent color")
            case 5:
                _edit_density()
            case 6:
                _toggle("show_emoji")
            case 7:
                _toggle("show_banner")
            case 8:
                _edit_trello_label()
            case 9:
                _reset_settings()
                success("Settings reset to defaults.")
                press_enter_to_continue()
            case 0:
                return
            case _:
                error("Invalid choice.")
                press_enter_to_continue()


# ---------- Entry point --------------------------------------------------------

def _main_menu() -> int:
    options = [
        MenuOption("1", "Show what's missing"),
        MenuOption("2", "Translator tools"),
        MenuOption("3", "Settings"),
        MenuOption("0", "Exit"),
    ]
    return ask_choice("Main menu", options, default=-1)


def _parse_cli_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="pvzf-console",
        description="Translation toolkit for Plants vs Zombies: Fusion. "
                    "Run without arguments to launch the interactive TUI.",
    )
    sub = parser.add_subparsers(dest="command", metavar="command")

    diff = sub.add_parser(
        "diff",
        help="Generate missing-translation reports for one locale (non-interactive).",
        description="Scan every translation file type for the given locale and "
                    "write per-type reports under <out>/<locale>/.",
    )
    diff.add_argument("--lang", required=True, metavar="LOCALE",
                      help="Target locale name (e.g. French, German).")
    diff.add_argument("--out", default=None, metavar="DIR",
                      help="Output directory (default: ./reports).")

    return parser.parse_args(argv)


def _cmd_diff(lang: str, out: Optional[str]) -> int:
    global _REPORTS_ROOT_STR

    err = _SETTINGS.validate_project_root()
    if err is not None:
        sys.stderr.write(f"error: {err}\n")
        return 2

    locales = list_localizations(_project_root_str())
    if lang not in locales:
        sys.stderr.write(f"error: locale '{lang}' not found.\n")
        sys.stderr.write(f"available: {', '.join(locales)}\n")
        return 2
    if lang == _source_locale():
        sys.stderr.write(f"error: '{lang}' is the source locale ({_source_locale()}); nothing to diff.\n")
        return 2

    if out is not None:
        _REPORTS_ROOT_STR = out

    print(f"pvzf-console: diff {lang} \u2192 {_REPORTS_ROOT_STR}/{lang}/")
    count = _run_all([lang])
    print(f"pvzf-console: {count} missing entries")
    return 0


def _run_interactive() -> None:
    clear_console()
    if _SETTINGS.show_banner:
        render_title(TITLE_CANDIDATES)
    info("Translation toolkit for Plants vs Zombies: Fusion.")

    err = _SETTINGS.validate_project_root()
    if err is not None:
        warn(err)
        info("Fix it via [3] Settings \u2192 Change PvZ_Fusion_Translator folder.")
    else:
        src_err = _SETTINGS.validate_source_locale()
        if src_err is not None:
            warn(src_err)
            info("Fix it via [3] Settings \u2192 Change source locale.")

    while True:
        choice = _main_menu()
        clear_console()
        match choice:
            case 1:
                _show_missing()
            case 2:
                _translator_tools()
            case 3:
                _settings_menu()
            case 0:
                info("Goodbye!")
                return
            case _:
                error("Invalid choice.")
                press_enter_to_continue()


def main() -> None:
    enable_ansi_on_windows()
    _apply_theme(_SETTINGS)

    args = _parse_cli_args()
    if args.command == "diff":
        sys.exit(_cmd_diff(args.lang, args.out))

    _run_interactive()


if __name__ == "__main__":
    main()
