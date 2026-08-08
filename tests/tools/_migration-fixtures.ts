/** Shared assertions for the migration tests. */

import { readFileSync } from "node:fs";
import path from "node:path";
import { expect } from "vitest";

import type { FileMigrationResult, MigrationResult } from "../../src/tools/migration";

export const ABYSS_DUMP_FILE = "AbyssBuffData.json";
export const CUSTOMLEVEL_STRINGS_FILE = "customlevel_strings.json";
export const CUSTOMLEVEL_REGEXS_FILE = "customlevel_regexs.json";
export const CUSTOM_LEVEL_DATA_FILE = "custom_level_data.json";

const BYTE_ORDER_MARK = 0xfeff;
const GENERATED_INDENT = 4;

export function stringsPath(root: string, locale: string, filename: string): string {
  return path.join(root, "Localization", locale, "Strings", filename);
}

/** Read a generated file: assert BOM + 4-space indent, return the parsed object. */
export function readGenerated(
  root: string,
  locale: string,
  filename: string,
): Record<string, unknown> {
  const raw = readFileSync(stringsPath(root, locale, filename), "utf-8");
  expect(raw.charCodeAt(0)).toBe(BYTE_ORDER_MARK);
  const body = raw.slice(1);
  const parsed = JSON.parse(body) as Record<string, unknown>;
  // JSON.stringify(obj, null, 4): re-serialising must round-trip byte-for-byte.
  expect(body).toBe(JSON.stringify(parsed, null, GENERATED_INDENT));
  return parsed;
}

export function fileResult(result: MigrationResult, filename: string): FileMigrationResult {
  const found = result.files.find((file) => file.filename === filename);
  if (!found) throw new Error(`no file result for ${filename}`);
  return found;
}
