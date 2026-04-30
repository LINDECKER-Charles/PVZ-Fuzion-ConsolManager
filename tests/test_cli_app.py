from __future__ import annotations

import json
from pathlib import Path

import pytest

from pvz_console.cli import app as cli_app
from pvz_console.parsers.almanac import (
    ACHIEVEMENTS_FILE,
    PLANTS_FILE,
    ZOMBIES_FILE,
)
from pvz_console.settings import AppSettings


@pytest.fixture
def configured_app(monkeypatch, tmp_path, project_root):
    """Point cli_app at the temp project root and a temp reports dir."""
    monkeypatch.setattr(
        cli_app,
        "_SETTINGS",
        AppSettings(project_root=str(project_root), source_locale="English"),
    )
    reports = tmp_path / "reports"
    monkeypatch.setattr(cli_app, "_REPORTS_ROOT_STR", str(reports))
    return reports


def test_run_strings_writes_report_and_returns_missing_count(
    configured_app, make_locale,
):
    make_locale("English", strings={"translation_strings.json": {"a": "A", "b": "B"}})
    make_locale("French", strings={"translation_strings.json": {"a": "FR-A"}})
    count = cli_app._run_strings(["French"])
    assert count == 1
    assert (configured_app / "French" / "missing_strings.md").is_file()


def test_run_strings_with_diff_also_writes_json(configured_app, make_locale):
    make_locale("English", strings={"translation_strings.json": {"a": "A", "b": "B"}})
    make_locale("French", strings={"translation_strings.json": {"a": "FR-A"}})
    cli_app._run_strings(["French"], with_diff=True)
    json_path = configured_app / "French" / "strings_diff.json"
    assert json_path.is_file()
    with open(json_path, encoding="utf-8") as f:
        assert json.load(f) == {"b": "B"}


def test_run_strings_skips_source_locale(configured_app, make_locale):
    make_locale("English", strings={"translation_strings.json": {"a": "A"}})
    assert cli_app._run_strings(["English"]) == 0


def test_run_tips_warns_when_files_missing(configured_app, make_locale, capsys):
    make_locale("English", strings={"tips_iz.json": {"K": "Hi"}, "tips_fs.json": {"K": "Hi"}})
    make_locale("French")
    count = cli_app._run_tips(["French"])
    assert count == 0
    out = capsys.readouterr().out
    assert "tips_iz.json missing" in out
    assert "tips_fs.json missing" in out


def test_run_abyss_buffs_warns_when_target_missing(configured_app, make_locale, capsys):
    make_locale("English", strings={"abyss_buffs.json": {"K": "V"}})
    make_locale("French")
    cli_app._run_abyss_buffs(["French"])
    assert "abyss_buffs.json missing" in capsys.readouterr().out


def test_run_plants_writes_report(configured_app, make_locale):
    make_locale("English", almanac={PLANTS_FILE: {"plants": [
        {"seedType": 1, "name": "Peashooter"},
    ]}})
    make_locale("French", almanac={PLANTS_FILE: {"plants": []}})
    count = cli_app._run_plants(["French"], with_diff=True)
    assert count == 1
    assert (configured_app / "French" / "missing_plants.md").is_file()
    assert (configured_app / "French" / "plants_diff.json").is_file()


def test_run_zombies_and_achievements(configured_app, make_locale):
    make_locale("English", almanac={
        ZOMBIES_FILE: {"zombies": [{"theZombieType": 1, "name": "Z"}]},
        ACHIEVEMENTS_FILE: {"achievements": [{"achievement": "X", "Name": "A"}]},
    })
    make_locale("French", almanac={
        ZOMBIES_FILE: {"zombies": []},
        ACHIEVEMENTS_FILE: {"achievements": []},
    })
    assert cli_app._run_zombies(["French"]) == 1
    assert cli_app._run_achievements(["French"]) == 1


def test_run_all_aggregates_across_types(configured_app, make_locale):
    make_locale("English", strings={
        "translation_strings.json": {"a": "A"},
        "translation_regexs.json": {"r": "R"},
    })
    make_locale("French")
    total = cli_app._run_all(["French"])
    assert total >= 2  # both string types contribute


def test_cmd_diff_runs_end_to_end(configured_app, make_locale, capsys):
    make_locale("English", strings={"translation_strings.json": {"a": "A", "b": "B"}})
    make_locale("French", strings={"translation_strings.json": {"a": "FR-A"}})
    rc = cli_app._cmd_diff("French", out=str(configured_app), with_diff=True)
    assert rc == 0
    assert "1 missing entries" in capsys.readouterr().out
    assert (configured_app / "French" / "missing_strings.md").is_file()
    assert (configured_app / "French" / "strings_diff.json").is_file()


def test_cmd_diff_rejects_unknown_locale(configured_app, make_locale, capsys):
    make_locale("English", strings={"translation_strings.json": {"a": "A"}})
    rc = cli_app._cmd_diff("Klingon", out=None)
    assert rc == 2
    assert "not found" in capsys.readouterr().err


def test_cmd_diff_rejects_source_as_target(configured_app, make_locale, capsys):
    make_locale("English", strings={"translation_strings.json": {"a": "A"}})
    rc = cli_app._cmd_diff("English", out=None)
    assert rc == 2
    assert "source locale" in capsys.readouterr().err


def test_ask_yes_no_accepts_french_oui(monkeypatch):
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: "oui")
    assert cli_app._ask_yes_no("Confirm?", default=False) is True


def test_ask_yes_no_falls_back_to_default(monkeypatch):
    monkeypatch.setattr(cli_app, "ask_text", lambda *a, **kw: "")
    assert cli_app._ask_yes_no("Confirm?", default=True) is True
    assert cli_app._ask_yes_no("Confirm?", default=False) is False


def test_as_list_wraps_scalar_and_passes_list_through():
    assert cli_app._as_list("French") == ["French"]
    assert cli_app._as_list(["A", "B"]) == ["A", "B"]
