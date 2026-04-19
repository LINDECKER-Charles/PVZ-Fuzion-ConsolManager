from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Optional, Sequence, Union

from pvz_console.cli.theme import THEME
from pvz_console.parsers.loaders import list_localizations

HEADER_FILL = "\u2500"
ALL_TOKEN = "*"
PROMPT_SYMBOL = "\u276f"


@dataclass(frozen=True)
class MenuOption:
    key: str
    label: str


def clear_console() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def press_enter_to_continue() -> None:
    input("\n  Press Enter to continue... ")
    clear_console()


def _parse_int(raw: str, default: int) -> int:
    try:
        return int(raw.strip())
    except ValueError:
        return default


def _blank_lines(n: int = 1) -> None:
    for _ in range(THEME.blank_lines * n):
        print()


def prompt() -> str:
    return input(f"  {THEME.accented(PROMPT_SYMBOL, bold=True)} ")


def section(title: str) -> None:
    _blank_lines()
    print(f"  {THEME.accented(title.upper(), bold=True)}")
    print(f"  {THEME.accented(HEADER_FILL * len(title))}")
    _blank_lines()


def print_menu(title: str, options: Sequence[MenuOption]) -> None:
    section(title)
    key_width = max(len(opt.key) for opt in options)
    for opt in options:
        key_fmt = f"{opt.key:>{key_width}}"
        print(f"    [{THEME.accented(key_fmt, bold=True)}]  {THEME.primary(opt.label)}")
    _blank_lines()


def ask_choice(title: str, options: Sequence[MenuOption], default: int = -1) -> int:
    print_menu(title, options)
    return _parse_int(prompt(), default)


def info(message: str) -> None:
    print(f"  {THEME.primary(message)}")


def warn(message: str) -> None:
    icon = THEME.emoji("\u26a0\ufe0f ", "[!]")
    print(f"  {icon} {THEME.colorize(message, 'yellow')}")


def success(message: str) -> None:
    icon = THEME.emoji("\u2705", "[OK]")
    print(f"  {icon} {THEME.colorize(message, 'green')}")


def error(message: str) -> None:
    icon = THEME.emoji("\u274c", "[X]")
    print(f"  {icon} {THEME.colorize(message, 'red')}")


# ---------- localization picker -------------------------------------------------


def _render_locales_grid(locales: Sequence[str], columns: int = 3) -> None:
    width = max((len(loc) for loc in locales), default=0)
    rows = (len(locales) + columns - 1) // columns
    for row in range(rows):
        cells = []
        for col in range(columns):
            idx = row + col * rows
            if idx >= len(locales):
                continue
            key = THEME.accented(f"{idx:>2}", bold=True)
            cells.append(f"[{key}]  {locales[idx]:<{width}}")
        print("    " + "   ".join(cells))


def select_localization(
    root: str,
    *,
    allow_multi: bool = True,
    exclude: Optional[List[str]] = None,
) -> Union[str, List[str]]:
    """Prompt for a locale. Returns a single locale name, or the full list when
    ``allow_multi`` is true and the user picks ``*``.
    """
    section("Select a localization")
    localizations = list_localizations(root)
    if exclude:
        localizations = [loc for loc in localizations if loc not in exclude]

    if allow_multi:
        print(f"    [ {THEME.accented(ALL_TOKEN, bold=True)}]  All locales")
        _blank_lines()
    _render_locales_grid(localizations)
    hint = f"(number or '{ALL_TOKEN}' for all)" if allow_multi else "(single locale only)"
    _blank_lines()
    info(hint)

    while True:
        raw = prompt().strip()
        if allow_multi and raw == ALL_TOKEN:
            return list(localizations)
        idx = _parse_int(raw, -1)
        if 0 <= idx < len(localizations):
            return localizations[idx]
        error("Invalid choice. Please enter a number from the list"
              + (f" or '{ALL_TOKEN}'." if allow_multi else "."))


def ask_text(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    raw = input(f"  {THEME.primary(label + suffix + ': ')}")
    return raw.strip() or default


def ask_choice_from_list(label: str, values: Sequence[str], current: str) -> str:
    """Show a short list; return the chosen value or the current one on invalid input."""
    section(label)
    for idx, value in enumerate(values):
        marker = " (current)" if value == current else ""
        key = THEME.accented(f"{idx:>2}", bold=True)
        print(f"    [{key}]  {value}{marker}")
    _blank_lines()
    idx = _parse_int(prompt(), -1)
    if 0 <= idx < len(values):
        return values[idx]
    return current
