from __future__ import annotations

import json
from pathlib import Path

import pytest

from pvz_console import config, settings as settings_module
from pvz_console.settings import AppSettings, load_settings, save_settings


@pytest.fixture
def isolated_settings(monkeypatch, tmp_path):
    """Redirect settings_path() to a temp file so tests don't touch the real one."""
    monkeypatch.setattr(config, "REPO_ROOT", tmp_path)
    return tmp_path / "settings.json"


def test_load_returns_defaults_when_file_missing(isolated_settings):
    s = load_settings()
    assert isinstance(s, AppSettings)
    assert s.source_locale == "English"
    assert s.project_root is None


def test_save_then_load_round_trips(isolated_settings):
    s = AppSettings(source_locale="French", color="cyan", show_emoji=False)
    save_settings(s)
    assert isolated_settings.is_file()
    loaded = load_settings()
    assert loaded.source_locale == "French"
    assert loaded.color == "cyan"
    assert loaded.show_emoji is False


def test_load_ignores_unknown_keys(isolated_settings):
    isolated_settings.write_text(
        json.dumps({"source_locale": "German", "bogus_field": "ignored"}),
        encoding="utf-8",
    )
    s = load_settings()
    assert s.source_locale == "German"


def test_load_returns_defaults_on_invalid_json(isolated_settings):
    isolated_settings.write_text("not json", encoding="utf-8")
    s = load_settings()
    assert s.source_locale == "English"


def test_resolved_project_root_uses_explicit_value(tmp_path):
    custom = tmp_path / "custom"
    custom.mkdir()
    s = AppSettings(project_root=str(custom))
    assert s.resolved_project_root() == custom.resolve()


def test_validate_project_root_flags_missing_localization(tmp_path):
    s = AppSettings(project_root=str(tmp_path))  # exists, but no Localization/
    err = s.validate_project_root()
    assert err is not None
    assert "Localization" in err


def test_validate_project_root_passes_when_complete(project_root):
    s = AppSettings(project_root=str(project_root))
    assert s.validate_project_root() is None


def test_validate_source_locale_for_locale_mode(project_root, make_locale):
    make_locale("French")
    s = AppSettings(project_root=str(project_root), source_locale="French")
    assert s.validate_source_locale() is None
    s.source_locale = "Klingon"
    err = s.validate_source_locale()
    assert err is not None and "Klingon" in err


def test_validate_source_locale_for_dumps_mode(project_root):
    s = AppSettings(project_root=str(project_root), source_locale="Dumps")
    assert s.uses_dumps_source()
    assert s.validate_source_locale() is None


def test_resolved_project_root_falls_back_to_default_when_unset(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "PROJECT_ROOT", tmp_path / "default")
    s = AppSettings(project_root=None)
    assert s.resolved_project_root() == tmp_path / "default"


def test_validate_project_root_flags_nonexistent_path(tmp_path):
    s = AppSettings(project_root=str(tmp_path / "does-not-exist"))
    err = s.validate_project_root()
    assert err is not None
    assert "does not exist" in err


def test_validate_source_locale_for_dumps_without_dumps_folder(tmp_path):
    # project_root exists with Localization/ but no Dumps/ folder
    (tmp_path / "Localization").mkdir()
    s = AppSettings(project_root=str(tmp_path), source_locale="Dumps")
    err = s.validate_source_locale()
    assert err is not None
    assert "Dumps" in err
