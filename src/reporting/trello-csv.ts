/** Trello CSV + import README generation. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { TrelloCard } from "../core/models";

export const CSV_HEADER = ["Name", "Description", "Labels", "List"] as const;

/** One written CSV: which Trello list it feeds, where it is, how many cards. */
export interface TrelloListSummary {
  name: string;
  csvPath: string;
  cardCount: number;
}

export interface TrelloReadmeOptions {
  locale: string;
  label: string;
  outputPath: string;
  lists: readonly TrelloListSummary[];
}

const README_TEMPLATE = `# \u{1f5c2}️ Trello Import — {locale} Missing Translations

This export contains every entry that still needs translation for **{locale}**.
There is **one CSV per category**, so you can import them independently and
keep the Trello UI responsive even on large locales.

| Column      | Meaning                                                    |
| ----------- | ---------------------------------------------------------- |
| Name        | Card title (source key or entity name)                     |
| Description | English source text, rendered as Markdown in Trello        |
| Labels      | \`{label}\`                                                  |
| List        | Trello list name (Plants, Zombies, Regex, Strings, …)     |

## \u{1f680} How to import into Trello

### 1. Prepare the Trello board (one-time setup)

1. Create a new Trello board, e.g. \`Translation — {locale}\`.
2. Create the label **\`{label}\`** (Board menu → **Labels** → *Create a new label*).
   The plugin matches by exact label name, so the label must exist before
   the first import.
3. Create the **lists (columns)** below. The CSV \`List\` column uses these
   exact names — every list that appears in your export folder must exist
   on the board, otherwise Blue Cat drops the cards on the default list.
{lists_to_create}
4. Install the Power-Up **Import to Trello by Blue Cat (CSV, Excel)** from
   the Trello Power-Ups directory and enable it on the board.

### 2. Import the CSVs

For each CSV in this folder:

1. Open the board, click **Power-Ups → Import to Trello (Blue Cat) → Import CSV**.
2. Upload the CSV (e.g. \`{first_csv}\`).
3. In the column mapping step:
   - \`Name\`        → *Card name*
   - \`Description\` → *Card description*
   - \`Labels\`      → *Labels*
   - \`List\`        → *List* (Blue Cat will create the list if needed)
4. Run the import. Repeat for the next CSV.

## \u{1f4ca} What's inside

{stats_table}

## ✅ Workflow tip

Filter the board by the \`{label}\` label to see the full translation backlog.
Add a per-translator label (e.g. \`assignee:alice\`) as soon as a card is picked
up — the CSVs stay the single source of truth for what still needs work.
`;

const UNSAFE_FILENAME_CHARS = /[^A-Za-z0-9_]+/g;
const FALLBACK_LIST_FILENAME = "Other";
const FALLBACK_FIRST_CSV = "trello_Plants.csv";
const LIST_COLUMN_WIDTH = 20;
const FILE_COLUMN_WIDTH = 28;
const COUNT_COLUMN_WIDTH = 6;

function safeListFilename(listName: string): string {
  const token = listName.replace(UNSAFE_FILENAME_CHARS, "_").replace(/^_+|_+$/g, "");
  return token || FALLBACK_LIST_FILENAME;
}

/**
 * Encode a single field exactly as Python's `csv.writer(quoting=QUOTE_ALL)`:
 * every field is wrapped in double quotes and embedded `"` are doubled.
 */
function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** One `csv.writer.writerow(...)` with `QUOTE_ALL` and a `\r\n` terminator. */
function csvRow(fields: readonly string[]): string {
  return `${fields.map(csvField).join(",")}\r\n`;
}

export function buildTrelloCsv(cards: readonly TrelloCard[], outputPath: string): string {
  mkdirSync(path.dirname(outputPath) || ".", { recursive: true });
  const rows = cards.map((card) =>
    csvRow([card.name, card.description, card.labels, card.listName]),
  );
  writeFileSync(outputPath, csvRow(CSV_HEADER) + rows.join(""), { encoding: "utf-8" });
  return outputPath;
}

function groupByList(cards: readonly TrelloCard[]): Map<string, TrelloCard[]> {
  const grouped = new Map<string, TrelloCard[]>();
  for (const card of cards) {
    const group = grouped.get(card.listName);
    if (group) group.push(card);
    else grouped.set(card.listName, [card]);
  }
  return grouped;
}

/**
 * Group `cards` by `listName` and write one CSV per group.
 *
 * Empty groups produce no file, so the returned summaries describe exactly the
 * CSVs that exist on disk.
 */
export function writeTrelloCsvsByList(
  cards: readonly TrelloCard[],
  outputDir: string,
  filenamePrefix = "trello_",
): TrelloListSummary[] {
  return [...groupByList(cards)].map(([name, group]) => {
    const filename = `${filenamePrefix}${safeListFilename(name)}.csv`;
    return {
      name,
      csvPath: buildTrelloCsv(group, path.join(outputDir, filename)),
      cardCount: group.length,
    };
  });
}

/** Left-justify to `width` columns (Python `{:<width}`). */
function ljust(text: string, width: number): string {
  return text.padEnd(width);
}

/** Right-justify to `width` columns (Python `{:>width}`). */
function rjust(text: string, width: number): string {
  return text.padStart(width);
}

function renderStatsTable(lists: readonly TrelloListSummary[]): string {
  const rows = lists
    .map(
      (list) =>
        `| ${ljust(list.name, LIST_COLUMN_WIDTH)} ` +
        `| ${ljust(path.basename(list.csvPath), FILE_COLUMN_WIDTH)} ` +
        `| ${rjust(String(list.cardCount), COUNT_COLUMN_WIDTH)} |`,
    )
    .join("\n");
  const total = lists.reduce((sum, list) => sum + list.cardCount, 0);
  return (
    "| List                 | CSV file                     | Cards  |\n" +
    "| -------------------- | ---------------------------- | ------ |\n" +
    `${rows}\n` +
    `| ${ljust("**Total**", LIST_COLUMN_WIDTH)} |                              | **${total}** |`
  );
}

export function buildTrelloReadme(options: TrelloReadmeOptions): string {
  const { locale, label, outputPath, lists } = options;
  mkdirSync(path.dirname(outputPath) || ".", { recursive: true });

  const isEmpty = lists.length === 0;
  const body = README_TEMPLATE.replace(/\{locale\}/g, locale)
    .replace(/\{label\}/g, label)
    .replace(/\{first_csv\}/g, isEmpty ? FALLBACK_FIRST_CSV : path.basename(lists[0].csvPath))
    .replace(
      /\{stats_table\}/g,
      isEmpty
        ? "_Nothing to import — the target locale looks fully translated._"
        : renderStatsTable(lists),
    )
    .replace(
      /\{lists_to_create\}/g,
      isEmpty
        ? "   _(no lists required — export is empty)_"
        : lists.map((list) => `   - \`${list.name}\``).join("\n"),
    );

  writeFileSync(outputPath, body, { encoding: "utf-8" });
  return outputPath;
}
