import json
import os
from typing import List


def get_plant_almanac(folder: str) -> dict:
    """
    Reads and returns the plant almanac JSON data from the specified location.
    """
    try:
        with open(os.path.join(folder, "LawnStringsTranslate.json"), 'r', encoding='utf-8-sig') as file:
            almanac_data = json.load(file)
        return almanac_data
    except Exception as e:
        print(f"✗ Error reading plant almanac from {folder}: {e}")
        return {}

def get_zombie_almanac(folder: str) -> dict:
    """
    Reads and returns the zombie almanac JSON data from the specified location.
    """
    try:
        with open(os.path.join(folder, "ZombieStringsTranslate.json"), 'r', encoding='utf-8-sig') as file:
            almanac_data = json.load(file)
        return almanac_data
    except Exception as e:
        print(f"✗ Error reading zombie almanac from {folder}: {e}")
        return {}

def get_achivements(folder: str) -> dict:
    """
    Reads and returns the achievements JSON data from the specified location.
    """
    try:
        with open(os.path.join(folder, "AchievementsTextTranslate.json"), 'r', encoding='utf-8-sig') as file:
            achievements_data = json.load(file)
        return achievements_data
    except Exception as e:
        print(f"✗ Error reading achievements from {folder}: {e}")
        return {}

def get_all_localization(folder: str) -> List[str]:
    """
    Reads and returns all localization.
    """
    return [
        name for name in os.listdir(folder)
        if os.path.isdir(os.path.join(folder, name))
    ]