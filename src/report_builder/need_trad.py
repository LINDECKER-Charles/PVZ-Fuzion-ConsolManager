import os
from typing import List
from parser.object import Plant, Zombie, Achievement

def build_plant_report(plants: List[Plant], localization: str, output_dir: str) -> None:
    """
    Génère un rapport Markdown listant les plantes manquantes dans une traduction donnée.

    Args:
        plants (List[Plant]): liste des plantes manquantes.
        localization (str): code de la localisation (ex: "fr", "en", "zh-cn").
        output_dir (str): répertoire de sortie du rapport.
    """
    if not plants:
        print("✅ Aucune plante manquante.")
        return
    
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"missing_plants_{localization}.md")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"# 🌱 Rapport des traductions manquantes — {localization.upper()}\n\n")
        f.write(f"**Nombre total de plantes manquantes :** {len(plants)}\n\n")
        f.write("---\n\n")

        for plant in plants:
            f.write(f"## 🪴 {plant.name or 'Nom manquant'} (ID: `{plant.id}`)\n\n")
            f.write(f"**Description :**\n\n")
            f.write(f"{plant.introduce or '*❌ Traduction manquante*'}\n\n")

            f.write(f"**Informations détaillées :**\n\n")
            f.write(f"{plant.info or '*❌ Traduction manquante*'}\n\n")

            f.write(f"**Coût :**\n\n")
            f.write(f"{plant.cost or '*❌ Traduction manquante*'}\n\n")

            f.write("---\n\n")

    print(f"✅ Rapport généré : {output_path}")
