from __future__ import annotations

from pvz_console.tools.duplicate_checker import (
    _detect_raw_duplicate_keys,
    _detect_value_duplicates,
    _flatten_nested,
    check_locale_duplicates,
)


def test_value_duplicates_groups_keys_sharing_a_value():
    assert _detect_value_duplicates({"a": "X", "b": "X", "c": "Y"}) == [("X", ["a", "b"])]


def test_value_duplicates_ignores_empty_and_blank_values():
    assert _detect_value_duplicates({"a": "", "b": "   ", "c": "Hi"}) == []


def test_value_duplicates_ordered_by_group_size_desc():
    out = _detect_value_duplicates({
        "a": "X", "b": "X", "c": "X",  # three Xs
        "d": "Y", "e": "Y",            # two Ys
        "f": "Z",                      # alone
    })
    assert [v for v, _ in out] == ["X", "Y"]
    assert out[0][1] == ["a", "b", "c"]


def test_raw_duplicate_keys_finds_repeated_top_level_keys(tmp_path):
    p = tmp_path / "dup.json"
    p.write_text('{"a": 1, "b": 2, "a": 3}', encoding="utf-8")
    assert _detect_raw_duplicate_keys(str(p)) == {"a": 2}


def test_raw_duplicate_keys_handles_missing_file():
    assert _detect_raw_duplicate_keys("/no/such/path.json") == {}


def test_raw_duplicate_keys_returns_empty_when_clean(tmp_path):
    p = tmp_path / "clean.json"
    p.write_text('{"a": 1, "b": 2}', encoding="utf-8")
    assert _detect_raw_duplicate_keys(str(p)) == {}


def test_flatten_nested_collapses_two_levels():
    assert _flatten_nested({"cat": {"a": "1", "b": "2"}}) == {"cat:a": "1", "cat:b": "2"}


def test_check_locale_reports_per_file_for_flat_and_nested(make_locale, project_root):
    make_locale("French", strings={
        "translation_strings.json": {"a": "Hi", "b": "Hi", "c": "Bye"},
        "travel_buffs.json": {"cat1": {"k1": "V", "k2": "V"}},
    })
    result = check_locale_duplicates(str(project_root), "French")
    by_name = {f.filename: f for f in result.files}
    assert by_name["translation_strings.json"].duplicate_values == [("Hi", ["a", "b"])]
    assert by_name["travel_buffs.json"].duplicate_values == [("V", ["cat1:k1", "cat1:k2"])]
    assert result.has_any
    assert result.total_duplicate_values == 2


def test_check_locale_clean_when_no_duplicates(make_locale, project_root):
    make_locale("French", strings={"translation_strings.json": {"a": "1", "b": "2"}})
    result = check_locale_duplicates(str(project_root), "French")
    assert not result.has_any
    assert result.total_duplicate_keys == 0
    assert result.total_duplicate_values == 0


def test_raw_duplicate_keys_swallows_decode_errors(tmp_path):
    """Malformed JSON: the function returns a dict instead of propagating the error."""
    p = tmp_path / "broken.json"
    p.write_text("{not json", encoding="utf-8")
    assert _detect_raw_duplicate_keys(str(p)) == {}


def test_flatten_nested_skips_non_dict_top_level_in_duplicate_checker():
    assert _flatten_nested({"cat": {"a": "1"}, "stray": "scalar"}) == {"cat:a": "1"}


def test_scan_file_handles_top_level_list(make_locale, project_root, tmp_path):
    """When a file's top level isn't a JSON object, value-duplicate detection is skipped."""
    from pvz_console.tools.duplicate_checker import _scan_file, LAYOUT_FLAT
    p = tmp_path / "list.json"
    p.write_text("[1, 2, 3]", encoding="utf-8")
    fd = _scan_file(str(p), LAYOUT_FLAT)
    assert fd.duplicate_values == []
    assert fd.duplicate_keys == []
    assert fd.missing is False
