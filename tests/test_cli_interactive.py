"""Drives every interactive branch of cli/app.py with mocked UI helpers.

The strategy: silence side-effecting helpers (info/warn/error/clear_console/
press_enter_to_continue/section), drive ask_choice/select_localization/
ask_text/ask_choice_from_list with iterators of canned responses, and
monkeypatch the module-level _SETTINGS to point at temp project trees.
"""
from __future__ import annotations

import io
import sys
from pathlib import Path
from typing import Iterator

import pytest

from pvz_console.cli import app as cli_app
from pvz_console.parsers.almanac import (
    ACHIEVEMENTS_FILE,
    PLANTS_FILE,
    ZOMBIES_FILE,
)
from pvz_console.settings import AppSettings


# ---------- shared fixtures ----------------------------------------------------

@pytest.fixture
def silence_ui(monkeypatch):
    """Silence every print-ish helper so test output stays clean."""
    for name in (
        "clear_console", "press_enter_to_continue",
        "info", "success", "warn", "error", "section",
    ):
        monkeypatch.setattr(cli_app, name, lambda *a, **kw: None)


@pytest.fixture
def configured(monkeypatch, project_root, tmp_path, silence_ui):
    """Point the module at a tmp project root + tmp reports dir."""
    monkeypatch.setattr(
        cli_app,
        "_SETTINGS",
        AppSettings(project_root=str(project_root), source_locale="English"),
    )
    reports = tmp_path / "reports"
    monkeypatch.setattr(cli_app, "_REPORTS_ROOT_STR", str(reports))
    return reports


def _seq(*values) -> Iterator:
    """Build a side_effect callable that yields ``values`` in order."""
    it = iter(values)
    return lambda *a, **kw: next(it)


# ---------- _run_* source-locale-skip branches --------------------------------

def test_run_plants_skips_when_only_source_locale_provided(configured):
    assert cli_app._run_plants(["English"]) == 0


def test_run_zombies_skips_when_only_source_locale_provided(configured):
    assert cli_app._run_zombies(["English"]) == 0


def test_run_achievements_skips_when_only_source_locale_provided(configured):
    assert cli_app._run_achievements(["English"]) == 0


def test_run_regexs_skips_when_only_source_locale_provided(configured):
    assert cli_app._run_regexs(["English"]) == 0


def test_run_tips_skips_when_only_source_locale_provided(configured):
    assert cli_app._run_tips(["English"]) == 0


def test_run_abyss_buffs_skips_when_only_source_locale_provided(configured):
    assert cli_app._run_abyss_buffs(["English"]) == 0


def test_run_travel_buffs_skips_when_only_source_locale_provided(configured):
    assert cli_app._run_travel_buffs(["English"]) == 0


# ---------- _run_tips: present + missing files paths --------------------------

def test_run_tips_writes_reports_when_files_present(configured, make_locale):
    make_locale("English", strings={
        "tips_iz.json": {"a": "A"}, "tips_fs.json": {"b": "B"},
    })
    make_locale("French", strings={"tips_iz.json": {}, "tips_fs.json": {}})
    count = cli_app._run_tips(["French"], with_diff=True)
    assert count == 2
    assert (configured / "French" / "missing_tips_iz.md").is_file()
    assert (configured / "French" / "tips_iz_diff.json").is_file()
    assert (configured / "French" / "tips_fs_diff.json").is_file()


def test_run_abyss_and_travel_buffs_with_present_files(configured, make_locale):
    make_locale("English", strings={
        "abyss_buffs.json": {"a": "A"},
        "travel_buffs.json": {"cat": {"k": "V"}},
    })
    make_locale("French", strings={
        "abyss_buffs.json": {}, "travel_buffs.json": {},
    })
    assert cli_app._run_abyss_buffs(["French"], with_diff=True) == 1
    assert cli_app._run_travel_buffs(["French"], with_diff=True) == 1
    assert (configured / "French" / "abyss_buffs_diff.json").is_file()
    assert (configured / "French" / "travel_buffs_diff.json").is_file()


def test_run_tips_without_diff_skips_json_export(configured, make_locale):
    make_locale("English", strings={
        "tips_iz.json": {"a": "A"}, "tips_fs.json": {"b": "B"},
    })
    make_locale("French", strings={"tips_iz.json": {}, "tips_fs.json": {}})
    cli_app._run_tips(["French"], with_diff=False)
    assert not (configured / "French" / "tips_iz_diff.json").exists()
    assert not (configured / "French" / "tips_fs_diff.json").exists()


