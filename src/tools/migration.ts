import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isObjectLike, isRecord } from "../core/guards";
import { DUMPS_DIRNAME, loadJson, stringsDir } from "../parsers/loaders";
import {
  ABYSS_BUFFS_FILE,
  TIPS_FS_FILE,
  TIPS_IZ_FILE,
  TRAVEL_BUFFS_FILE,
} from "../parsers/strings";

export const TRANSLATION_STRINGS_FILE = "translation_strings.json";
export const ABYSS_DUMP_FILE = "AbyssBuffData.json";

export const CUSTOMLEVEL_STRINGS_FILE = "customlevel_strings.json";
export const CUSTOMLEVEL_REGEXS_FILE = "customlevel_regexs.json";
export const CUSTOM_LEVEL_DATA_FILE = "custom_level_data.json";

/** UTF-8-SIG BOM prepended to written files (the game reads them this way). */
const BOM = "﻿";
/** Indentation the game's own locale files use. */
const JSON_INDENT = 4;

export type FileStatus = "created" | "skippedExists" | "sourceMissing";

export interface FileMigrationResult {
  filename: string;
  status: FileStatus;
  /** Entries actually written (translation found in translation_strings.json). */
  migrated: number;
  /** Translatable entries offered by the source (upper bound of `migrated`). */
  available: number;
}

export interface MigrationResult {
  locale: string;
  files: FileMigrationResult[];
}

/** One translatable entry: where to place it in the dest tree + the text to look up. */
interface SourceEntry {
  /** Nested key path in the destination object (length 1 = flat). */
  path: string[];
  /** Source (Chinese) string, looked up in the locale's translation_strings.json. */
  text: string;
}

