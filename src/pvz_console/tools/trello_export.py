from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Sequence

from pvz_console.config import PROJECT_ROOT, SOURCE_LOCALE
from pvz_console.core.diff import missing_by_id
from pvz_console.core.models import AlmanacEntry, StringEntry, TrelloCard
from pvz_console.parsers.almanac import load_achievements, load_plants, load_zombies
from pvz_console.parsers.strings import (
    diff_abyss_buffs,
    diff_regexs,
    diff_strings,
    diff_tips_fs,
    diff_tips_iz,
    diff_travel_buffs,
)
from pvz_console.reporting.trello_csv import build_trello_readme, write_trello_csvs_by_list

NAME_MAX_LEN = 100
DESCRIPTION_MAX_LEN = 15000  # Trello hard limit is 16384; leave headroom.
DEFAULT_LABEL = "To be translated"

LIST_PLANTS = "Plants"
LIST_ZOMBIES = "Zombies"
LIST_ACHIEVEMENTS = "Achievements"
LIST_STRINGS = "Strings"
LIST_REGEX = "Regex"
LIST_TIPS_IZ = "Tips IZ"
LIST_TIPS_FS = "Tips FS"
LIST_ABYSS = "Abyss Buffs"
LIST_TRAVEL = "Travel Buffs"


@dataclass
class TrelloExportResult:
    locale: str
    output_dir: str
    csv_paths: Dict[str, str] = field(default_factory=dict)
    readme_path: str = ""
    counts_by_list: Dict[str, int] = field(default_factory=dict)

    @property
    def total_cards(self) -> int:
        return sum(self.counts_by_list.values())


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "\u2026"


def _fence(body: str) -> str:
    return "```json\n" + body + "\n```"


def _describe_almanac(entry: AlmanacEntry) -> str:
    """Wrap the raw dict (with braces) in a ```json fence \u2014 same shape as the
    source file. Trello renders the fence as a monospace code block with
    preserved line breaks, and \\n stays literal thanks to ``json.dumps``.
    """
    return _fence(json.dumps(entry.raw, ensure_ascii=False, indent=2))


def _describe_string(entry: StringEntry) -> str:
    """Render a flat key/value entry as a JSON member inside a ```json fence:
    ``"key": "value"``. Matches how each line would appear in the source
    ``.json`` file.
    """
    key = json.dumps(entry.key, ensure_ascii=False)
    value = json.dumps(entry.source if entry.source is not None else "", ensure_ascii=False)
    return _fence(f"{key}: {value}")


def _almanac_cards(entries: Sequence[AlmanacEntry], list_name: str, label: str) -> List[TrelloCard]:
    cards: List[TrelloCard] = []
    for entry in entries:
        name = entry.name or f"id {entry.id}"
        cards.append(TrelloCard(
            name=_truncate(name, NAME_MAX_LEN),
            description=_truncate(_describe_almanac(entry), DESCRIPTION_MAX_LEN),
            list_name=list_name,
            labels=label,
        ))
    return cards


def _string_cards(entries: Sequence[StringEntry], list_name: str, label: str) -> List[TrelloCard]:
    cards: List[TrelloCard] = []
    for entry in entries:
        cards.append(TrelloCard(
            name=_truncate(entry.key, NAME_MAX_LEN),
            description=_truncate(_describe_string(entry), DESCRIPTION_MAX_LEN),
            list_name=list_name,
            labels=label,
        ))
    return cards


def collect_cards(root: str, locale: str, label: str = DEFAULT_LABEL) -> List[TrelloCard]:
    cards: List[TrelloCard] = []

    cards += _almanac_cards(
        missing_by_id(load_plants(root, SOURCE_LOCALE), load_plants(root, locale)),
        LIST_PLANTS, label,
    )
    cards += _almanac_cards(
        missing_by_id(load_zombies(root, SOURCE_LOCALE), load_zombies(root, locale)),
        LIST_ZOMBIES, label,
    )
    cards += _almanac_cards(
        missing_by_id(load_achievements(root, SOURCE_LOCALE), load_achievements(root, locale)),
        LIST_ACHIEVEMENTS, label,
    )

    cards += _string_cards(diff_strings(root, SOURCE_LOCALE, locale), LIST_STRINGS, label)
    cards += _string_cards(diff_regexs(root, SOURCE_LOCALE, locale), LIST_REGEX, label)
    cards += _string_cards(diff_tips_iz(root, SOURCE_LOCALE, locale), LIST_TIPS_IZ, label)
    cards += _string_cards(diff_tips_fs(root, SOURCE_LOCALE, locale), LIST_TIPS_FS, label)
    cards += _string_cards(diff_abyss_buffs(root, SOURCE_LOCALE, locale), LIST_ABYSS, label)
    cards += _string_cards(diff_travel_buffs(root, SOURCE_LOCALE, locale), LIST_TRAVEL, label)

    return cards


def export_trello(
    locale: str,
    exports_root: os.PathLike | str,
    root: os.PathLike | str = PROJECT_ROOT,
    label: str = DEFAULT_LABEL,
) -> TrelloExportResult:
    root_str = str(root)
    out = Path(exports_root) / locale
    out.mkdir(parents=True, exist_ok=True)

    cards = collect_cards(root_str, locale, label=label)
    counts: Dict[str, int] = {}
    for card in cards:
        counts[card.list_name] = counts.get(card.list_name, 0) + 1

    csv_paths = write_trello_csvs_by_list(cards, str(out))
    readme_path = out / "trello_README.md"
    build_trello_readme(locale, csv_paths, label, str(readme_path))

    return TrelloExportResult(
        locale=locale,
        output_dir=str(out),
        csv_paths=csv_paths,
        readme_path=str(readme_path),
        counts_by_list=counts,
    )