def test_run_abyss_and_travel_without_diff(configured, make_locale):
    make_locale("English", strings={
        "abyss_buffs.json": {"a": "A"},
        "travel_buffs.json": {"cat": {"k": "V"}},
    })
    make_locale("French", strings={
        "abyss_buffs.json": {}, "travel_buffs.json": {},
    })
    cli_app._run_abyss_buffs(["French"], with_diff=False)
    cli_app._run_travel_buffs(["French"], with_diff=False)
    assert not (configured / "French" / "abyss_buffs_diff.json").exists()
    assert not (configured / "French" / "travel_buffs_diff.json").exists()


# ---------- _apply_theme -------------------------------------------------------

def test_apply_theme_passes_settings_to_theme(monkeypatch):
    captured = {}
    monkeypatch.setattr(cli_app.THEME, "configure", lambda **kw: captured.update(kw))
    s = AppSettings(
        color="red", accent_color="cyan", density="compact",
        show_emoji=False, show_banner=True,
    )
    cli_app._apply_theme(s)
    assert captured == {
        "color": "red", "accent": "cyan", "density": "compact",
        "show_emoji": False, "show_banner": True,
    }


# ---------- _require_valid_project_root --------------------------------------

def test_require_valid_project_root_returns_false_when_invalid(monkeypatch, silence_ui, tmp_path):
    bad = AppSettings(project_root=str(tmp_path / "nope"), source_locale="English")
    monkeypatch.setattr(cli_app, "_SETTINGS", bad)
    assert cli_app._require_valid_project_root() is False


# ---------- _show_missing -----------------------------------------------------

def test_show_missing_returns_early_when_root_invalid(monkeypatch, silence_ui, tmp_path):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(project_root=str(tmp_path / "nope")))
    cli_app._show_missing()  # no exception, returns silently


def test_show_missing_runs_all_types_with_diff_for_single_locale(configured, make_locale, monkeypatch):
    make_locale("English", strings={"translation_strings.json": {"k": "V"}})
    make_locale("French")
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: "French")
    monkeypatch.setattr(cli_app, "ask_choice", lambda *a, **kw: 0)  # "All types"
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: "y")  # with_diff=True
    cli_app._show_missing()
    assert (configured / "French" / "missing_strings.md").is_file()
    assert (configured / "French" / "strings_diff.json").is_file()


def test_show_missing_runs_specific_type_for_all_locales(configured, make_locale, monkeypatch):
    make_locale("English", strings={"translation_strings.json": {"k": "V"}})
    make_locale("French")
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: ["English", "French"])
    monkeypatch.setattr(cli_app, "ask_choice", lambda *a, **kw: 4)  # Strings
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: "")   # default no
    cli_app._show_missing()
    assert (configured / "French" / "missing_strings.md").is_file()


def test_show_missing_rejects_invalid_choice(configured, make_locale, monkeypatch):
    make_locale("French")
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: "French")
    monkeypatch.setattr(cli_app, "ask_choice", lambda *a, **kw: 99)
    cli_app._show_missing()
    assert not (configured / "French").exists()


# ---------- _print_migration_result -------------------------------------------

def test_print_migration_result_handles_every_branch(silence_ui):
    from pvz_console.tools.tips_migration import MigrationResult

    cli_app._print_migration_result(MigrationResult(locale="French"))  # nothing-to-do
    cli_app._print_migration_result(MigrationResult(
        locale="French", skipped_empty_translation_strings=True,
    ))
    cli_app._print_migration_result(MigrationResult(
        locale="French",
        migrated=["a"],
        skipped_already_present=["b"],
        skipped_missing_source=["c"],
        skipped_incomplete={"d": 3},
    ))


# ---------- _tool_tips_migration ----------------------------------------------

def test_tool_tips_migration_returns_early_when_root_invalid(monkeypatch, silence_ui, tmp_path):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(project_root=str(tmp_path / "x")))
    cli_app._tool_tips_migration()


def test_tool_tips_migration_runs_to_completion(configured, make_locale, monkeypatch):
    make_locale("French", strings={"translation_strings.json": {"x": "y"}})
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: "French")
    cli_app._tool_tips_migration()


# ---------- _tool_trello_export -----------------------------------------------

def test_tool_trello_export_returns_early_when_root_invalid(monkeypatch, silence_ui, tmp_path):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(project_root=str(tmp_path / "x")))
    cli_app._tool_trello_export()


