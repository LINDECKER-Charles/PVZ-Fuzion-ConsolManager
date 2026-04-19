from __future__ import annotations

import json
import os
from typing import Any, List


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
