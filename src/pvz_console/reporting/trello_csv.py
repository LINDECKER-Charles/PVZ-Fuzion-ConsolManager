from __future__ import annotations

import csv
import os
import re
from typing import Dict, List, Sequence

from pvz_console.core.models import TrelloCard

CSV_HEADER = ("Name", "Description", "Labels", "List")

README_TEMPLATE = """# \U0001f5c2\ufe0f Trello Import \u2014 {locale} Missing Translations

This export contains every entry that still needs translation for **{locale}**.
There is **one CSV per category**, so you can import them independently and
keep the Trello UI responsive even on large locales.

| Column      | Meaning                                                    |
| ----------- | ---------------------------------------------------------- |
| Name        | Card title (source key or entity name)                     |
| Description | English source text, rendered as Markdown in Trello        |
| Labels      | `{label}`                                                  |
| List        | Trello list name (Plants, Zombies, Regex, Strings, \u2026)     |

## \U0001f680 How to import into Trello

### 1. Prepare the Trello board (one-time setup)

1. Create a new Trello board, e.g. `Translation \u2014 {locale}`.
2. Create the label **`{label}`** (Board menu \u2192 **Labels** \u2192 *Create a new label*).
   The plugin matches by exact label name, so the label must exist before
   the first import.
3. Create the **lists (columns)** below. The CSV `List` column uses these
   exact names \u2014 every list that appears in your export folder must exist
   on the board, otherwise Blue Cat drops the cards on the default list.
{lists_to_create}
4. Install the Power-Up **Import to Trello by Blue Cat (CSV, Excel)** from
   the Trello Power-Ups directory and enable it on the board.

### 2. Import the CSVs

For each CSV in this folder:

1. Open the board, click **Power-Ups \u2192 Import to Trello (Blue Cat) \u2192 Import CSV**.
2. Upload the CSV (e.g. `{first_csv}`).
3. In the column mapping step:
   - `Name`        \u2192 *Card name*
   - `Description` \u2192 *Card description*
   - `Labels`      \u2192 *Labels*
   - `List`        \u2192 *List* (Blue Cat will create the list if needed)
4. Run the import. Repeat for the next CSV.

## \U0001f4ca What's inside

{stats_table}

## \u2705 Workflow tip

Filter the board by the `{label}` label to see the full translation backlog.
Add a per-translator label (e.g. `assignee:alice`) as soon as a card is picked
up \u2014 the CSVs stay the single source of truth for what still needs work.
"""


_SAFE_FILENAME = re.compile(r"[^A-Za-z0-9_]+")


def _safe_list_filename(list_name: str) -> str:
    token = _SAFE_FILENAME.sub("_", list_name).strip("_")
    return token or "Other"


def build_trello_csv(cards: Sequence[TrelloCard], output_path: str) -> str:
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow(CSV_HEADER)
        for card in cards:
            writer.writerow((card.name, card.description, card.labels, card.list_name))
    return output_path


def write_trello_csvs_by_list(
    cards: Sequence[TrelloCard],
    output_dir: str,
    filename_prefix: str = "trello_",
) -> Dict[str, str]:
    """Group ``cards`` by ``list_name`` and write one CSV per group.

    Returns a mapping ``{list_name: csv_path}`` for the files that were created.
    Empty groups produce no file.
    """
    grouped: Dict[str, List[TrelloCard]] = {}
    for card in cards:
        grouped.setdefault(card.list_name, []).append(card)

    paths: Dict[str, str] = {}
    for list_name, group in grouped.items():
        filename = f"{filename_prefix}{_safe_list_filename(list_name)}.csv"
        path = os.path.join(output_dir, filename)
        build_trello_csv(group, path)
        paths[list_name] = path
    return paths


def build_trello_readme(
    locale: str,
    csv_paths_by_list: Dict[str, str],
    label: str,
    output_path: str,
) -> str:
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    if csv_paths_by_list:
        rows = "\n".join(
            f"| {name:<20} | {os.path.basename(path):<28} | {_count_rows(path):>6} |"
            for name, path in csv_paths_by_list.items()
        )
        total = sum(_count_rows(p) for p in csv_paths_by_list.values())
        stats_table = (
            "| List                 | CSV file                     | Cards  |\n"
            "| -------------------- | ---------------------------- | ------ |\n"
            f"{rows}\n"
            f"| **Total**            |                              | **{total}** |"
        )
        first_csv = next(iter(os.path.basename(p) for p in csv_paths_by_list.values()))
        lists_to_create = "\n".join(f"   - `{name}`" for name in csv_paths_by_list)
    else:
        stats_table = "_Nothing to import \u2014 the target locale looks fully translated._"
        first_csv = "trello_Plants.csv"
        lists_to_create = "   _(no lists required \u2014 export is empty)_"

    body = README_TEMPLATE.format(
        locale=locale,
        label=label,
        first_csv=first_csv,
        stats_table=stats_table,
        lists_to_create=lists_to_create,
    )
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(body)
    return output_path


def _count_rows(csv_path: str) -> int:
    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        return max(0, sum(1 for _ in reader) - 1)  # minus header
