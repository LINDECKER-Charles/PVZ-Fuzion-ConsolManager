from __future__ import annotations

from pathlib import Path
from typing import Iterable

PROJECT_DIR_NAME = "PvZ_Fusion_Translator"
SOURCE_LOCALE = "English"

_PACKAGE_ROOT = Path(__file__).resolve().parent
_SRC_ROOT = _PACKAGE_ROOT.parent
REPO_ROOT = _SRC_ROOT.parent


def _discover_project_root() -> Path:
    """Look for ``PvZ_Fusion_Translator/`` in this order:

    1. Next to the install (``REPO_ROOT``) \u2014 source layout.
    2. Its immediate parent (``REPO_ROOT.parent``) \u2014 e.g. when the archive
       lives in ``ConsolManager/`` and the data folder is one level up.
    3. Next to the current working directory.
    4. Its immediate parent.

    The search is intentionally **not recursive**: each candidate is checked
    exactly once. The first directory that exists wins; otherwise the
    canonical sibling path is returned so error messages stay stable.
    """
    canonical = (REPO_ROOT / PROJECT_DIR_NAME).resolve()
    cwd = Path.cwd()
    candidates: Iterable[Path] = (
        canonical,
        (REPO_ROOT.parent / PROJECT_DIR_NAME).resolve(),
        (cwd / PROJECT_DIR_NAME).resolve(),
        (cwd.parent / PROJECT_DIR_NAME).resolve(),
    )
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return canonical


DATA_DIR = REPO_ROOT / "data"
PROJECT_ROOT = _discover_project_root()

# Defaults for generated artifacts — callers may override.
REPORTS_ROOT = Path("reports")
EXPORTS_ROOT = Path("exports")

TITLE_CANDIDATES = [
    DATA_DIR / "title.md",
    Path.cwd() / "data" / "title.md",
    _PACKAGE_ROOT / "data" / "title.md",
]
