from __future__ import annotations

import os
from typing import List

from pvz_console.core.models import Achievement, Plant, Zombie
from pvz_console.parsers.loaders import almanac_dir, load_json

PLANTS_FILE = "LawnStringsTranslate.json"
ZOMBIES_FILE = "ZombieStringsTranslate.json"
ACHIEVEMENTS_FILE = "AchievementsTextTranslate.json"


def load_plants(root: str, locale: str) -> List[Plant]:
    data = load_json(os.path.join(almanac_dir(root, locale), PLANTS_FILE))
    return [
        Plant(id=item.get("seedType"), name=item.get("name"), raw=item)
        for item in data.get("plants", [])
        if isinstance(item, dict)
    ]


def load_zombies(root: str, locale: str) -> List[Zombie]:
    data = load_json(os.path.join(almanac_dir(root, locale), ZOMBIES_FILE))
    return [
        Zombie(id=item.get("theZombieType"), name=item.get("name"), raw=item)
        for item in data.get("zombies", [])
        if isinstance(item, dict)
    ]


def load_achievements(root: str, locale: str) -> List[Achievement]:
    data = load_json(os.path.join(almanac_dir(root, locale), ACHIEVEMENTS_FILE))
    return [
        Achievement(id=item.get("achievement"), name=item.get("Name"), raw=item)
        for item in data.get("achievements", [])
        if isinstance(item, dict)
    ]
