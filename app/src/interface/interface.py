
import os
from parser.parser import get_all_localization
from typing import List



def main_menu() -> int:
    print("[0] Show what's missing")
    print("[1] Check files integrity")
    print("[2] Settings")
    print("[3] Exit")
    choice = input(": ")
    return int(choice) if choice.isdigit() else -1

def choice_type_trad() -> int:
    print("Select the type of translation:")
    print("[-1] All")
    print("[0] Plants")
    print("[1] Zombies")
    print("[2] Achievements")
    choice = input(": ")
    return int(choice) if choice.isdigit() else -1

def select_localization(root: str) -> str|List[str]:
    print("Select a localization:")
    localizations = get_all_localization(os.path.join(root, 'Localization'))
    print("[-1] All")
    for idx, loc in enumerate(localizations):
        print(f"[{idx}] {loc}")
    choice = input(": ")
    if choice.isdigit() and 0 <= int(choice) < len(localizations):
        return localizations[int(choice)]
    else:
        return localizations

def clear_console():
    if os.name == 'nt':
        os.system('cls')
    else:
        os.system('clear')

def press_enter_to_continue():
    input("Press Enter to continue...")
    clear_console()