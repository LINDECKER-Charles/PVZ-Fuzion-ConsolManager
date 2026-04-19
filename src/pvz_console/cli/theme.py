from __future__ import annotations

import os
from typing import Mapping

_ANSI_COLORS: Mapping[str, str] = {
    "default": "",
    "red": "\x1b[31m",
    "green": "\x1b[32m",
    "yellow": "\x1b[33m",
    "blue": "\x1b[34m",
    "magenta": "\x1b[35m",
    "cyan": "\x1b[36m",
    "white": "\x1b[37m",
    "bright_red": "\x1b[91m",
    "bright_green": "\x1b[92m",
    "bright_yellow": "\x1b[93m",
    "bright_blue": "\x1b[94m",
    "bright_magenta": "\x1b[95m",
    "bright_cyan": "\x1b[96m",
    "bright_white": "\x1b[97m",
}
_RESET = "\x1b[0m"
_BOLD = "\x1b[1m"

_DENSITY_BLANK_LINES: Mapping[str, int] = {
    "compact": 0,
    "comfortable": 1,
    "spacious": 2,
}


def enable_ansi_on_windows() -> None:
    """Enable ANSI escape code rendering on older Windows consoles (pre-Win10)."""
    if os.name != "nt":
        return
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        # STD_OUTPUT_HANDLE = -11; ENABLE_PROCESSED_OUTPUT | ENABLE_WRAP_AT_EOL_OUTPUT | ENABLE_VIRTUAL_TERMINAL_PROCESSING
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass


class Theme:
    color: str
    accent: str
    density: str
    show_emoji: bool
    show_banner: bool

    def __init__(self) -> None:
        self.color = "default"
        self.accent = "cyan"
        self.density = "comfortable"
        self.show_emoji = True
        self.show_banner = True

    def configure(
        self,
        *,
        color: str = "default",
        accent: str = "cyan",
        density: str = "comfortable",
        show_emoji: bool = True,
        show_banner: bool = True,
    ) -> None:
        self.color = color if color in _ANSI_COLORS else "default"
        self.accent = accent if accent in _ANSI_COLORS else "cyan"
        self.density = density if density in _DENSITY_BLANK_LINES else "comfortable"
        self.show_emoji = bool(show_emoji)
        self.show_banner = bool(show_banner)

    def colorize(self, text: str, color: str, *, bold: bool = False) -> str:
        code = _ANSI_COLORS.get(color, "")
        if not code and not bold:
            return text
        prefix = (_BOLD if bold else "") + code
        return f"{prefix}{text}{_RESET}"

    def primary(self, text: str, *, bold: bool = False) -> str:
        return self.colorize(text, self.color, bold=bold)

    def accented(self, text: str, *, bold: bool = False) -> str:
        return self.colorize(text, self.accent, bold=bold)

    def emoji(self, symbol: str, fallback: str = "") -> str:
        return symbol if self.show_emoji else fallback

    @property
    def blank_lines(self) -> int:
        return _DENSITY_BLANK_LINES.get(self.density, 1)


# Module-level singleton — imported by menus and app.
THEME = Theme()
