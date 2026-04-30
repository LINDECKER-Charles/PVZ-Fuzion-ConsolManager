from __future__ import annotations

from pathlib import Path

from pvz_console.parsers.loaders import (
    DUMPS_SOURCE,
    is_dumps_source,
    list_localizations,
    load_json,
    source_has_file,
    source_strings_path,
    strings_dir,
)


def test_load_json_returns_empty_dict_when_missing():
    assert load_json("/no/file/here.json") == {}


def test_load_json_reads_utf8_sig(tmp_path):
    p = tmp_path / "x.json"
    p.write_text('﻿{"a": "b"}', encoding="utf-8")
    assert load_json(str(p)) == {"a": "b"}


def test_load_json_returns_empty_dict_on_invalid(tmp_path, capsys):
    p = tmp_path / "x.json"
    p.write_text("not json", encoding="utf-8")
    assert load_json(str(p)) == {}
    # The loader prints a diagnostic; we don't assert its exact wording.
    assert "Error reading" in capsys.readouterr().out


def test_list_localizations_only_returns_directories(project_root, make_locale):
    make_locale("French")
    make_locale("German")
    (project_root / "Localization" / "stray.txt").write_text("ignore me", encoding="utf-8")
    assert list_localizations(str(project_root)) == ["French", "German"]


def test_strings_dir_path(project_root):
    p = Path(strings_dir(str(project_root), "French"))
    assert p == project_root / "Localization" / "French" / "Strings"


def test_is_dumps_source():
    assert is_dumps_source(DUMPS_SOURCE)
    assert not is_dumps_source("English")


def test_source_strings_path_resolves_locale_vs_dumps(project_root):
    locale_path = source_strings_path(str(project_root), "English", "translation_strings.json")
    assert locale_path.endswith(str(Path("Localization/English/Strings/translation_strings.json")))
    # translation_strings has no Dumps equivalent — falls back to a non-existent path.
    dumps_path = source_strings_path(str(project_root), DUMPS_SOURCE, "translation_strings.json")
    assert dumps_path.endswith(str(Path("Dumps/translation_strings.json")))


def test_source_has_file_false_when_no_dumps_equivalent(project_root):
    # translation_strings.json maps to None in the Dumps mapping → never present.
    assert not source_has_file(str(project_root), DUMPS_SOURCE, "strings", "translation_strings.json")


def test_source_has_file_true_for_existing_locale_file(project_root, make_locale):
    make_locale("English", strings={"translation_strings.json": {"a": "b"}})
    assert source_has_file(str(project_root), "English", "strings", "translation_strings.json")


def test_source_almanac_path_locale_mode(project_root):
    from pvz_console.parsers.loaders import source_almanac_path
    p = source_almanac_path(str(project_root), "English", "LawnStringsTranslate.json")
    assert p.endswith(str(Path("Localization/English/Almanac/LawnStringsTranslate.json")))


def test_source_has_file_for_dumps_mapped_almanac(project_root):
    """`LawnStringsTranslate.json` maps to `LawnStrings.json` in Dumps/."""
    (project_root / "Dumps" / "LawnStrings.json").write_text("{}", encoding="utf-8")
    assert source_has_file(str(project_root), DUMPS_SOURCE, "almanac", "LawnStringsTranslate.json")
