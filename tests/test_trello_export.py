from __future__ import annotations

import csv
from pathlib import Path

from pvz_console.core.models import TrelloCard
from pvz_console.reporting.trello_csv import (
    build_trello_csv,
    build_trello_readme,
    write_trello_csvs_by_list,
)


def _read_rows(path: str) -> list[list[str]]:
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.reader(f))


def test_csv_includes_header_and_quoted_rows(tmp_path):
    cards = [
        TrelloCard(name="Hi", description="Hello", list_name="Strings", labels="todo"),
        TrelloCard(name='Quote "x"', description="Body", list_name="Strings", labels="todo"),
    ]
    out = build_trello_csv(cards, str(tmp_path / "out.csv"))
    rows = _read_rows(out)
    assert rows[0] == ["Name", "Description", "Labels", "List"]
    assert rows[1] == ["Hi", "Hello", "todo", "Strings"]
    assert rows[2] == ['Quote "x"', "Body", "todo", "Strings"]


def test_write_by_list_groups_cards_per_file(tmp_path):
    cards = [
        TrelloCard(name="P", description="d", list_name="Plants", labels="x"),
        TrelloCard(name="Z", description="d", list_name="Zombies", labels="x"),
        TrelloCard(name="P2", description="d", list_name="Plants", labels="x"),
    ]
    paths = write_trello_csvs_by_list(cards, str(tmp_path))
    assert set(paths) == {"Plants", "Zombies"}
    assert len(_read_rows(paths["Plants"])) == 3   # header + 2 rows
    assert len(_read_rows(paths["Zombies"])) == 2  # header + 1 row


def test_write_by_list_returns_empty_for_no_cards(tmp_path):
    assert write_trello_csvs_by_list([], str(tmp_path)) == {}


def test_readme_lists_csvs_in_stats_when_present(tmp_path):
    cards = [TrelloCard(name="P", description="d", list_name="Plants", labels="x")]
    paths = write_trello_csvs_by_list(cards, str(tmp_path))
    readme_path = tmp_path / "README.md"
    build_trello_readme("French", paths, "to-translate", str(readme_path))
    body = readme_path.read_text(encoding="utf-8")
    assert "Plants" in body
    assert "to-translate" in body
    assert "French" in body


def test_readme_explains_empty_export_when_no_cards(tmp_path):
    readme_path = tmp_path / "README.md"
    build_trello_readme("French", {}, "to-translate", str(readme_path))
    body = readme_path.read_text(encoding="utf-8")
    assert "Nothing to import" in body
