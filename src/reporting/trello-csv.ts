/** Trello CSV/README generation — faithful port of `reporting/trello_csv.py`. */

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

import type { TrelloCard } from "../core/models";

export const CSV_HEADER = ["Name", "Description", "Labels", "List"] as const;

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

const SAFE_FILENAME = /[^A-Za-z0-9_]+/g;

function safeListFilename(listName: string): string {
  // Mirror Python: re.sub then strip leading/trailing "_".
  const token = listName.replace(SAFE_FILENAME, "_").replace(/^_+/, "").replace(/_+$/, "");
  return token || "Other";
}

/**
 * Encode a single field exactly as Python's `csv.writer(quoting=QUOTE_ALL)`:
 * every field is wrapped in double quotes and embedded `"` are doubled.
 */
function csvField(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}

/**
 * Replicate one `csv.writer.writerow(...)` call with `QUOTE_ALL` and
 * `newline=""` open (so the writer's `\r\n` line terminator is preserved).
 */
function csvRow(fields: readonly string[]): string {
  return fields.map(csvField).join(",") + "\r\n";
}

export function buildTrelloCsv(cards: readonly TrelloCard[], outputPath: string): string {
  mkdirSync(path.dirname(outputPath) || ".", { recursive: true });
  let content = csvRow(CSV_HEADER);
  for (const card of cards) {
    content += csvRow([card.name, card.description, card.labels, card.listName]);
  }
  writeFileSync(outputPath, content, { encoding: "utf-8" });
  return outputPath;
}

/**
 * Group `cards` by `listName` and write one CSV per group.
 *
 * Returns a mapping `{listName: csvPath}` for the files that were created.
 * Empty groups produce no file.
 */
export function writeTrelloCsvsByList(
  cards: readonly TrelloCard[],
  outputDir: string,
  filenamePrefix = "trello_",
): Record<string, string> {
  const grouped = new Map<string, TrelloCard[]>();
  for (const card of cards) {
    let group = grouped.get(card.listName);
    if (group === undefined) {
      group = [];
      grouped.set(card.listName, group);
    }
    group.push(card);
  }

  const paths: Record<string, string> = {};
  for (const [listName, group] of grouped) {
    const filename = `${filenamePrefix}${safeListFilename(listName)}.csv`;
    const filePath = path.join(outputDir, filename);
    buildTrelloCsv(group, filePath);
    paths[listName] = filePath;
  }
  return paths;
}

/** Left-justify to `width` columns (Python `{:<width}`). */
function ljust(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

/** Right-justify to `width` columns (Python `{:>width}`). */
function rjust(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

export function buildTrelloReadme(
  locale: string,
  csvPathsByList: Record<string, string>,
  label: string,
  outputPath: string,
): string {
  mkdirSync(path.dirname(outputPath) || ".", { recursive: true });

  const entries = Object.entries(csvPathsByList);
  let statsTable: string;
  let firstCsv: string;
  let listsToCreate: string;

  if (entries.length > 0) {
    const rows = entries
      .map(
        ([name, p]) =>
          `| ${ljust(name, 20)} | ${ljust(path.basename(p), 28)} | ${rjust(String(countRows(p)), 6)} |`,
      )
      .join("\n");
    const total = entries.reduce((sum, [, p]) => sum + countRows(p), 0);
    statsTable =
      "| List                 | CSV file                     | Cards  |\n" +
      "| -------------------- | ---------------------------- | ------ |\n" +
      `${rows}\n` +
      `| ${ljust("**Total**", 20)} |                              | **${total}** |`;
    const first = entries[0]!;
    firstCsv = path.basename(first[1]);
    listsToCreate = entries.map(([name]) => `   - \`${name}\``).join("\n");
  } else {
    statsTable = "_Nothing to import — the target locale looks fully translated._";
    firstCsv = "trello_Plants.csv";
    listsToCreate = "   _(no lists required — export is empty)_";
  }

  const body = README_TEMPLATE.replace(/\{locale\}/g, locale)
    .replace(/\{label\}/g, label)
    .replace(/\{first_csv\}/g, firstCsv)
    .replace(/\{stats_table\}/g, statsTable)
    .replace(/\{lists_to_create\}/g, listsToCreate);

  writeFileSync(outputPath, body, { encoding: "utf-8" });
  return outputPath;
}

/**
 * Count data rows in a CSV (excluding the header), mirroring Python's
 * `csv.reader` row count minus one.
 */
function countRows(csvPath: string): number {
  const content = readFileSync(csvPath, { encoding: "utf-8" });
  // csv.reader yields one record per CSV row. With QUOTE_ALL output and no
  // embedded newlines inside fields, each record is one `\r\n`-terminated line.
  const records = parseCsvRecords(content);
  return Math.max(0, records.length - 1);
}

/**
 * Minimal RFC-4180 record counter compatible with the output of `buildTrelloCsv`.
 * Handles quoted fields containing `,`, `\r`, `\n` and doubled `""`.
 */
function parseCsvRecords(content: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let started = false;

  const pushField = (): void => {
    record.push(field);
    field = "";
  };
  const pushRecord = (): void => {
    pushField();
    records.push(record);
    record = [];
    started = false;
  };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      started = true;
    } else if (ch === ",") {
      pushField();
      started = true;
    } else if (ch === "\r") {
      if (content[i + 1] === "\n") {
        i++;
      }
      pushRecord();
    } else if (ch === "\n") {
      pushRecord();
    } else {
      field += ch;
      started = true;
    }
  }
  if (started || field.length > 0 || record.length > 0) {
    pushRecord();
  }
  return records;
}
