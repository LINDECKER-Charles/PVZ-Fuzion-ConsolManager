from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Sequence

from pvz_console.parsers.loaders import load_json, strings_dir

DUMPS_DIRNAME = "Dumps"
TIPS_FILES: Sequence[str] = ("tips_iz.json", "tips_fs.json")
TRANSLATION_STRINGS_FILE = "translation_strings.json"


@dataclass
class MigrationResult:
    locale: str
    migrated: List[str] = field(default_factory=list)
    skipped_already_present: List[str] = field(default_factory=list)
    skipped_missing_source: List[str] = field(default_factory=list)
    skipped_incomplete: Dict[str, int] = field(default_factory=dict)
    skipped_empty_translation_strings: bool = False

    @property
    def did_anything(self) -> bool:
        return bool(self.migrated)


def migrate_tips(root: str, locale: str, tips_files: Sequence[str] = TIPS_FILES) -> MigrationResult:
    """Create ``tips_iz.json``/``tips_fs.json`` for ``locale`` from ``translation_strings.json``.

    Contract (per file):
      * If the destination already exists, skip (no overwrite).
      * If the dump source file is missing, skip with a warning.
      * If *any* Chinese tip text from the dump is not present in the locale's
        ``translation_strings.json``, skip \u2014 partial migrations would silently
        drop content the translator still needs to handle.
      * Otherwise write a UTF-8-SIG JSON file mapping each tip key to its
        translation pulled from ``translation_strings.json``.
    """
    result = MigrationResult(locale=locale)

    loc_strings_dir = strings_dir(root, locale)
    translation_strings = _load_flat(os.path.join(loc_strings_dir, TRANSLATION_STRINGS_FILE))
    if not translation_strings:
        result.skipped_empty_translation_strings = True
        return result

    dumps_dir = os.path.join(root, DUMPS_DIRNAME)

    for filename in tips_files:
        dumps_path = os.path.join(dumps_dir, filename)
        dest_path = os.path.join(loc_strings_dir, filename)

        if not os.path.exists(dumps_path):
            result.skipped_missing_source.append(filename)
            continue
        if os.path.exists(dest_path):
            result.skipped_already_present.append(filename)
            continue

        dump: Dict[str, str] = _load_flat(dumps_path)
        missing = [tip_text for tip_text in dump.values() if tip_text not in translation_strings]
        if missing:
            result.skipped_incomplete[filename] = len(missing)
            continue

        translated = {tip_key: translation_strings[tip_text] for tip_key, tip_text in dump.items()}

        os.makedirs(loc_strings_dir, exist_ok=True)
        with open(dest_path, "w", encoding="utf-8-sig") as f:
            json.dump(translated, f, indent=4, ensure_ascii=False)
        result.migrated.append(filename)

    return result


def _load_flat(path: str) -> Dict[str, str]:
    data = load_json(path)
    return data if isinstance(data, dict) else {}
