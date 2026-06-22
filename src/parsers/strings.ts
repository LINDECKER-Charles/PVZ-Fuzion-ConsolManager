import { existsSync } from "node:fs";
import path from "node:path";

import type { StringEntry } from "../core/models";
import { loadJson, sourceStringsPath, stringsDir } from "./loaders";

export const STRINGS_FILE = "translation_strings.json";
export const REGEXS_FILE = "translation_regexs.json";
export const TIPS_IZ_FILE = "tips_iz.json";
export const TIPS_FS_FILE = "tips_fs.json";
export const ABYSS_BUFFS_FILE = "abyss_buffs.json";
export const TRAVEL_BUFFS_FILE = "travel_buffs.json";

type FlatDict = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Python truthiness for the values handled here (str / None / numbers). */
function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "boolean") return value;
  return true;
}

function loadFlat(filePath: string): FlatDict {
  const data = loadJson(filePath);
  return isRecord(data) ? data : {};
}

/**
 * Flatten `{category: {id: value}}` to `{category:id: value}`.
 *
 * Top-level entries whose value isn't a dict are skipped — the game's
 * `travel_buffs.json` is strictly two levels deep.
 */
export function flattenNested(data: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [category, entries] of Object.entries(data)) {
    if (!isRecord(entries)) continue;
    for (const [key, value] of Object.entries(entries)) {
      flat[`${category}:${key}`] = typeof value === "string" ? value : "";
    }
  }
  return flat;
}

/** Keys present in `source` that are missing or empty in `target`. */
function diff(source: FlatDict, target: FlatDict): StringEntry[] {
  const entries: StringEntry[] = [];
  for (const [key, srcValue] of Object.entries(source)) {
    if (!(key in target)) {
      entries.push({ key, source: srcValue as string | null, target: null, status: "missing" });
      continue;
    }
    const tgtValue = target[key];
    if (!isTruthy(tgtValue) && isTruthy(srcValue)) {
      entries.push({ key, source: srcValue as string | null, target: "", status: "empty" });
    }
  }
  return entries;
}

export function diffFile(
  root: string,
  sourceLocale: string,
  targetLocale: string,
  filename: string,
): StringEntry[] {
  const src = loadFlat(sourceStringsPath(root, sourceLocale, filename));
  const tgt = loadFlat(path.join(stringsDir(root, targetLocale), filename));
  return diff(src, tgt);
}

export function diffNestedFile(
  root: string,
  sourceLocale: string,
  targetLocale: string,
  filename: string,
): StringEntry[] {
  const srcRaw = loadJson(sourceStringsPath(root, sourceLocale, filename));
  const tgtRaw = loadJson(path.join(stringsDir(root, targetLocale), filename));
  return diff(
    flattenNested(isRecord(srcRaw) ? srcRaw : {}),
    flattenNested(isRecord(tgtRaw) ? tgtRaw : {}),
  );
}

export function diffStrings(root: string, sourceLocale: string, targetLocale: string): StringEntry[] {
  return diffFile(root, sourceLocale, targetLocale, STRINGS_FILE);
}

export function diffRegexs(root: string, sourceLocale: string, targetLocale: string): StringEntry[] {
  return diffFile(root, sourceLocale, targetLocale, REGEXS_FILE);
}

export function diffTipsIz(root: string, sourceLocale: string, targetLocale: string): StringEntry[] {
  return diffFile(root, sourceLocale, targetLocale, TIPS_IZ_FILE);
}

export function diffTipsFs(root: string, sourceLocale: string, targetLocale: string): StringEntry[] {
  return diffFile(root, sourceLocale, targetLocale, TIPS_FS_FILE);
}

export function diffAbyssBuffs(root: string, sourceLocale: string, targetLocale: string): StringEntry[] {
  return diffFile(root, sourceLocale, targetLocale, ABYSS_BUFFS_FILE);
}

export function diffTravelBuffs(root: string, sourceLocale: string, targetLocale: string): StringEntry[] {
  return diffNestedFile(root, sourceLocale, targetLocale, TRAVEL_BUFFS_FILE);
}

export function stringsFileExists(root: string, locale: string, filename: string): boolean {
  return existsSync(path.join(stringsDir(root, locale), filename));
}
