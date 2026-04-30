from __future__ import annotations

from pathlib import Path

from pvz_console.core.models import Plant, StringEntry
from pvz_console.reporting.markdown import (
    build_abyss_buffs_report,
    build_achievement_report,
    build_duplicates_report,
    build_plant_report,
    build_regexs_report,
    build_strings_report,
    build_tips_report,
    build_travel_buffs_report,
    build_zombie_report,
)
from pvz_console.tools.duplicate_checker import (
    FileDuplicates,
    LocaleDuplicates,
)


def test_plant_report_includes_id_and_raw_block(tmp_path):
    plant = Plant(id=1, name="Peashooter", raw={"seedType": 1, "name": "Peashooter"})
    build_plant_report([plant], "French", tmp_path)
    body = (tmp_path / "French" / "missing_plants.md").read_text(encoding="utf-8")
    assert "Peashooter" in body
    assert "id `1`" in body
    assert "```json" in body


def test_almanac_reports_skip_when_empty(tmp_path):
    build_plant_report([], "French", tmp_path)
    build_zombie_report([], "French", tmp_path)
    build_achievement_report([], "French", tmp_path)
    assert not (tmp_path / "French").exists()


def test_strings_report_separates_missing_and_empty(tmp_path):
    entries = [
        StringEntry(key="a", source="A", target=None, status="missing"),
        StringEntry(key="b", source="B", target="", status="empty"),
    ]
    build_strings_report(entries, "French", tmp_path)
    body = (tmp_path / "French" / "missing_strings.md").read_text(encoding="utf-8")
    assert "Missing Keys" in body
    assert "Empty Values" in body


def test_tips_report_filename_uses_kind(tmp_path):
    entries = [StringEntry(key="K", source="V", target=None, status="missing")]
    build_tips_report(entries, "French", tmp_path, kind="iz")
    assert (tmp_path / "French" / "missing_tips_iz.md").exists()


def test_regex_abyss_travel_reports_create_their_files(tmp_path):
    entries = [StringEntry(key="K", source="V", target=None, status="missing")]
    build_regexs_report(entries, "French", tmp_path)
    build_abyss_buffs_report(entries, "French", tmp_path)
    build_travel_buffs_report(entries, "French", tmp_path)
    assert (tmp_path / "French" / "missing_regexs.md").exists()
    assert (tmp_path / "French" / "missing_abyss_buffs.md").exists()
    assert (tmp_path / "French" / "missing_travel_buffs.md").exists()


def test_duplicates_report_skipped_when_clean(tmp_path):
    result = LocaleDuplicates(locale="French", files=[FileDuplicates(filename="x.json")])
    assert build_duplicates_report(result, tmp_path) is None


def test_duplicates_report_renders_per_file_sections(tmp_path):
    fd = FileDuplicates(
        filename="translation_strings.json",
        duplicate_keys=[("foo", 2)],
        duplicate_values=[("Hi", ["a", "b"])],
    )
    result = LocaleDuplicates(locale="French", files=[fd])
    out = build_duplicates_report(result, tmp_path)
    body = Path(out).read_text(encoding="utf-8")
    assert "translation_strings.json" in body
    assert "Duplicate keys" in body
    assert "Repeated values" in body
    assert "`a`" in body and "`b`" in body


def test_duplicates_report_keys_only_omits_values_section(tmp_path):
    """The keys table header is unique to the keys section."""
    fd = FileDuplicates(filename="x.json", duplicate_keys=[("foo", 2)])
    result = LocaleDuplicates(locale="French", files=[fd])
    body = Path(build_duplicates_report(result, tmp_path)).read_text(encoding="utf-8")
    assert "| Key | Occurrences |" in body
    assert "Keys sharing it" not in body


def test_duplicates_report_values_only_omits_keys_section(tmp_path):
    """The values table header is unique to the values section."""
    fd = FileDuplicates(filename="x.json", duplicate_values=[("Hi", ["a", "b"])])
    result = LocaleDuplicates(locale="French", files=[fd])
    body = Path(build_duplicates_report(result, tmp_path)).read_text(encoding="utf-8")
    assert "Keys sharing it" in body
    assert "| Key | Occurrences |" not in body


def test_duplicates_report_skips_files_with_no_duplicates(tmp_path):
    """A file without duplicates is silently skipped even when its sibling has any."""
    clean = FileDuplicates(filename="clean.json")
    dirty = FileDuplicates(filename="dirty.json", duplicate_keys=[("foo", 2)])
    result = LocaleDuplicates(locale="French", files=[clean, dirty])
    body = Path(build_duplicates_report(result, tmp_path)).read_text(encoding="utf-8")
    assert "clean.json" not in body
    assert "dirty.json" in body


def test_md_cell_returns_empty_for_none():
    from pvz_console.reporting.markdown import _md_cell
    assert _md_cell(None) == ""
    assert _md_cell("a|b\nc\rd") == "a\\|b ⏎ cd"


def test_strings_report_with_only_empty_entries(tmp_path):
    """Branches when there are empty values but no missing keys."""
    entries = [StringEntry(key="a", source="A", target="", status="empty")]
    from pvz_console.reporting.markdown import build_strings_report
    build_strings_report(entries, "French", tmp_path)
    body = (tmp_path / "French" / "missing_strings.md").read_text(encoding="utf-8")
    assert "Missing Keys" not in body
    assert "Empty Values" in body


def test_strings_report_with_only_missing_entries(tmp_path):
    entries = [StringEntry(key="a", source="A", target=None, status="missing")]
    from pvz_console.reporting.markdown import build_strings_report
    build_strings_report(entries, "French", tmp_path)
    body = (tmp_path / "French" / "missing_strings.md").read_text(encoding="utf-8")
    assert "Missing Keys" in body
    assert "Empty Values" not in body
