from __future__ import annotations

from pvz_console.parsers.almanac import (
    ACHIEVEMENTS_FILE,
    PLANTS_FILE,
    ZOMBIES_FILE,
    load_achievements,
    load_plants,
    load_zombies,
)


def test_load_plants_extracts_id_and_name(make_locale, project_root):
    make_locale("English", almanac={
        PLANTS_FILE: {"plants": [
            {"seedType": 1, "name": "Peashooter"},
            {"seedType": 2, "name": "Sunflower"},
        ]},
    })
    plants = load_plants(str(project_root), "English")
    assert [(p.id, p.name) for p in plants] == [(1, "Peashooter"), (2, "Sunflower")]
    assert plants[0].raw == {"seedType": 1, "name": "Peashooter"}


def test_load_plants_skips_non_dict_entries(make_locale, project_root):
    make_locale("English", almanac={
        PLANTS_FILE: {"plants": [{"seedType": 1, "name": "Peashooter"}, "not a dict", 42]},
    })
    plants = load_plants(str(project_root), "English")
    assert [p.id for p in plants] == [1]


def test_load_plants_returns_empty_when_file_missing(project_root):
    assert load_plants(str(project_root), "Unknown") == []


def test_load_zombies_uses_zombie_type_id(make_locale, project_root):
    make_locale("English", almanac={
        ZOMBIES_FILE: {"zombies": [{"theZombieType": 100, "name": "Basic"}]},
    })
    zombies = load_zombies(str(project_root), "English")
    assert [(z.id, z.name) for z in zombies] == [(100, "Basic")]


def test_load_achievements_reads_capitalized_name_field(make_locale, project_root):
    make_locale("English", almanac={
        ACHIEVEMENTS_FILE: {"achievements": [{"achievement": "ACH_1", "Name": "First"}]},
    })
    achievements = load_achievements(str(project_root), "English")
    assert [(a.id, a.name) for a in achievements] == [("ACH_1", "First")]
