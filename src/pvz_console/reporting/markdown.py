from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Optional, Sequence

from pvz_console.core.models import Achievement, AlmanacEntry, Plant, StringEntry, Zombie
from pvz_console.tools.duplicate_checker import LocaleDuplicates


@dataclass(frozen=True)
class _AlmanacSpec:
    header_emoji: str
    title: str
    entry_emoji: str
    filename: str


_PLANT_SPEC = _AlmanacSpec("\U0001f331", "Missing Plant Translations", "\U0001fab4", "missing_plants.md")
_ZOMBIE_SPEC = _AlmanacSpec("\U0001f9df", "Missing Zombie Translations", "\U0001f9e0", "missing_zombies.md")
_ACHIEVEMENT_SPEC = _AlmanacSpec("\U0001f3c6", "Missing Achievement Translations", "\U0001f947", "missing_achievements.md")


def _locale_dir(reports_root: os.PathLike | str, localization: str) -> str:
    path = os.path.join(str(reports_root), localization)
    os.makedirs(path, exist_ok=True)
    return path


def _write_almanac(
    spec: _AlmanacSpec,
    entries: Sequence[AlmanacEntry],
    localization: str,
    reports_root: os.PathLike | str,
) -> None:
    if not entries:
        return
    out_path = os.path.join(_locale_dir(reports_root, localization), spec.filename)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"# {spec.header_emoji} {spec.title}\n\n")
        f.write(f"> **Localization:** `{localization.upper()}`  \n")
        f.write(f"> **Total missing entries:** `{len(entries)}`  \n")
        f.write("> **Generated automatically by PVZ Fuzion Console Manager** \U0001f9e9\n\n")
        f.write("---\n\n")
        f.write("## \U0001f4d1 Summary\n\n")
        f.write(f"There are **{len(entries)}** entries missing in the `{localization.upper()}` translation.\n\n")
        f.write("Each entry below is printed as it appears in the source translation file \u2014 "
                "copy the block, translate the values, and paste it into the locale file.\n\n")
        f.write("---\n\n")
        f.write("## \U0001f480 Missing Entries\n\n")

        for entry in entries:
            name = entry.name or "Name missing"
            f.write(f"### {spec.entry_emoji} `{name}` \u2014 id `{entry.id}`\n\n")
            f.write("```json\n")
            f.write(json.dumps(entry.raw, ensure_ascii=False, indent=2))
            f.write("\n```\n\n---\n\n")

    print(f"\u2705 Report generated: {out_path}")


def build_plant_report(plants: Sequence[Plant], localization: str, reports_root: os.PathLike | str) -> None:
    _write_almanac(_PLANT_SPEC, plants, localization, reports_root)


def build_zombie_report(zombies: Sequence[Zombie], localization: str, reports_root: os.PathLike | str) -> None:
    _write_almanac(_ZOMBIE_SPEC, zombies, localization, reports_root)


def build_achievement_report(achievements: Sequence[Achievement], localization: str, reports_root: os.PathLike | str) -> None:
    _write_almanac(_ACHIEVEMENT_SPEC, achievements, localization, reports_root)


# ---------- flat key/value reports (strings, regex, tips, buffs) --------------

def _md_cell(text: Optional[str]) -> str:
    if text is None:
        return ""
    return text.replace("|", "\\|").replace("\r", "").replace("\n", " \u23ce ")


def _write_flat_report(
    emoji: str,
    title: str,
    filename: str,
    entries: Sequence[StringEntry],
    localization: str,
    reports_root: os.PathLike | str,
) -> None:
    if not entries:
        return
    out_path = os.path.join(_locale_dir(reports_root, localization), filename)

    missing = [e for e in entries if e.status == "missing"]
    empty = [e for e in entries if e.status == "empty"]

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"# {emoji} {title}\n\n")
        f.write(f"> **Localization:** `{localization.upper()}`  \n")
        f.write(f"> **Missing keys:** `{len(missing)}` \u2014 **Empty values:** `{len(empty)}`  \n")
        f.write(f"> **Total entries to fix:** `{len(entries)}`  \n")
        f.write("> **Generated automatically by PVZ Fuzion Console Manager** \U0001f9e9\n\n")
        f.write("---\n\n")

        if missing:
            f.write(f"## \u274c Missing Keys ({len(missing)})\n\n")
            f.write("```json\n")
            f.write(json.dumps(
                {e.key: e.source for e in missing},
                ensure_ascii=False, indent=2,
            ))
            f.write("\n```\n\n---\n\n")

        if empty:
            f.write(f"## \u26a0\ufe0f Empty Values ({len(empty)})\n\n")
            f.write("| Key | Source (English) |\n")
            f.write("| --- | --- |\n")
            for e in empty:
                f.write(f"| `{_md_cell(e.key)}` | {_md_cell(e.source)} |\n")
            f.write("\n")

    print(f"\u2705 Report generated: {out_path}")


