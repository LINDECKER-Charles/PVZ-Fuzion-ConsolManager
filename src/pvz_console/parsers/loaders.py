from __future__ import annotations

import json
import os
from typing import Any, List

DUMPS_DIRNAME = "Dumps"
DUMPS_SOURCE = "Dumps"  # sentinel used in settings to select the Dumps/ folder as source

# Filenames differ between Localization/<locale>/ and Dumps/.
# These maps translate the canonical Localization filename used by parsers
# into the name actually present in Dumps/. Entries missing from the map
# keep the same name; entries mapped to None have no equivalent in Dumps/.
_ALMANAC_DUMP_FILENAMES = {
    "LawnStringsTranslate.json": "LawnStrings.json",
    "ZombieStringsTranslate.json": "ZombieStrings.json",
    "AchievementsTextTranslate.json": "AchievementsText.json",
}
_STRINGS_DUMP_FILENAMES = {
    "abyss_buffs.json": "AbyssBuffData.json",
    "translation_strings.json": None,
    "translation_regexs.json": None,
}


def load_json(path: str) -> Any:
    """Read a UTF-8-SIG JSON file.

    Missing files return an empty dict so callers don't need to branch on
    optional files across locales.
    """
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except Exception as e:
        print(f"\u2717 Error reading {path}: {e}")
        return {}


def localization_root(root: str) -> str:
    return os.path.join(root, "Localization")


def dumps_root(root: str) -> str:
    return os.path.join(root, DUMPS_DIRNAME)


def list_localizations(root: str) -> List[str]:
    folder = localization_root(root)
    return sorted(
        name
        for name in os.listdir(folder)
        if os.path.isdir(os.path.join(folder, name))
    )


def almanac_dir(root: str, locale: str) -> str:
    return os.path.join(localization_root(root), locale, "Almanac")


def strings_dir(root: str, locale: str) -> str:
    return os.path.join(localization_root(root), locale, "Strings")


def is_dumps_source(source: str) -> bool:
    return source == DUMPS_SOURCE


def _dumps_path(root: str, filename: str, mapping: dict) -> str:
    """Resolve the Dumps/ path for a canonical Localization filename.

    When ``mapping[filename]`` is ``None`` the file has no Dumps equivalent;
    we still return a (non-existent) path under Dumps/ so the ``load_json``
    missing-file branch kicks in and produces an empty diff.
    """
    mapped = mapping.get(filename, filename)
    return os.path.join(dumps_root(root), mapped if mapped is not None else filename)


def source_almanac_path(root: str, source: str, filename: str) -> str:
    if is_dumps_source(source):
        return _dumps_path(root, filename, _ALMANAC_DUMP_FILENAMES)
    return os.path.join(almanac_dir(root, source), filename)


def source_strings_path(root: str, source: str, filename: str) -> str:
    if is_dumps_source(source):
        return _dumps_path(root, filename, _STRINGS_DUMP_FILENAMES)
    return os.path.join(strings_dir(root, source), filename)


def source_has_file(root: str, source: str, kind: str, filename: str) -> bool:
    """Whether the reference file exists for this source.

    ``kind`` is ``"almanac"`` or ``"strings"``. Returns False for filenames
    that have no Dumps equivalent (e.g. translation_strings.json).
    """
    if is_dumps_source(source):
        mapping = _ALMANAC_DUMP_FILENAMES if kind == "almanac" else _STRINGS_DUMP_FILENAMES
        if mapping.get(filename, filename) is None:
            return False
    resolver = source_almanac_path if kind == "almanac" else source_strings_path
    return os.path.exists(resolver(root, source, filename))