/** A migration target: a destination filename + how to enumerate its source entries. */
interface Target {
  filename: string;
  /** Source entries, or `null` when the source file is absent. */
  extract(): SourceEntry[] | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function loadObject(filePath: string): Record<string, unknown> {
  const data = loadJson(filePath);
  return isRecord(data) ? data : {};
}

function loadTranslationStrings(root: string, locale: string): Record<string, string> {
  const obj = loadObject(path.join(stringsDir(root, locale), TRANSLATION_STRINGS_FILE));
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

// ---- source extractors -----------------------------------------------------

/** `{ key: chineseText }` → entry per pair, dest keyed by the original key. */
function extractKeyedPairs(filePath: string): SourceEntry[] | null {
  if (!existsSync(filePath)) return null;
  const entries: SourceEntry[] = [];
  for (const [key, value] of Object.entries(loadObject(filePath))) {
    const text = asString(value);
    if (text !== null) entries.push({ path: [key], text });
  }
  return entries;
}

/** `{ infos: { idx: { name, introduce } } }` → flat dest keyed by the Chinese string itself. */
function extractAbyss(filePath: string): SourceEntry[] | null {
  if (!existsSync(filePath)) return null;
  const root = loadObject(filePath);
  const infos = isObjectLike(root.infos) ? root.infos : {};
  const entries: SourceEntry[] = [];
  for (const info of Object.values(infos)) {
    if (!isRecord(info)) continue;
    for (const field of ["name", "introduce"] as const) {
      const text = asString(info[field]);
      if (text !== null && text.length > 0) entries.push({ path: [text], text });
    }
  }
  return entries;
}

/** Recursively extract travel-buff string leaves while preserving their paths. */
function extractNested(filePath: string): SourceEntry[] | null {
  if (!existsSync(filePath)) return null;
  const entries: SourceEntry[] = [];

  function visit(node: Record<string, unknown>, currentPath: string[]): void {
    for (const [key, value] of Object.entries(node)) {
      const leafPath = [...currentPath, key];
      if (isRecord(value)) {
        visit(value, leafPath);
        continue;
      }
      const text = asString(value);
      if (text !== null && text.length > 0) entries.push({ path: leafPath, text });
    }
  }

  for (const [category, group] of Object.entries(loadObject(filePath))) {
    if (isRecord(group)) visit(group, [category]);
  }
  return entries;
}

/** A file keyed by the Chinese source string — dest mirrors the same keys. */
function extractFlatKeys(filePath: string): SourceEntry[] | null {
  if (!existsSync(filePath)) return null;
  return Object.keys(loadObject(filePath)).map((key) => ({ path: [key], text: key }));
}

/** `{ levelId: { name, startTip } }` → translate the `name`/`startTip` fields. */
function extractCustomLevelData(filePath: string): SourceEntry[] | null {
  if (!existsSync(filePath)) return null;
  const entries: SourceEntry[] = [];
  for (const [levelId, meta] of Object.entries(loadObject(filePath))) {
    if (!isRecord(meta)) continue;
    for (const field of ["name", "startTip"] as const) {
      const text = asString(meta[field]);
      if (text !== null && text.length > 0) entries.push({ path: [levelId, field], text });
    }
  }
  return entries;
}

// ---- core ------------------------------------------------------------------

/**
 * Build the destination object, keeping only entries whose source text has a
 * translation in `translationStrings`. Not-found entries are omitted (a later
 * diff surfaces them); empty parents never materialise.
 */
function buildTree(
  entries: SourceEntry[],
  translationStrings: Record<string, string>,
): { tree: Record<string, unknown>; migrated: number } {
  const tree: Record<string, unknown> = {};
  let migrated = 0;
  for (const { path: keys, text } of entries) {
    const translation = translationStrings[text];
    if (translation === undefined) continue;
    let node = tree;
    for (let i = 0; i < keys.length - 1; i++) {
      const segment = keys[i];
      if (!isRecord(node[segment])) node[segment] = {};
      node = node[segment] as Record<string, unknown>;
    }
    node[keys[keys.length - 1]] = translation;
    migrated++;
  }
  return { tree, migrated };
}

/**
 * Run a set of migration targets for one locale.
 *
 * Per file:
 *   - destination already present  → skip (never overwrite a translator's work);
 *   - source file absent           → skip with a `sourceMissing` marker;
 *   - otherwise                    → write the translated subset (possibly an
 *     empty `{}` when nothing is translated yet), so the file exists for diffing.
 */
function runMigration(root: string, locale: string, targets: Target[]): MigrationResult {
  const translationStrings = loadTranslationStrings(root, locale);
  const destDir = stringsDir(root, locale);
  return {
    locale,
    files: targets.map((target) => migrateTarget(target, destDir, translationStrings)),
  };
}

function skipped(filename: string, status: FileStatus): FileMigrationResult {
  return { filename, status, migrated: 0, available: 0 };
}

function migrateTarget(
  target: Target,
  destDir: string,
  translationStrings: Record<string, string>,
): FileMigrationResult {
  const destPath = path.join(destDir, target.filename);
  if (existsSync(destPath)) {
    return skipped(target.filename, "skippedExists");
  }

  const entries = target.extract();
  if (entries === null) {
    return skipped(target.filename, "sourceMissing");
  }

  const { tree, migrated } = buildTree(entries, translationStrings);
  mkdirSync(destDir, { recursive: true });
  writeFileSync(destPath, BOM + JSON.stringify(tree, null, JSON_INDENT), { encoding: "utf-8" });
  return { filename: target.filename, status: "created", migrated, available: entries.length };
}

/**
 * Migrate the tip and buff files for `locale` from the raw `Dumps/`:
 * `tips_iz.json`, `tips_fs.json`, `abyss_buffs.json`, `travel_buffs.json`.
 */
export function migrateTipsAndBuffs(root: string, locale: string): MigrationResult {
  const dumps = path.join(root, DUMPS_DIRNAME);
  return runMigration(root, locale, [
    { filename: TIPS_IZ_FILE, extract: () => extractKeyedPairs(path.join(dumps, TIPS_IZ_FILE)) },
    { filename: TIPS_FS_FILE, extract: () => extractKeyedPairs(path.join(dumps, TIPS_FS_FILE)) },
    { filename: ABYSS_BUFFS_FILE, extract: () => extractAbyss(path.join(dumps, ABYSS_DUMP_FILE)) },
    {
      filename: TRAVEL_BUFFS_FILE,
      extract: () => extractNested(path.join(dumps, TRAVEL_BUFFS_FILE)),
    },
  ]);
}

/**
 * Migrate the custom-level files for `locale`. The `Dumps/` folder has no
 * complete source for these, so the key set is taken from a reference locale
 * (`sourceLocale`, the configured source — defaults to English); values are
 * still pulled from `locale`'s own `translation_strings.json`.
 */
export function migrateCustomLevels(
  root: string,
  locale: string,
  sourceLocale: string,
): MigrationResult {
  const refDir = stringsDir(root, sourceLocale);
  return runMigration(root, locale, [
    {
      filename: CUSTOMLEVEL_STRINGS_FILE,
      extract: () => extractFlatKeys(path.join(refDir, CUSTOMLEVEL_STRINGS_FILE)),
    },
    {
      filename: CUSTOMLEVEL_REGEXS_FILE,
      extract: () => extractFlatKeys(path.join(refDir, CUSTOMLEVEL_REGEXS_FILE)),
    },
    {
      filename: CUSTOM_LEVEL_DATA_FILE,
      extract: () => extractCustomLevelData(path.join(refDir, CUSTOM_LEVEL_DATA_FILE)),
    },
  ]);
}
