from parser.object import EntryPath, compare_lists, get_plants, get_zombies, get_achievements, Plant, Zombie, Achievement
from typing import List


def compare_json_plant(root: str, location_a: str, location_b: str) -> List[Plant]:

    # Build paths of the two locations
    location_a = EntryPath(root, location_a)
    location_b = EntryPath(root, location_b)

    # Get plant data from both locations
    a_data = get_plants(location_a)
    b_data = get_plants(location_b)

    # Compare and merge the two lists
    return compare_lists(a_data, b_data)

def compare_json_zombie(root: str, location_a: str, location_b: str) -> List[Zombie]:

    # Build paths of the two locations
    location_a = EntryPath(root, location_a)
    location_b = EntryPath(root, location_b)

    # Get zombie data from both locations
    a_data = get_zombies(location_a)
    b_data = get_zombies(location_b)

    # Compare and merge the two lists
    return compare_lists(a_data, b_data)

def compare_json_achievement(root: str, location_a: str, location_b: str) -> List[Achievement]:

    # Build paths of the two locations
    location_a = EntryPath(root, location_a)
    location_b = EntryPath(root, location_b)

    # Get achievement data from both locations
    a_data = get_achievements(location_a)
    b_data = get_achievements(location_b)

    # Compare and merge the two lists
    return compare_lists(a_data, b_data)