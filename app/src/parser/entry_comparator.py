import os
import json
from parser.object import EntryPath, compare_lists, get_plants, get_zombies, get_achievements
from typing import List, TypeVar
from parser.parser import get_all_localization

T = TypeVar('T')


def compare_json_plant(root: str, location_a: str, location_b: str) -> List[T]:

    # Build paths of the two locations
    location_a = EntryPath(root, location_a)
    location_b = EntryPath(root, location_b)

    # Get plant data from both locations
    a_data = get_plants(location_a)
    b_data = get_plants(location_b)

    # Compare and merge the two lists
    return compare_lists(a_data, b_data)

def compare_json_zombie(root: str, location_a: str, location_b: str) -> List[T]:

    # Build paths of the two locations
    location_a = EntryPath(root, location_a)
    location_b = EntryPath(root, location_b)

    # Get zombie data from both locations
    a_data = get_zombies(location_a)
    b_data = get_zombies(location_b)

    # Compare and merge the two lists
    return compare_lists(a_data, b_data)

def compare_json_achievement(root: str, location_a: str, location_b: str) -> List[T]:

    # Build paths of the two locations
    location_a = EntryPath(root, location_a)
    location_b = EntryPath(root, location_b)

    # Get achievement data from both locations
    a_data = get_achievements(location_a)
    b_data = get_achievements(location_b)

    # Compare and merge the two lists
    return compare_lists(a_data, b_data)

if __name__ == '__main__':
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'PvZ_Fusion_Translator'))
    location_a = 'English'

    for localization in get_all_localization(os.path.join(root, 'Localization')):
        merged_data = compare_json_plant(root, location_a, localization)
        print(f"Length of merged data for {localization}: {len(merged_data)}")

    print("--- Merged Data ---")
    """ print(get_entity_dict(merged_data)) """