def build_strings_report(entries: Sequence[StringEntry], localization: str, reports_root: os.PathLike | str) -> None:
    _write_flat_report("\U0001f4dd", "Missing UI String Translations", "missing_strings.md",
                       entries, localization, reports_root)


def build_regexs_report(entries: Sequence[StringEntry], localization: str, reports_root: os.PathLike | str) -> None:
    _write_flat_report("\U0001f524", "Missing Regex Translations", "missing_regexs.md",
                       entries, localization, reports_root)


def build_tips_report(entries: Sequence[StringEntry], localization: str, reports_root: os.PathLike | str, kind: str) -> None:
    label = {"iz": "I, Zombie", "fs": "Fusion Showcase"}[kind]
    _write_flat_report("\U0001f4cc", f"Missing Tips Translations ({label})", f"missing_tips_{kind}.md",
                       entries, localization, reports_root)


def build_abyss_buffs_report(entries: Sequence[StringEntry], localization: str, reports_root: os.PathLike | str) -> None:
    _write_flat_report("\U0001f30a", "Missing Abyss Buff Translations", "missing_abyss_buffs.md",
                       entries, localization, reports_root)


def build_travel_buffs_report(entries: Sequence[StringEntry], localization: str, reports_root: os.PathLike | str) -> None:
    _write_flat_report("\U0001f9f3", "Missing Travel Buff Translations", "missing_travel_buffs.md",
                       entries, localization, reports_root)


# ---------- duplicates report --------------------------------------------------

def build_duplicates_report(result: LocaleDuplicates, reports_root: os.PathLike | str) -> Optional[str]:
    """Write ``duplicates.md`` for ``result``. Returns the path, or ``None``
    when the locale is clean (no duplicates found in any scanned file).
    """
    if not result.has_any:
        return None
    out_path = os.path.join(_locale_dir(reports_root, result.locale), "duplicates.md")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("# \U0001f501 Duplicate translations\n\n")
        f.write(f"> **Localization:** `{result.locale.upper()}`  \n")
        f.write(
            f"> **Duplicate keys:** `{result.total_duplicate_keys}` \u2014 "
            f"**Repeated values:** `{result.total_duplicate_values}`  \n"
        )
        f.write("> **Generated automatically by PVZ Fuzion Console Manager** \U0001f9e9\n\n")
        f.write("---\n\n")

        for fd in result.files:
            if not fd.has_any:
                continue
            f.write(f"## `{fd.filename}`\n\n")

            if fd.duplicate_keys:
                f.write(f"### \u274c Duplicate keys ({len(fd.duplicate_keys)})\n\n")
                f.write("| Key | Occurrences |\n| --- | --- |\n")
                for key, count in fd.duplicate_keys:
                    f.write(f"| `{_md_cell(key)}` | {count} |\n")
                f.write("\n")

            if fd.duplicate_values:
                f.write(f"### \U0001f501 Repeated values ({len(fd.duplicate_values)})\n\n")
                f.write("| Value | Keys sharing it |\n| --- | --- |\n")
                for value, keys in fd.duplicate_values:
                    keys_cell = ", ".join(f"`{k}`" for k in keys)
                    f.write(f"| {_md_cell(value)} | {_md_cell(keys_cell)} |\n")
                f.write("\n")

            f.write("---\n\n")

    print(f"\u2705 Report generated: {out_path}")
    return out_path
