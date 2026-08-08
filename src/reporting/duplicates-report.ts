/** Markdown report listing the duplicate keys and repeated values of a locale. */

import {
  type FileDuplicates,
  type LocaleDuplicates,
  hasDuplicates,
  totalDuplicateKeys,
  totalDuplicateValues,
} from "../tools/duplicate-checker";
import {
  GENERATED_BY_LINE,
  localizationLine,
  markdownCell,
  writeLocaleFile,
} from "./output";

const FILENAME = "duplicates.md";

function renderHeader(result: LocaleDuplicates): string {
  return (
    "# \u{1f501} Duplicate translations\n\n" +
    localizationLine(result.locale) +
    `> **Duplicate keys:** \`${totalDuplicateKeys(result)}\` — ` +
    `**Repeated values:** \`${totalDuplicateValues(result)}\`  \n` +
    GENERATED_BY_LINE +
    "---\n\n"
  );
}

function renderKeysTable(file: FileDuplicates): string {
  if (file.duplicateKeys.length === 0) {
    return "";
  }
  const rows = file.duplicateKeys
    .map(([key, count]) => `| \`${markdownCell(key)}\` | ${count} |\n`)
    .join("");
  return (
    `### ❌ Duplicate keys (${file.duplicateKeys.length})\n\n` +
    "| Key | Occurrences |\n| --- | --- |\n" +
    rows +
    "\n"
  );
}

function renderValuesTable(file: FileDuplicates): string {
  if (file.duplicateValues.length === 0) {
    return "";
  }
  const rows = file.duplicateValues
    .map(([value, keys]) => {
      const shared = keys.map((key) => `\`${key}\``).join(", ");
      return `| ${markdownCell(value)} | ${markdownCell(shared)} |\n`;
    })
    .join("");
  return (
    `### \u{1f501} Repeated values (${file.duplicateValues.length})\n\n` +
    "| Value | Keys sharing it |\n| --- | --- |\n" +
    rows +
    "\n"
  );
}

function renderFile(file: FileDuplicates): string {
  return (
    `## \`${file.filename}\`\n\n` + renderKeysTable(file) + renderValuesTable(file) + "---\n\n"
  );
}

/**
 * Write `duplicates.md` for `result`. Returns the path, or `null` when the
 * locale is clean (no duplicates found in any scanned file).
 */
export function buildDuplicatesReport(
  result: LocaleDuplicates,
  reportsRoot: string,
): string | null {
  const offenders = result.files.filter(hasDuplicates);
  if (offenders.length === 0) {
    return null;
  }
  const body = renderHeader(result) + offenders.map(renderFile).join("");
  return writeLocaleFile({ localization: result.locale, reportsRoot }, FILENAME, body);
}