def test_tool_trello_export_with_pending_cards(configured, make_locale, monkeypatch, tmp_path):
    make_locale("English", strings={"translation_strings.json": {"k": "Hello"}})
    make_locale("French")
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: "French")
    monkeypatch.setattr(cli_app, "EXPORTS_ROOT", tmp_path / "exports")
    cli_app._tool_trello_export()


def test_tool_trello_export_with_fully_translated_locale(configured, make_locale, monkeypatch, tmp_path):
    make_locale("English", strings={"translation_strings.json": {"k": "v"}})
    make_locale("French", strings={"translation_strings.json": {"k": "v-fr"}})
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: "French")
    monkeypatch.setattr(cli_app, "EXPORTS_ROOT", tmp_path / "exports")
    cli_app._tool_trello_export()


# ---------- _print_duplicates_result -------------------------------------------

def test_print_duplicates_result_clean(silence_ui):
    from pvz_console.tools.duplicate_checker import LocaleDuplicates
    cli_app._print_duplicates_result(LocaleDuplicates(locale="French"), report_path=None)


def test_print_duplicates_result_with_findings(silence_ui):
    from pvz_console.tools.duplicate_checker import FileDuplicates, LocaleDuplicates
    result = LocaleDuplicates(locale="French", files=[
        FileDuplicates(filename="x.json", duplicate_keys=[("a", 2)]),
        FileDuplicates(filename="y.json"),  # has_any False → skipped
    ])
    cli_app._print_duplicates_result(result, report_path="/tmp/x.md")


def test_print_duplicates_result_with_findings_but_no_report_path(silence_ui):
    """Branch 422->exit: ``report_path`` is None, the trailing info() is skipped."""
    from pvz_console.tools.duplicate_checker import FileDuplicates, LocaleDuplicates
    result = LocaleDuplicates(locale="French", files=[
        FileDuplicates(filename="x.json", duplicate_keys=[("a", 2)]),
    ])
    cli_app._print_duplicates_result(result, report_path=None)


# ---------- _tool_duplicate_checker -------------------------------------------

def test_tool_duplicate_checker_returns_early_when_root_invalid(monkeypatch, silence_ui, tmp_path):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(project_root=str(tmp_path / "x")))
    cli_app._tool_duplicate_checker()


def test_tool_duplicate_checker_scans_all_locales(configured, make_locale, monkeypatch):
    make_locale("French", strings={"translation_strings.json": {"a": "Hi", "b": "Hi"}})
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: ["French"])
    cli_app._tool_duplicate_checker()
    assert (configured / "French" / "duplicates.md").is_file()


# ---------- _translator_tools -------------------------------------------------

def test_translator_tools_dispatches_each_branch(monkeypatch, configured, make_locale, tmp_path):
    """Walk every menu option in sequence, ending with [0] Back."""
    make_locale("French", strings={"translation_strings.json": {"x": "y"}})
    monkeypatch.setattr(cli_app, "ask_choice", _seq(1, 2, 3, 99, 0))
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: "French")
    monkeypatch.setattr(cli_app, "EXPORTS_ROOT", tmp_path / "exports")
    cli_app._translator_tools()


# ---------- _show_current_settings + _settings_menu sub-actions ---------------

def test_show_current_settings_prints_for_valid_and_invalid_root(monkeypatch, silence_ui, project_root, tmp_path):
    # Valid: a real project_root + matching source locale
    (project_root / "Localization" / "English").mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(
        project_root=str(project_root), source_locale="English",
    ))
    cli_app._show_current_settings()

    # Invalid: nonexistent root.
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(project_root=str(tmp_path / "nope")))
    cli_app._show_current_settings()


def test_edit_project_root_accepts_valid_path(monkeypatch, configured, project_root):
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: str(project_root))
    monkeypatch.setattr(cli_app, "save_settings", lambda *a, **kw: None)
    cli_app._edit_project_root()
    assert cli_app._SETTINGS.project_root == str(project_root)


def test_edit_project_root_rejects_invalid_path(monkeypatch, configured, tmp_path):
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: str(tmp_path / "nope"))
    monkeypatch.setattr(cli_app, "save_settings", lambda *a, **kw: None)
    previous = cli_app._SETTINGS.project_root
    cli_app._edit_project_root()
    # On failure the previous value is restored.
    assert cli_app._SETTINGS.project_root == previous


def test_edit_project_root_blank_reverts_to_default(monkeypatch, configured):
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: "")
    monkeypatch.setattr(cli_app, "save_settings", lambda *a, **kw: None)
    cli_app._edit_project_root()


