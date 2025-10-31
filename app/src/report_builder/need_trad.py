import os
from typing import List
from parser.object import Plant, Zombie, Achievement


def _write_header(f, title_emoji: str, title: str, entity_count: int, localization: str):
    f.write(f"# {title_emoji} {title}\n\n")
    f.write(f"> **Localization:** `{localization.upper()}`  \n")
    f.write(f"> **Total missing entries:** `{entity_count}`  \n")
    f.write(f"> **Generated automatically by PVZ Fuzion Console Manager** 🧩\n\n")
    f.write("---\n\n")
    f.write("## 📑 Table of Contents\n")
    f.write("\n".join([
        "- [Summary](#summary)",
        "- [Missing entries](#missing-entries)",
        "\n\n---\n\n"
    ]))
    f.write("## 🧾 Summary\n")
    f.write(f"There are **{entity_count}** entries missing in the `{localization.upper()}` translation.\n\n")
    f.write("---\n\n")
    f.write("## 💀 Missing Entries\n\n")


def build_plant_report(plants: List[Plant], localization: str, output_dir: str) -> None:
    if not plants:
        return

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"missing_plants_{localization}.md")

    with open(output_path, "w", encoding="utf-8") as f:
        _write_header(f, "🌱", "Missing Plant Translations", len(plants), localization)

        for plant in plants:
            f.write(f"### 🪴 `{plant.name or 'Name missing'}`  \n")
            f.write(f"**seedType:** `{plant.id}`\n\n")
            f.write(f"**🧾 Introduce:**\n\n> {plant.introduce or '*❌ Missing translation*'}\n\n")
            f.write(f"**📘 Info:**\n\n {plant.info or '*❌ Missing translation*'}\n\n")
            f.write(f"**💰 Cost:**\n\n> {plant.cost or '*❌ Missing translation*'}\n\n")
            f.write("---\n\n")

    print(f"✅ Report generated: {output_path}")


def build_zombie_report(zombies: List[Zombie], localization: str, output_dir: str) -> None:
    if not zombies:
        return

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"missing_zombies_{localization}.md")

    with open(output_path, "w", encoding="utf-8") as f:
        _write_header(f, "🧟", "Missing Zombie Translations", len(zombies), localization)

        for zombie in zombies:
            f.write(f"### 🧠 `{zombie.name or 'Name missing'}`  \n")
            f.write(f"**ID:** `{zombie.id}`\n\n")
            f.write(f"**🧾 Description:**\n\n> {zombie.introduce or '*❌ Missing translation*'}\n\n")
            f.write(f"**📘 Detailed Info:**\n\n {zombie.info or '*❌ Missing translation*'}\n\n")
            f.write("---\n\n")

    print(f"✅ Report generated: {output_path}")


def build_achievement_report(achievements: List[Achievement], localization: str, output_dir: str) -> None:
    if not achievements:
        return

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"missing_achievements_{localization}.md")

    with open(output_path, "w", encoding="utf-8") as f:
        _write_header(f, "🏆", "Missing Achievement Translations", len(achievements), localization)

        for ach in achievements:
            f.write(f"### 🥇 `{ach.name or 'Name missing'}`  \n")
            f.write(f"**ID:** `{ach.id}`\n\n")
            f.write(f"**🧾 Description:**\n\n> {ach.introduce or '*❌ Missing translation*'}\n\n")
            f.write("---\n\n")

    print(f"✅ Report generated: {output_path}")
