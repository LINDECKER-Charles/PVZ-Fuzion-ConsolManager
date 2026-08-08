import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { isRecord } from "../core/guards";
import { JsonScanner } from "../core/json-scanner";
import { stripByteOrderMark } from "../core/text";
import { loadJson, stringsDir } from "../parsers/loaders";
import {
  ABYSS_BUFFS_FILE,
  REGEXS_FILE,
  STRINGS_FILE,
  TIPS_FS_FILE,
  TIPS_IZ_FILE,
  TRAVEL_BUFFS_FILE,
  flattenNested,
} from "../parsers/strings";

export const LAYOUT_FLAT = "flat";
export const LAYOUT_NESTED = "nested";

/** How a translation file nests its values. */
export type FileLayout = typeof LAYOUT_FLAT | typeof LAYOUT_NESTED;

/** (filename, layout) pairs scanned for each locale. */
export const SCAN_TARGETS: ReadonlyArray<readonly [string, FileLayout]> = [
  [STRINGS_FILE, LAYOUT_FLAT],
  [REGEXS_FILE, LAYOUT_FLAT],
  [TIPS_IZ_FILE, LAYOUT_FLAT],
  [TIPS_FS_FILE, LAYOUT_FLAT],
  [ABYSS_BUFFS_FILE, LAYOUT_FLAT],
  [TRAVEL_BUFFS_FILE, LAYOUT_NESTED],
];

/** Duplicate findings for a single translation file. */
export interface FileDuplicates {
  filename: string;
  /** `[key, occurrences]`, most repeated first. */
  duplicateKeys: Array<[string, number]>;
  /** `[value, keys sharing it]`, largest group first. */
  duplicateValues: Array<[string, string[]]>;
  isMissing: boolean;
}

/** Duplicate findings across every scanned file of one locale. */
export interface LocaleDuplicates {
  locale: string;
  files: FileDuplicates[];
}

/** Whether this file has anything worth reporting. */
export function hasDuplicates(file: FileDuplicates): boolean {
  return file.duplicateKeys.length > 0 || file.duplicateValues.length > 0;
}

export function totalDuplicateKeys(result: LocaleDuplicates): number {
  return result.files.reduce((sum, file) => sum + file.duplicateKeys.length, 0);
}

export function totalDuplicateValues(result: LocaleDuplicates): number {
  return result.files.reduce((sum, file) => sum + file.duplicateValues.length, 0);
}

/**
 * Count JSON keys that are repeated inside the same object.
 *
 * Occurrences are counted per object scope and the highest count seen for a key
 * wins. A missing file yields `{}`; a parse failure mid-stream yields whatever
 * the already-closed objects contributed.
 */
export function detectRawDuplicateKeys(filePath: string): Record<string, number> {
  const counts: Record<string, number> = {};

  let text: string;
  try {
    text = readFileSync(filePath, { encoding: "utf-8" });
  } catch {
    return counts;
  }

  const scanner = new JsonScanner(stripByteOrderMark(text), (keys) => {
    mergeRepeatedKeys(counts, keys);
  });

  try {
    scanner.parseDocument();
  } catch {
    return counts;
  }
  return counts;
}

/** Fold one object's key list into the running per-key maximum. */
function mergeRepeatedKeys(counts: Record<string, number>, keys: string[]): void {
  const local: Record<string, number> = {};
  for (const key of keys) {
    local[key] = (local[key] ?? 0) + 1;
  }
  for (const [key, count] of Object.entries(local)) {
    if (count > 1) {
      counts[key] = Math.max(counts[key] ?? 0, count);
    }
  }
}

/** Values shared by more than one key, largest group first then alphabetically. */
export function detectValueDuplicates(data: Record<string, string>): Array<[string, string[]]> {
  const grouped = new Map<string, string[]>();
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" || value.trim() === "") continue;
    const bucket = grouped.get(value);
    if (bucket) bucket.push(key);
    else grouped.set(value, [key]);
  }

  const shared = [...grouped].filter(([, keys]) => keys.length > 1);
  shared.sort(([leftValue, leftKeys], [rightValue, rightKeys]) =>
    rightKeys.length - leftKeys.length || compareStrings(leftValue, rightValue),
  );
  return shared;
}

function compareStrings(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function scanFile(filePath: string, layout: FileLayout): FileDuplicates {
  const file: FileDuplicates = {
    filename: path.basename(filePath),
    duplicateKeys: [],
    duplicateValues: [],
    isMissing: !existsSync(filePath),
  };
  if (file.isMissing) {
    return file;
  }

  file.duplicateKeys = sortByCountDesc(detectRawDuplicateKeys(filePath));

  const data = loadJson(filePath);
  if (isRecord(data)) {
    const flat = layout === LAYOUT_NESTED ? flattenNested(data) : toStringMap(data);
    file.duplicateValues = detectValueDuplicates(flat);
  }
  return file;
}

export function checkLocaleDuplicates(root: string, locale: string): LocaleDuplicates {
  const base = stringsDir(root, locale);
  return {
    locale,
    files: SCAN_TARGETS.map(([filename, layout]) => scanFile(path.join(base, filename), layout)),
  };
}

/** Keep only string values; anything else collapses to `""`. */
function toStringMap(data: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    flat[key] = typeof value === "string" ? value : "";
  }
  return flat;
}

function sortByCountDesc(counts: Record<string, number>): Array<[string, number]> {
  const entries = Object.entries(counts);
  entries.sort(([leftKey, leftCount], [rightKey, rightCount]) =>
    rightCount - leftCount || compareStrings(leftKey, rightKey),
  );
  return entries;
}
