from __future__ import annotations

import json
from pathlib import Path

from pvz_console.core.models import Plant, StringEntry
from pvz_console.reporting.diff_json import (
    build_abyss_buffs_diff,
    build_achievements_diff,
    build_plants_diff,
    build_regexs_diff,
    build_strings_diff,
    build_tips_diff,
    build_travel_buffs_diff,
    build_zombies_diff,
)


def _read(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def test_strings_diff_writes_flat_key_value(tmp_path):
    entries = [
        StringEntry(key="a", source="A", target=None, status="missing"),
        StringEntry(key="b", source="B", target="", status="empty"),
    ]
    out = build_strings_diff(entries, "French", tmp_path)
    assert _read(out) == {"a": "A", "b": "B"}
    assert Path(out).name == "strings_diff.json"
    assert "French" in Path(out).parts


def test_strings_diff_returns_none_when_no_entries(tmp_path):
    assert build_strings_diff([], "French", tmp_path) is None
    assert not (tmp_path / "French").exists()


def test_strings_diff_writes_empty_string_for_none_source(tmp_path):
    entries = [StringEntry(key="a", source=None, target=None, status="missing")]
    out = build_strings_diff(entries, "French", tmp_path)
    assert _read(out) == {"a": ""}


def test_travel_buffs_diff_returns_none_when_empty(tmp_path):
    assert build_travel_buffs_diff([], "French", tmp_path) is None


def test_travel_buffs_diff_handles_key_without_category(tmp_path):
    """A key without ``:`` lands under an empty-string category."""
    entries = [StringEntry(key="orphan", source="V", target=None, status="missing")]
    out = build_travel_buffs_diff(entries, "French", tmp_path)
    assert _read(out) == {"": {"orphan": "V"}}


def test_travel_buffs_diff_restores_two_level_nesting(tmp_path):
    entries = [
        StringEntry(key="cat1:k1", source="V1", target=None, status="missing"),
        StringEntry(key="cat1:k2", source="V2", target=None, status="missing"),
        StringEntry(key="cat2:k1", source="V3", target=None, status="missing"),
    ]
    out = build_travel_buffs_diff(entries, "French", tmp_path)
    assert _read(out) == {"cat1": {"k1": "V1", "k2": "V2"}, "cat2": {"k1": "V3"}}


def test_plants_diff_wraps_in_root_key(tmp_path):
    plants = [Plant(id=1, name="Peashooter", raw={"seedType": 1, "name": "Peashooter"})]
    out = build_plants_diff(plants, "French", tmp_path)
    assert _read(out) == {"plants": [{"seedType": 1, "name": "Peashooter"}]}


def test_zombies_and_achievements_use_their_root_keys(tmp_path):
    z_out = build_zombies_diff(
        [Plant(id=1, name="Z", raw={"theZombieType": 1})], "French", tmp_path,
    )
    a_out = build_achievements_diff(
        [Plant(id=1, name="A", raw={"achievement": 1})], "French", tmp_path,
    )
    assert "zombies" in _read(z_out)
    assert "achievements" in _read(a_out)


def test_tips_diff_filename_uses_kind(tmp_path):
    entries = [StringEntry(key="K", source="V", target=None, status="missing")]
    out = build_tips_diff(entries, "French", tmp_path, kind="iz")
    assert Path(out).name == "tips_iz_diff.json"


def test_regexs_and_abyss_diff_filenames(tmp_path):
    entries = [StringEntry(key="K", source="V", target=None, status="missing")]
    assert Path(build_regexs_diff(entries, "French", tmp_path)).name == "regexs_diff.json"
    assert Path(build_abyss_buffs_diff(entries, "French", tmp_path)).name == "abyss_buffs_diff.json"
