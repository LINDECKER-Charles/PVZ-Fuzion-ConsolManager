import os
from parser.entry_comparator import compare_json_plant, compare_json_zombie, compare_json_achievement
from parser.parser import get_all_localization
from report_builder.need_trad import build_plant_report, build_zombie_report, build_achievement_report
from interface.interface import main_menu, select_localization, clear_console, choice_type_trad, press_enter_to_continue


def main():

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'PvZ_Fusion_Translator'))
    clear_console()
    print("=== PVZ Fuzion Consol Manager ===")
    print("Hii! Welcome to the PVZ Fuzion Consol Manager.")
    
    while True:
        choice = main_menu()
        clear_console()
        match choice:
            case 0:
                clear_console()
                localiz = select_localization(root)
                clear_console()
                print(f"You selected localization: {localiz}")
                type_trad = choice_type_trad()
                clear_console()
                count = 0
                match type_trad:
                    case 0:
                        print("You selected translation type: Plants")
                        for loc in localiz if isinstance(localiz, list) else [localiz]:
                            merged_data = compare_json_plant(root, "English", loc)
                            count += len(merged_data)
                            build_plant_report(merged_data, loc, os.path.join("reports", "plants"))
                    case 1:
                        print("You selected translation type: Zombies")
                        for loc in localiz if isinstance(localiz, list) else [localiz]:
                            merged_data = compare_json_zombie(root, "English", loc)
                            count += len(merged_data)
                            build_zombie_report(merged_data, loc, os.path.join("reports", "zombies"))
                    case 2:
                        print("You selected translation type: Achievements")
                        for loc in localiz if isinstance(localiz, list) else [localiz]:
                            merged_data = compare_json_achievement(root, "English", loc)
                            count += len(merged_data)
                            build_achievement_report(merged_data, loc, os.path.join("reports", "achievements"))
                    case -1:
                        print("You selected translation type: All")
                        for loc in localiz if isinstance(localiz, list) else [localiz]:
                            merged_data = compare_json_plant(root, "English", loc)
                            count += len(merged_data)
                            build_plant_report(merged_data, loc, os.path.join("reports", "plants"))
                        for loc in localiz if isinstance(localiz, list) else [localiz]:
                            merged_data = compare_json_zombie(root, "English", loc)
                            count += len(merged_data)
                            build_zombie_report(merged_data, loc, os.path.join("reports", "zombies"))
                        for loc in localiz if isinstance(localiz, list) else [localiz]:
                            merged_data = compare_json_achievement(root, "English", loc)
                            count += len(merged_data)
                            build_achievement_report(merged_data, loc, os.path.join("reports", "achievements"))
                print(f"Total missing entries found: {count}")
                press_enter_to_continue()
            case 1:
                print("This feature is under development.")
                press_enter_to_continue()
            case 2:
                print("This feature is under development.")
                press_enter_to_continue()
            case 3:
                print("This feature is under development.")
                exit(0)
            case _:
                print("This feature is under development.")
                press_enter_to_continue()
    