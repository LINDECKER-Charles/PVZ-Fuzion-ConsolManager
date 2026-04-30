from __future__ import annotations

import json
import os
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Sequence, Tuple

from pvz_console.parsers.loaders import load_json, strings_dir
from pvz_console.parsers.strings import (
    ABYSS_BUFFS_FILE,
    REGEXS_FILE,
    STRINGS_FILE,
    TIPS_FS_FILE,
    TIPS_IZ_FILE,
    TRAVEL_BUFFS_FILE,
)

LAYOUT_FLAT = "flat"
LAYOUT_NESTED = "nested"

# (filename, layout) pairs scanned for each locale.
SCAN_TARGETS: Sequence[Tuple[str, str]] = (
    (STRINGS_FILE, LAYOUT_FLAT),
    (REGEXS_FILE, LAYOUT_FLAT),
    (TIPS_IZ_FILE, LAYOUT_FLAT),
    (TIPS_FS_FILE, LAYOUT_FLAT),
    (ABYSS_BUFFS_FILE, LAYOUT_FLAT),
    (TRAVEL_BUFFS_FILE, LAYOUT_NESTED),
)


@dataclass
class FileDuplicates:
    filename: str
    duplicate_keys: List[Tuple[str, int]] = field(default_factory=list)
    duplicate_values: List[Tuple[str, List[str]]] = field(default_factory=list)
    missing: bool = False

    @property
    def has_any(self) -> bool:
        return bool(self.duplicate_keys or self.duplicate_values)


@dataclass
class LocaleDuplicates:
    locale: str
    files: List[FileDuplicates] = field(default_factory=list)

    @property
    def total_duplicate_keys(self) -> int:
        return sum(len(f.duplicate_keys) for f in self.files)

    @property
    def total_duplicate_values(self) -> int:
        return sum(len(f.duplicate_values) for f in self.files)

    @property
    def has_any(self) -> bool:
        return any(f.has_any for f in self.files)


def _detect_raw_duplicate_keys(path: str) -> Dict[str, int]:
    """Surface JSON keys that are repeated in the raw text.

    ``json.load`` silently keeps the last value when a key is duplicated, so
    we route every object through ``object_pairs_hook`` to count occurrences.
    The hook runs once per JSON object: nested objects produce their own keys,
    so we record duplicates per object scope and keep the highest count seen
    for any given key string.
    """
    counts: Dict[str, int] = {}

    def _hook(pairs):
        local: Dict[str, int] = {}
        for k, _ in pairs:
            local[k] = local.get(k, 0) + 1
        for k, c in local.items():
            if c > 1:
                counts[k] = max(counts.get(k, 0), c)
        return dict(pairs)

    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            json.load(f, object_pairs_hook=_hook)
    except FileNotFoundError:
        return {}
    except Exception:
        return counts
    return counts


def _detect_value_duplicates(data: Dict[str, str]) -> List[Tuple[str, List[str]]]:
    grouped: Dict[str, List[str]] = defaultdict(list)
    for key, value in data.items():
        if not isinstance(value, str) or not value.strip():
            continue
        grouped[value].append(key)
    return sorted(
        ((value, keys) for value, keys in grouped.items() if len(keys) > 1),
        key=lambda pair: (-len(pair[1]), pair[0]),
    )


def _flatten_nested(data: Dict[str, Any]) -> Dict[str, str]:
    flat: Dict[str, str] = {}
    for category, entries in data.items():
        if not isinstance(entries, dict):
            continue
        for key, value in entries.items():
            flat[f"{category}:{key}"] = value if isinstance(value, str) else ""
    return flat


def _scan_file(path: str, layout: str) -> FileDuplicates:
    fd = FileDuplicates(filename=os.path.basename(path))
    if not os.path.exists(path):
        fd.missing = True
        return fd

    raw_dupes = _detect_raw_duplicate_keys(path)

    data = load_json(path)
    if not isinstance(data, dict):
        fd.duplicate_keys = sorted(raw_dupes.items(), key=lambda kv: (-kv[1], kv[0]))
        return fd

    flat = _flatten_nested(data) if layout == LAYOUT_NESTED else {
        k: (v if isinstance(v, str) else "") for k, v in data.items()
    }

    fd.duplicate_keys = sorted(raw_dupes.items(), key=lambda kv: (-kv[1], kv[0]))
    fd.duplicate_values = _detect_value_duplicates(flat)
    return fd


def check_locale_duplicates(root: str, locale: str) -> LocaleDuplicates:
    result = LocaleDuplicates(locale=locale)
    base = strings_dir(root, locale)
    for filename, layout in SCAN_TARGETS:
        result.files.append(_scan_file(os.path.join(base, filename), layout))
    return result
