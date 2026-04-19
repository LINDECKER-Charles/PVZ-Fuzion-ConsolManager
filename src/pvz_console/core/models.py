from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass(slots=True)
class AlmanacEntry:
    """Common shape for almanac entities (plants, zombies, achievements).

    ``raw`` holds the untouched dict from the translation file, so we can dump
    it verbatim in reports and exports.
    """

    id: Any
    name: Optional[str]
    raw: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class Plant(AlmanacEntry):
    pass


@dataclass(slots=True)
class Zombie(AlmanacEntry):
    pass


@dataclass(slots=True)
class Achievement(AlmanacEntry):
    pass


@dataclass(slots=True)
class StringEntry:
    """A translation discrepancy in a flat key/value string file."""

    key: str
    source: Optional[str]
    target: Optional[str]
    status: str  # "missing" | "empty"


@dataclass(slots=True)
class TrelloCard:
    name: str
    description: str
    list_name: str
    labels: str = "To be translated"
