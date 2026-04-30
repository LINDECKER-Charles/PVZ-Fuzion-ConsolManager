from __future__ import annotations

from pvz_console.parsers.strings import (
    _diff,
    _flatten_nested,
    diff_strings,
    diff_travel_buffs,
    strings_file_exists,
)


def test_flatten_nested_collapses_two_levels():
    assert _flatten_nested({"cat": {"a": "1", "b": "2"}}) == {"cat:a": "1", "cat:b": "2"}


def test_flatten_nested_skips_non_dict_top_level():
    assert _flatten_nested({"cat": {"a": "1"}, "stray": "scalar"}) == {"cat:a": "1"}


def test_flatten_nested_normalizes_non_string_leaves_to_empty():
    assert _flatten_nested({"cat": {"a": 42}}) == {"cat:a": ""}


def test_diff_reports_missing_keys():
    entries = _diff({"a": "A", "b": "B"}, {"a": "A"})
    assert [(e.key, e.status) for e in entries] == [("b", "missing")]


def test_diff_reports_empty_target_values():
    entries = _diff({"a": "A"}, {"a": ""})
    assert [(e.key, e.status, e.target) for e in entries] == [("a", "empty", "")]


def test_diff_skips_empty_when_source_is_also_empty():
    assert _diff({"a": ""}, {"a": ""}) == []


def test_diff_strings_via_filesystem(make_locale, project_root):
    make_locale("English", strings={"translation_strings.json": {"k1": "Hello", "k2": "Bye"}})
    make_locale("French", strings={"translation_strings.json": {"k1": "Salut"}})
    entries = diff_strings(str(project_root), "English", "French")
    assert [e.key for e in entries] == ["k2"]


def test_diff_travel_buffs_unflattens_via_category(make_locale, project_root):
    make_locale("English", strings={"travel_buffs.json": {
        "catA": {"k1": "A1", "k2": "A2"},
        "catB": {"k1": "B1"},
    }})
    make_locale("French", strings={"travel_buffs.json": {"catA": {"k1": "FR-A1"}}})
    entries = diff_travel_buffs(str(project_root), "English", "French")
    keys = sorted(e.key for e in entries)
    assert keys == ["catA:k2", "catB:k1"]


def test_strings_file_exists(make_locale, project_root):
    make_locale("French", strings={"translation_strings.json": {"k": "v"}})
    assert strings_file_exists(str(project_root), "French", "translation_strings.json")
    assert not strings_file_exists(str(project_root), "French", "tips_iz.json")
