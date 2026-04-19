from __future__ import annotations

import json
from dataclasses import asdict, dataclass, fields
from pathlib import Path
from typing import Optional

from pvz_console import config

SETTINGS_FILENAME = "settings.json"

# ---- enumerations accepted by the settings file ----
COLORS = (
    "default", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
    "bright_red", "bright_green", "bright_yellow", "bright_blue",
    "bright_magenta", "bright_cyan", "bright_white",
)
DENSITIES = ("compact", "comfortable", "spacious")


@dataclass
class AppSettings:
    project_root: Optional[str] = None   # absolute path to PvZ_Fusion_Translator; None -> default
    source_locale: str = "English"
    color: str = "default"               # primary text color
    accent_color: str = "cyan"           # section headers / emphasis
    density: str = "comfortable"         # compact | comfortable | spacious
    show_emoji: bool = True
    show_banner: bool = True
    trello_label: str = "To be translated"

    def resolved_project_root(self) -> Path:
        if self.project_root:
            return Path(self.project_root).expanduser().resolve()
        return config.PROJECT_ROOT

    def validate_project_root(self) -> Optional[str]:
        p = self.resolved_project_root()
        if not p.is_dir():
            return f"Directory does not exist: {p}"
        if not (p / "Localization").is_dir():
            return f"Missing 'Localization' subfolder in {p}"
        return None


def settings_path() -> Path:
    return config.REPO_ROOT / SETTINGS_FILENAME


def load_settings() -> AppSettings:
    path = settings_path()
    if not path.is_file():
        return AppSettings()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return AppSettings()
    allowed = {f.name for f in fields(AppSettings)}
    return AppSettings(**{k: v for k, v in data.items() if k in allowed})


def save_settings(settings: AppSettings) -> None:
    path = settings_path()
    path.write_text(
        json.dumps(asdict(settings), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
