from __future__ import annotations

import json
from pathlib import Path

import pytest


def _write_json(path: Path, data, *, encoding: str = "utf-8") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding=encoding) as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@pytest.fixture
def project_root(tmp_path: Path) -> Path:
    """Empty PvZ_Fusion_Translator/ tree under tmp_path with Localization/ + Dumps/."""
    root = tmp_path / "PvZ_Fusion_Translator"
    (root / "Localization").mkdir(parents=True)
    (root / "Dumps").mkdir(parents=True)
    return root


@pytest.fixture
def make_locale(project_root: Path):
    """Factory that drops fixture files into ``Localization/<locale>/{Strings,Almanac}/``."""

    def _make(locale: str, *, strings: dict | None = None, almanac: dict | None = None) -> Path:
        loc = project_root / "Localization" / locale
        loc.mkdir(parents=True, exist_ok=True)
        for filename, content in (strings or {}).items():
            _write_json(loc / "Strings" / filename, content)
        for filename, content in (almanac or {}).items():
            _write_json(loc / "Almanac" / filename, content)
        return loc

    return _make


@pytest.fixture
def make_dump(project_root: Path):
    """Factory that drops a JSON file into ``Dumps/``."""

    def _make(filename: str, content) -> Path:
        path = project_root / "Dumps" / filename
        _write_json(path, content)
        return path

    return _make
