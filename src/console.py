import os
import json
from parser.object import EntryPath, compare_lists, get_plants, get_zombies, get_achievements
from parser.entry_comparator import compare_json_plant
from parser.parser import get_all_localization
from report_builder.need_trad import build_plant_report
from typing import List, TypeVar


if __name__ == '__main__':
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'PvZ_Fusion_Translator'))
    location_a = 'English'
    print(f"Root path: {root}")
    for localization in get_all_localization(os.path.join(root, 'Localization')):
        merged_data = compare_json_plant(root, location_a, localization)
        build_plant_report(merged_data, localization, os.path.join("reports", "plants"))
        print(f"Length of merged data for {localization}: {len(merged_data)}")

    print("--- Merged Data ---")
    """ print(get_entity_dict(merged_data)) """
    