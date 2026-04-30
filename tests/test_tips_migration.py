from __future__ import annotations

import json
from pathlib import Path

import pytest

from pvz_console.tools.tips_migration import migrate_tips


def _read(path: Path) -> dict:
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


@pytest.fixture
def project_with_dumps(project_root, make_dump):
    make_dump("tips_iz.json", {"TIP_KEY_A": "Chinese A", "TIP_KEY_B": "Chinese B"})
    make_dump("tips_fs.json", {"TIP_FS_1": "Chinese FS1"})
    return project_root


def test_creates_tips_files_when_translations_complete(project_with_dumps, make_locale):
    make_locale("French", strings={"translation_strings.json": {
        "Chinese A": "FR-A", "Chinese B": "FR-B", "Chinese FS1": "FR-FS1",
    }})

    result = migrate_tips(str(project_with_dumps), "French")

    assert sorted(result.migrated) == ["tips_fs.json", "tips_iz.json"]
    iz_path = project_with_dumps / "Localization" / "French" / "Strings" / "tips_iz.json"
    fs_path = project_with_dumps / "Localization" / "French" / "Strings" / "tips_fs.json"
    assert _read(iz_path) == {"TIP_KEY_A": "FR-A", "TIP_KEY_B": "FR-B"}
    assert _read(fs_path) == {"TIP_FS_1": "FR-FS1"}


def test_skips_when_translation_strings_is_missing(project_with_dumps, make_locale):
    make_locale("French")  # locale dir exists, no translation_strings.json
    result = migrate_tips(str(project_with_dumps), "French")
    assert result.skipped_empty_translation_strings is True
    assert result.migrated == []


def test_skips_when_some_source_strings_are_missing(project_with_dumps, make_locale):
    make_locale("French", strings={"translation_strings.json": {"Chinese A": "FR-A"}})
    # tips_iz needs both Chinese A and Chinese B → incomplete → skipped.
    result = migrate_tips(str(project_with_dumps), "French")
    assert "tips_iz.json" in result.skipped_incomplete
    assert result.skipped_incomplete["tips_iz.json"] == 1
    assert "tips_iz.json" not in result.migrated


def test_skips_existing_destination_files(project_with_dumps, make_locale):
    make_locale("French", strings={
        "translation_strings.json": {"Chinese A": "FR-A", "Chinese B": "FR-B", "Chinese FS1": "FR-FS1"},
        "tips_iz.json": {"TIP_KEY_A": "old"},
    })
    result = migrate_tips(str(project_with_dumps), "French")
    assert result.skipped_already_present == ["tips_iz.json"]
    assert result.migrated == ["tips_fs.json"]


def test_skips_when_dump_source_is_missing(project_root, make_locale):
    make_locale("French", strings={"translation_strings.json": {"x": "y"}})
    result = migrate_tips(str(project_root), "French")
    assert sorted(result.skipped_missing_source) == ["tips_fs.json", "tips_iz.json"]
    assert result.migrated == []


def test_did_anything_property_reflects_migrated_state():
    from pvz_console.tools.tips_migration import MigrationResult
    assert MigrationResult(locale="French").did_anything is False
    assert MigrationResult(locale="French", migrated=["x"]).did_anything is True
