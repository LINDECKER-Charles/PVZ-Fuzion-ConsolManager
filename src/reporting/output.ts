/** Shared plumbing for everything written under the reports root. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Where a generated artifact goes: one locale folder under the reports root. */
export interface LocaleTarget {
  localization: string;
  reportsRoot: string;
}

const JSON_INDENT = 2;

/**
 * Serialize like Python's `json.dumps(obj, ensure_ascii=False, indent=2)` —
 * same `": "` key separator and `,\n` item separator, no trailing whitespace.
 */
export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, JSON_INDENT);
}

/** The locale's output folder, created on demand. */
export function localeDir(target: LocaleTarget): string {
  const dir = path.join(target.reportsRoot, target.localization);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Write `body` to `<reportsRoot>/<localization>/<filename>` and return that path. */
export function writeLocaleFile(target: LocaleTarget, filename: string, body: string): string {
  const outPath = path.join(localeDir(target), filename);
  writeFileSync(outPath, body, { encoding: "utf-8" });
  return outPath;
}

/** Standard footer line stamped on every generated report. */
export const GENERATED_BY_LINE =
  "> **Generated automatically by PVZ Fuzion Console Manager** \u{1f9e9}\n\n";

/** `> **Localization:** \`FRENCH\`` header line. */
export function localizationLine(localization: string): string {
  return `> **Localization:** \`${localization.toUpperCase()}\`  \n`;
}

/**
 * Escape a value so it survives inside a Markdown table cell.
 *
 * Backslashes go first: escaping them after the pipes would turn the `\|` this
 * function just produced back into an escaped backslash followed by a live cell
 * separator, so a translation containing `\|` would break the table it sits in.
 */
export function markdownCell(text: string | null): string {
  if (text === null) {
    return "";
  }
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r/g, "")
    .replace(/\n/g, " ⏎ ");
}
