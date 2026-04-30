from __future__ import annotations

from dataclasses import dataclass

from pvz_console.core.diff import missing_by_id


@dataclass
class _Entry:
    id: int


def test_missing_returns_only_entries_absent_from_target():
    src = [_Entry(1), _Entry(2), _Entry(3)]
    tgt = [_Entry(1), _Entry(3)]
    assert [e.id for e in missing_by_id(src, tgt)] == [2]


def test_missing_empty_when_target_covers_source():
    src = [_Entry(1), _Entry(2)]
    assert missing_by_id(src, src) == []


def test_missing_returns_all_when_target_empty():
    src = [_Entry(1), _Entry(2)]
    assert [e.id for e in missing_by_id(src, [])] == [1, 2]


def test_missing_preserves_source_order():
    src = [_Entry(3), _Entry(1), _Entry(2)]
    assert [e.id for e in missing_by_id(src, [_Entry(1)])] == [3, 2]
