from __future__ import annotations

import json
from pathlib import Path

from pvz_console.core.models import StringEntry
from pvz_console.parsers.almanac import PLANTS_FILE
from pvz_console.tools.trello_export import (
    DESCRIPTION_MAX_LEN,
    NAME_MAX_LEN,
    LIST_PLANTS,
    LIST_STRINGS,
    _almanac_cards,
    _describe_almanac,
    _describe_string,
    _string_cards,
    _truncate,
    collect_cards,
    export_trello,
)


def test_truncate_appends_ellipsis_when_over_limit():
    assert _truncate("hello", 5) == "hello"
    assert _truncate("hello world", 6).endswith("…")
    assert len(_truncate("hello world", 6)) <= 6


def test_describe_string_wraps_in_json_fence():
    e = StringEntry(key="my_key", source="Hi there", target=None, status="missing")
    body = _describe_string(e)
    assert body.startswith("```json")
    assert body.endswith("```")
    assert '"my_key"' in body


def test_describe_almanac_renders_raw_dict():
    from pvz_console.core.models import Plant
    body = _describe_almanac(Plant(id=1, name="P", raw={"seedType": 1}))
    assert '"seedType": 1' in body


def test_string_cards_truncate_overlong_keys():
    e = StringEntry(key="x" * (NAME_MAX_LEN + 50), source="Hi", target=None, status="missing")
    cards = _string_cards([e], LIST_STRINGS, "lbl")
    assert len(cards) == 1
    assert len(cards[0].name) <= NAME_MAX_LEN
    assert len(cards[0].description) <= DESCRIPTION_MAX_LEN


def test_almanac_cards_fall_back_to_id_when_name_missing():
    from pvz_console.core.models import Plant
    cards = _almanac_cards([Plant(id=42, name=None, raw={"seedType": 42})], LIST_PLANTS, "lbl")
    assert cards[0].name == "id 42"


def test_collect_cards_combines_almanac_and_strings(make_locale, project_root):
    make_locale("English", almanac={PLANTS_FILE: {"plants": [
        {"seedType": 1, "name": "Peashooter"},
    ]}}, strings={"translation_strings.json": {"k1": "Hello"}})
    make_locale("French")  # nothing translated yet
    cards = collect_cards(str(project_root), "French", label="lbl", source="English")
    assert any(c.list_name == LIST_PLANTS for c in cards)
    assert any(c.list_name == LIST_STRINGS for c in cards)


def test_export_trello_writes_csvs_and_readme(make_locale, project_root, tmp_path):
    make_locale("English", strings={"translation_strings.json": {"k1": "Hello"}})
    make_locale("French")
    out = export_trello("French", tmp_path, root=str(project_root), label="lbl", source="English")
    assert Path(out.readme_path).is_file()
    assert out.total_cards >= 1
    assert out.csv_paths
    # Sanity-check one of the CSVs exists.
    for path in out.csv_paths.values():
        assert Path(path).is_file()


def test_export_trello_handles_fully_translated_locale(make_locale, project_root, tmp_path):
    make_locale("English", strings={"translation_strings.json": {"k": "v"}})
    make_locale("French", strings={"translation_strings.json": {"k": "v-fr"}})
    out = export_trello("French", tmp_path, root=str(project_root), label="lbl", source="English")
    assert out.total_cards == 0
    assert out.csv_paths == {}
    assert Path(out.readme_path).is_file()
