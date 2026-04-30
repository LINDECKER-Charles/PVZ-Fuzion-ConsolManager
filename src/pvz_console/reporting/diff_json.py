from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional, Sequence

from pvz_console.core.models import AlmanacEntry, StringEntry


def _locale_dir(reports_root: os.PathLike | str, localization: str) -> str:
    path = os.path.join(str(reports_root), localization)
    os.makedirs(path, exist_ok=True)
    return path


def _write_json(out_path: str, data: Any) -> str:
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\u2705 Diff generated: {out_path}")
    return out_path


# ---------- almanac diffs (plants, zombies, achievements) ---------------------

def _build_almanac_diff(
    entries: Sequence[AlmanacEntry],
    localization: str,
    reports_root: os.PathLike | str,
    root_key: str,
    filename: str,
) -> Optional[str]:
    """Mirror the source file shape so the JSON can be merged back in directly:
    ``{"plants"|"zombies"|"achievements": [missing_entry.raw, ...]}``.
    """
    if not entries:
        return None
    out_path = os.path.join(_locale_dir(reports_root, localization), filename)
    return _write_json(out_path, {root_key: [entry.raw for entry in entries]})


def build_plants_diff(plants, localization, reports_root):
    return _build_almanac_diff(plants, localization, reports_root, "plants", "plants_diff.json")


def build_zombies_diff(zombies, localization, reports_root):
    return _build_almanac_diff(zombies, localization, reports_root, "zombies", "zombies_diff.json")


def build_achievements_diff(achievements, localization, reports_root):
    return _build_almanac_diff(
        achievements, localization, reports_root, "achievements", "achievements_diff.json"
    )


# ---------- flat key/value diffs ----------------------------------------------

def _build_flat_diff(
    entries: Sequence[StringEntry],
    localization: str,
    reports_root: os.PathLike | str,
    filename: str,
) -> Optional[str]:
    """Flat ``{key: source_value}`` mirroring translation_strings et al."""
    if not entries:
        return None
    out_path = os.path.join(_locale_dir(reports_root, localization), filename)
    data: Dict[str, str] = {e.key: (e.source if e.source is not None else "") for e in entries}
    return _write_json(out_path, data)


def build_strings_diff(entries, localization, reports_root):
    return _build_flat_diff(entries, localization, reports_root, "strings_diff.json")


def build_regexs_diff(entries, localization, reports_root):
    return _build_flat_diff(entries, localization, reports_root, "regexs_diff.json")


def build_tips_diff(entries, localization, reports_root, kind: str):
    return _build_flat_diff(entries, localization, reports_root, f"tips_{kind}_diff.json")


def build_abyss_buffs_diff(entries, localization, reports_root):
    return _build_flat_diff(entries, localization, reports_root, "abyss_buffs_diff.json")


# ---------- nested diff (travel buffs) ----------------------------------------

def build_travel_buffs_diff(
    entries: Sequence[StringEntry],
    localization: str,
    reports_root: os.PathLike | str,
) -> Optional[str]:
    """Restore the nested ``{category: {key: source_value}}`` shape.

    ``parsers.strings._flatten_nested`` collapses keys to ``category:key``;
    we split on the first ``:`` to rebuild the original two-level dict.
    """
    if not entries:
        return None
    out_path = os.path.join(_locale_dir(reports_root, localization), "travel_buffs_diff.json")
    data: Dict[str, Dict[str, str]] = {}
    for e in entries:
        category, sep, key = e.key.partition(":")
        if not sep:
            category, key = "", e.key
        data.setdefault(category, {})[key] = e.source if e.source is not None else ""
    return _write_json(out_path, data)
