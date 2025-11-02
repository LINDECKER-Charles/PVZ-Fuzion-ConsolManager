import os
from typing import List, TypeVar 
from abc import ABC, abstractmethod
from parser.parser import get_plant_almanac, get_zombie_almanac, get_achivements

T = TypeVar('T')

class Entity(ABC):
    def __init__(self, id: int, name: str, introduce: str):
        self.id = id
        self.name = name
        self.introduce = introduce

class Plant(Entity):
    def __init__(self, id: int, name: str, introduce: str, info: str, cost: str):
        super().__init__(id, name, introduce)
        self.info = info
        self.cost = cost

class Zombie(Entity):
    def __init__(self, id: int, name: str, introduce: str, info: str):
        super().__init__(id, name, introduce)
        self.info = info

class Achievement(Entity):
    def __init__(self, id: int, name: str, introduce: str):
        super().__init__(id, name, introduce)

class EntryPath:
    def __init__(self, root: str, location: str):
        self.root = root
        self.location = location
        
    def get_path(self) -> str:
        return os.path.join(self.root, "Localization", self.location, "Almanac", "")




def get_plant_from_dict(data: dict) -> List[Plant]:
    plants = []
    for item in data.get("plants", []):
        plant = Plant(
            id=item.get("seedType"),
            name=item.get("name"),
            introduce=item.get("introduce"),
            info=item.get("info"),
            cost=item.get("cost")
        )
        plants.append(plant)
    return plants

def get_zombie_from_dict(data: dict) -> List[Zombie]:
    zombies = []
    for item in data.get("zombies", []):
        zombie = Zombie(
            id=item.get("theZombieType"),
            name=item.get("name"),
            introduce=item.get("introduce"),
            info=item.get("info")
        )
        zombies.append(zombie)
    return zombies

def get_achievement_from_dict(data: dict) -> List[Achievement]:
    achievements = []
    for item in data.get("achievements", []):
        achievement = Achievement(
            id=item.get("achievement"),
            name=item.get("Name"),
            introduce=item.get("Text")
        )
        achievements.append(achievement)
    return achievements

def get_entity_dict(entities: List[T]) -> dict:
    entity_dict = {}
    for entity in entities:
        entity_dict[entity.id] = entity.__dict__
    return entity_dict

def get_plants(path: EntryPath) -> List[Plant]:
    data = get_plant_almanac(os.path.dirname(path.get_path()))
    return get_plant_from_dict(data)

def get_zombies(path: EntryPath) -> List[Zombie]:
    data = get_zombie_almanac(os.path.dirname(path.get_path()))
    return get_zombie_from_dict(data)

def get_achievements(path: EntryPath) -> List[Achievement]:
    data = get_achivements(os.path.dirname(path.get_path()))
    return get_achievement_from_dict(data)


def compare_lists(a: List[T], b: List[T]) -> List[T]:
    missing = []
    for item_a in a:
        for item_b in b:
            if item_a.id == item_b.id:
                break
        else:
            missing.append(item_a)
    return missing