def test_edit_source_locale_returns_early_when_root_invalid(monkeypatch, silence_ui, tmp_path):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(project_root=str(tmp_path / "x")))
    cli_app._edit_source_locale()


def test_edit_source_locale_saves_valid_choice(monkeypatch, configured, make_locale):
    make_locale("French")
    monkeypatch.setattr(cli_app, "ask_choice_from_list", lambda *a, **kw: "French")
    monkeypatch.setattr(cli_app, "save_settings", lambda *a, **kw: None)
    cli_app._edit_source_locale()
    assert cli_app._SETTINGS.source_locale == "French"


def test_edit_source_locale_reverts_on_invalid_choice(monkeypatch, configured):
    monkeypatch.setattr(cli_app, "ask_choice_from_list", lambda *a, **kw: "Klingon")
    monkeypatch.setattr(cli_app, "save_settings", lambda *a, **kw: None)
    previous = cli_app._SETTINGS.source_locale
    cli_app._edit_source_locale()
    assert cli_app._SETTINGS.source_locale == previous


def test_edit_color_density_toggle_and_label(monkeypatch, configured):
    monkeypatch.setattr(cli_app, "ask_choice_from_list", _seq("red", "compact"))
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: "new label")
    monkeypatch.setattr(cli_app, "save_settings", lambda *a, **kw: None)
    monkeypatch.setattr(cli_app.THEME, "configure", lambda **kw: None)

    cli_app._edit_color("color", "Text color")
    assert cli_app._SETTINGS.color == "red"
    cli_app._edit_density()
    assert cli_app._SETTINGS.density == "compact"
    before = cli_app._SETTINGS.show_emoji
    cli_app._toggle("show_emoji")
    assert cli_app._SETTINGS.show_emoji is (not before)
    cli_app._edit_trello_label()
    assert cli_app._SETTINGS.trello_label == "new label"


def test_reset_settings_replaces_singleton(monkeypatch, configured):
    monkeypatch.setattr(cli_app, "save_settings", lambda *a, **kw: None)
    monkeypatch.setattr(cli_app.THEME, "configure", lambda **kw: None)
    cli_app._reset_settings()
    assert cli_app._SETTINGS.source_locale == "English"
    assert cli_app._SETTINGS.project_root is None


# ---------- _settings_menu loop -----------------------------------------------

def test_settings_menu_walks_every_branch(monkeypatch, configured, make_locale, project_root):
    """Drive the menu through each branch and end on [0] Back."""
    make_locale("English")
    make_locale("French")
    monkeypatch.setattr(cli_app, "ask_choice", _seq(1, 2, 3, 4, 5, 6, 7, 8, 9, 99, 0))
    # Provide answers for the sub-menus we hit in order:
    monkeypatch.setattr(cli_app, "ask_text", _seq(
        str(project_root),  # _edit_project_root
        "new label",        # _edit_trello_label
    ))
    monkeypatch.setattr(cli_app, "ask_choice_from_list", _seq(
        "French",           # _edit_source_locale
        "red",              # _edit_color text
        "cyan",             # _edit_color accent
        "compact",          # _edit_density
    ))
    monkeypatch.setattr(cli_app, "save_settings", lambda *a, **kw: None)
    monkeypatch.setattr(cli_app.THEME, "configure", lambda **kw: None)
    cli_app._settings_menu()


# ---------- _main_menu / _run_interactive / main ------------------------------

def test_main_menu_returns_user_choice(monkeypatch, silence_ui):
    monkeypatch.setattr(cli_app, "ask_choice", lambda *a, **kw: 1)
    assert cli_app._main_menu() == 1


def test_run_interactive_walks_each_top_level_choice(monkeypatch, configured, make_locale):
    make_locale("English")
    make_locale("French")
    monkeypatch.setattr(cli_app, "render_title", lambda *a, **kw: None)
    monkeypatch.setattr(cli_app, "ask_choice", _seq(1, 2, 3, 99, 0))
    # Sub-menus exit immediately when they encounter [0]/invalid
    monkeypatch.setattr(cli_app, "select_localization", lambda *a, **kw: "French")
    # _show_missing
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: "")
    # _translator_tools and _settings_menu both ask for ask_choice via the same patched seq.
    # Actually the iterator above is consumed by both _main_menu and inner menus.
    # To keep this test simple we replace inner menus with no-ops.
    monkeypatch.setattr(cli_app, "_show_missing", lambda: None)
    monkeypatch.setattr(cli_app, "_translator_tools", lambda: None)
    monkeypatch.setattr(cli_app, "_settings_menu", lambda: None)
    cli_app._run_interactive()


