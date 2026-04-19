from __future__ import annotations

from pathlib import Path
from typing import Iterable, Iterator, Optional


def render_title(candidates: Iterable[Path]) -> None:
    """Render the ASCII title banner.

    Order:
      1. Filesystem candidates (source runs).
      2. Package-bundled resource (``pvz_console/data/title.md``) \u2014 used when
         the app runs from a ``.pyz`` archive.
      3. Plain text fallback.
    """
    lines = _read_from_filesystem(candidates) or _read_from_package()
    if lines is None:
        print("PVZ FUZION CONSOLE MANAGER")
        return
    for line in lines:
        if line.strip().startswith("```"):
            continue
        print(line.rstrip())


def _read_from_filesystem(candidates: Iterable[Path]) -> Optional[Iterator[str]]:
    for path in candidates:
        try:
            if path.is_file():
                with open(path, "r", encoding="utf-8") as f:
                    return iter(f.readlines())
        except OSError:
            continue
    return None


def _read_from_package() -> Optional[Iterator[str]]:
    try:
        from importlib.resources import files
        text = (files("pvz_console") / "data" / "title.md").read_text(encoding="utf-8")
    except (ModuleNotFoundError, FileNotFoundError, OSError):
        return None
    return iter(text.splitlines(keepends=True))
