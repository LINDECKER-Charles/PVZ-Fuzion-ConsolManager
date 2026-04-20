from __future__ import annotations

import os
from typing import Any, Dict, List

from pvz_console.core.models import StringEntry
from pvz_console.parsers.loaders import (
    load_json,
    source_strings_path,
    strings_dir,
)

STRINGS_FILE = "translation_strings.json"
REGEXS_FILE = "translation_regexs.json"
TIPS_IZ_FILE = "tips_iz.json"
TIPS_FS_FILE = "tips_fs.json"
ABYSS_BUFFS_FILE = "abyss_buffs.json"
TRAVEL_BUFFS_FILE = "travel_buffs.json"


def _load_flat(path: str) -> Dict[str, str]:
    data = load_json(path)
    return data if isinstance(data, dict) else {}


def _flatten_nested(data: Dict[str, Any]) -> Dict[str, str]:
    """Flatten ``{category: {id: value}}`` to ``{category:id: value}``.

    Top-level entries whose value isn't a dict are skipped — the game's
    ``travel_buffs.json`` is strictly two levels deep.
    """
    flat: Dict[str, str] = {}
    for category, entries in data.items():
        if not isinstance(entries, dict):
            continue
        for key, value in entries.items():
            flat[f"{category}:{key}"] = value if isinstance(value, str) else ""
    return flat


def _diff(source: Dict[str, str], target: Dict[str, str]) -> List[StringEntry]:
    """Keys present in ``source`` that are missing or empty in ``target``."""
    entries: List[StringEntry] = []
    for key, src_value in source.items():
        if key not in target:
            entries.append(StringEntry(key=key, source=src_value, target=None, status="missing"))
            continue
        tgt_value = target[key]
        if not tgt_value and src_value:
            entries.append(StringEntry(key=key, source=src_value, target="", status="empty"))
    return entries


def diff_file(root: str, source_locale: str, target_locale: str, filename: str) -> List[StringEntry]:
    src = _load_flat(source_strings_path(root, source_locale, filename))
    tgt = _load_flat(os.path.join(strings_dir(root, target_locale), filename))
    return _diff(src, tgt)


def diff_nested_file(root: str, source_locale: str, target_locale: str, filename: str) -> List[StringEntry]:
    src_raw = load_json(source_strings_path(root, source_locale, filename)) or {}
    tgt_raw = load_json(os.path.join(strings_dir(root, target_locale), filename)) or {}
    return _diff(_flatten_nested(src_raw), _flatten_nested(tgt_raw))


def diff_strings(root: str, source_locale: str, target_locale: str) -> List[StringEntry]:
    return diff_file(root, source_locale, target_locale, STRINGS_FILE)


def diff_regexs(root: str, source_locale: str, target_locale: str) -> List[StringEntry]:
    return diff_file(root, source_locale, target_locale, REGEXS_FILE)


def diff_tips_iz(root: str, source_locale: str, target_locale: str) -> List[StringEntry]:
    return diff_file(root, source_locale, target_locale, TIPS_IZ_FILE)


def diff_tips_fs(root: str, source_locale: str, target_locale: str) -> List[StringEntry]:
    return diff_file(root, source_locale, target_locale, TIPS_FS_FILE)


def diff_abyss_buffs(root: str, source_locale: str, target_locale: str) -> List[StringEntry]:
    return diff_file(root, source_locale, target_locale, ABYSS_BUFFS_FILE)


def diff_travel_buffs(root: str, source_locale: str, target_locale: str) -> List[StringEntry]:
    return diff_nested_file(root, source_locale, target_locale, TRAVEL_BUFFS_FILE)


def strings_file_exists(root: str, locale: str, filename: str) -> bool:
    return os.path.exists(os.path.join(strings_dir(root, locale), filename))