def test_run_interactive_warns_on_invalid_root(monkeypatch, silence_ui, tmp_path):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(
        project_root=str(tmp_path / "nope"), source_locale="English", show_banner=False,
    ))
    monkeypatch.setattr(cli_app, "ask_choice", lambda *a, **kw: 0)  # exit immediately
    cli_app._run_interactive()


def test_run_interactive_warns_on_invalid_source_locale(monkeypatch, silence_ui, project_root):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(
        project_root=str(project_root), source_locale="Klingon", show_banner=False,
    ))
    monkeypatch.setattr(cli_app, "ask_choice", lambda *a, **kw: 0)  # exit immediately
    cli_app._run_interactive()


def test_run_interactive_renders_banner_when_enabled(monkeypatch, silence_ui, project_root):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(
        project_root=str(project_root), source_locale="English", show_banner=True,
    ))
    rendered = []
    monkeypatch.setattr(cli_app, "render_title", lambda *a, **kw: rendered.append(True))
    monkeypatch.setattr(cli_app, "ask_choice", lambda *a, **kw: 0)
    cli_app._run_interactive()
    assert rendered


# ---------- main + _parse_cli_args + _cmd_diff branches -----------------------

def test_parse_cli_args_recognizes_diff_subcommand():
    args = cli_app._parse_cli_args(["diff", "--lang", "French", "--with-diff"])
    assert args.command == "diff"
    assert args.lang == "French"
    assert args.with_diff is True
    assert args.out is None


def test_parse_cli_args_no_command():
    args = cli_app._parse_cli_args([])
    assert args.command is None


def test_main_runs_diff_command_and_exits(monkeypatch, configured, make_locale):
    make_locale("English", strings={"translation_strings.json": {"k": "V"}})
    make_locale("French")
    monkeypatch.setattr(sys, "argv", ["pvzf-console", "diff", "--lang", "French"])
    monkeypatch.setattr(cli_app, "enable_ansi_on_windows", lambda: None)
    monkeypatch.setattr(cli_app.THEME, "configure", lambda **kw: None)
    with pytest.raises(SystemExit) as exc:
        cli_app.main()
    assert exc.value.code == 0


def test_main_falls_through_to_interactive_when_no_command(monkeypatch, silence_ui):
    called = []
    monkeypatch.setattr(sys, "argv", ["pvzf-console"])
    monkeypatch.setattr(cli_app, "enable_ansi_on_windows", lambda: None)
    monkeypatch.setattr(cli_app.THEME, "configure", lambda **kw: None)
    monkeypatch.setattr(cli_app, "_run_interactive", lambda: called.append(True))
    cli_app.main()
    assert called == [True]


def test_cmd_diff_fails_when_root_invalid(monkeypatch, silence_ui, tmp_path):
    monkeypatch.setattr(cli_app, "_SETTINGS", AppSettings(project_root=str(tmp_path / "x")))
    rc = cli_app._cmd_diff("French", out=None)
    assert rc == 2


def test_cmd_diff_uses_default_reports_root_when_out_is_none(monkeypatch, configured, make_locale):
    """Branch 680->683: out is None, _REPORTS_ROOT_STR stays untouched."""
    make_locale("English", strings={"translation_strings.json": {"k": "V"}})
    make_locale("French")
    before = cli_app._REPORTS_ROOT_STR
    rc = cli_app._cmd_diff("French", out=None)
    assert rc == 0
    assert cli_app._REPORTS_ROOT_STR == before


# ---------- module-level reconfigure loop -------------------------------------

def test_module_handles_streams_without_reconfigure(monkeypatch):
    """Cover the branch where `getattr(stream, 'reconfigure', None)` is None.

    Reload the module with stdout/stderr lacking `reconfigure` so the import-time
    loop walks the False branch of the inner ``if``.
    """
    import importlib

    class _Plain(io.StringIO):
        pass

    plain = _Plain()
    if hasattr(plain, "reconfigure"):
        # On some Python versions even StringIO has reconfigure. Force-remove.
        del _Plain.reconfigure  # type: ignore[attr-defined]

    monkeypatch.setattr(sys, "stdout", plain)
    monkeypatch.setattr(sys, "stderr", plain)
    importlib.reload(cli_app)
    # Reload again with the real streams to leave the module healthy for other tests.
    monkeypatch.undo()
    importlib.reload(cli_app)
