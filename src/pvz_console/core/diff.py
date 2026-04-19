from __future__ import annotations

from typing import Iterable, List, Protocol, TypeVar


class _HasId(Protocol):
    id: object


T = TypeVar("T", bound=_HasId)


def missing_by_id(source: Iterable[T], target: Iterable[T]) -> List[T]:
    """Entries from ``source`` whose ``id`` does not appear in ``target``."""
    target_ids = {item.id for item in target}
    return [item for item in source if item.id not in target_ids]
