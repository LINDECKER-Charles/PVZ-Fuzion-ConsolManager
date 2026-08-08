import { existsSync } from "node:fs";
import path from "node:path";

import { isRecord } from "../core/guards";
import type { StringEntry, TravelBuffEntry } from "../core/models";
import { loadJson, sourceStringsPath, stringsDir } from "./loaders";

export const STRINGS_FILE = "translation_strings.json";
export const REGEXS_FILE = "translation_regexs.json";
export const TIPS_IZ_FILE = "tips_iz.json";
export const TIPS_FS_FILE = "tips_fs.json";
export const ABYSS_BUFFS_FILE = "abyss_buffs.json";
export const TRAVEL_BUFFS_FILE = "travel_buffs.json";

/** Separator joining nested keys into a flat path (`category:id:field`). */
const KEY_SEPARATOR = ":";

type FlatDict = Record<string, unknown>;

/** The two locales a diff compares, plus the project they live in. */
interface DiffScope {
  root: string;
  sourceLocale: string;
  targetLocale: string;
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
 * Flatten nested string leaves to colon-delimited paths.
 *
 * Supports legacy `{category: {id: value}}` data and the current
 * `{category: {id: {name, desc}}}` format. Non-object top-level values are skipped.
 */
export function flattenNested(data: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};

  function visit(node: Record<string, unknown>, keyPath: string[]): void {
    for (const [key, value] of Object.entries(node)) {
      const leafPath = [...keyPath, key];
      if (isRecord(value)) {
        visit(value, leafPath);
      } else {
        flat[leafPath.join(KEY_SEPARATOR)] = typeof value === "string" ? value : "";
      }
    }
  }

  for (const [category, entries] of Object.entries(data)) {
    if (isRecord(entries)) visit(entries, [category]);
  }
  return flat;
}

/** Keys present in `source` that are missing or empty in `target`. */
function diff(source: FlatDict, target: FlatDict): StringEntry[] {
  const entries: StringEntry[] = [];
  for (const [key, sourceValue] of Object.entries(source)) {
    if (!(key in target)) {
      entries.push({ key, source: sourceValue as string | null, target: null, status: "missing" });
      continue;
    }
    if (!isTruthy(target[key]) && isTruthy(sourceValue)) {
      entries.push({ key, source: sourceValue as string | null, target: "", status: "empty" });
    }
  }
  return entries;
}

function targetPath(scope: DiffScope, filename: string): string {
  return path.join(stringsDir(scope.root, scope.targetLocale), filename);
}

function sourcePath(scope: DiffScope, filename: string): string {
  return sourceStringsPath(scope.root, scope.sourceLocale, filename);
}

function diffFile(scope: DiffScope, filename: string): StringEntry[] {
  return diff(loadFlat(sourcePath(scope, filename)), loadFlat(targetPath(scope, filename)));
}

function loadNested(filePath: string): Record<string, unknown> {
  const raw = loadJson(filePath);
  return isRecord(raw) ? raw : {};
}

export function diffStrings(root: string, sourceLocale: string, target: string): StringEntry[] {
  return diffFile({ root, sourceLocale, targetLocale: target }, STRINGS_FILE);
}

export function diffRegexs(root: string, sourceLocale: string, target: string): StringEntry[] {
  return diffFile({ root, sourceLocale, targetLocale: target }, REGEXS_FILE);
}

export function diffTipsIz(root: string, sourceLocale: string, target: string): StringEntry[] {
  return diffFile({ root, sourceLocale, targetLocale: target }, TIPS_IZ_FILE);
}

export function diffTipsFs(root: string, sourceLocale: string, target: string): StringEntry[] {
  return diffFile({ root, sourceLocale, targetLocale: target }, TIPS_FS_FILE);
}

export function diffAbyssBuffs(root: string, sourceLocale: string, target: string): StringEntry[] {
  return diffFile({ root, sourceLocale, targetLocale: target }, ABYSS_BUFFS_FILE);
}

/** Display name of a travel buff, across the legacy and current formats. */
function travelBuffName(raw: unknown): string | null {
  if (isRecord(raw) && typeof raw.name === "string") return raw.name;
  return typeof raw === "string" ? raw : null;
}

/** Buffs of one category present in `source` whose ID is absent from `target`. */
function missingBuffsInCategory(
  category: string,
  source: Record<string, unknown>,
  target: Record<string, unknown>,
): TravelBuffEntry[] {
  const entries: TravelBuffEntry[] = [];
  for (const [id, raw] of Object.entries(source)) {
    if (Object.hasOwn(target, id)) continue;
    entries.push({
      key: `${category}${KEY_SEPARATOR}${id}`,
      category,
      id,
      raw,
      source: travelBuffName(raw),
      target: null,
      status: "missing",
    });
  }
  return entries;
}

export function diffTravelBuffs(
  root: string,
  sourceLocale: string,
  targetLocale: string,
): TravelBuffEntry[] {
  const scope: DiffScope = { root, sourceLocale, targetLocale };
  const source = loadNested(sourcePath(scope, TRAVEL_BUFFS_FILE));
  const target = loadNested(targetPath(scope, TRAVEL_BUFFS_FILE));

  const entries: TravelBuffEntry[] = [];
  for (const [category, sourceGroup] of Object.entries(source)) {
    if (!isRecord(sourceGroup)) continue;
    const targetGroup = isRecord(target[category]) ? target[category] : {};
    entries.push(...missingBuffsInCategory(category, sourceGroup, targetGroup));
  }
  return entries;
}

export function stringsFileExists(root: string, locale: string, filename: string): boolean {
  return existsSync(path.join(stringsDir(root, locale), filename));
}
