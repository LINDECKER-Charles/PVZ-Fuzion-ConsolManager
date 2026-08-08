import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describeError, stripByteOrderMark } from "../core/text";
import { isFileNotFound } from "../core/guards";
import { reportNotice } from "../core/notices";

/** Folder holding the raw game dumps, next to `Localization/`. */
export const DUMPS_DIRNAME = "Dumps";
/**
 * Sentinel used in settings to select the dumps as diff source.
 *
 * Deliberately the folder name itself: picking `Dumps` in the source-locale
 * menu means "diff against `Dumps/`", so one value serves both roles.
 */
export const DUMPS_SOURCE = DUMPS_DIRNAME;

const LOCALIZATION_DIRNAME = "Localization";
const ALMANAC_DIRNAME = "Almanac";
const STRINGS_DIRNAME = "Strings";

/**
 * Filenames differ between Localization/<locale>/ and Dumps/.
 * These maps translate the canonical Localization filename used by parsers
 * into the name actually present in Dumps/. Entries missing from the map
 * keep the same name; entries mapped to `null` have no equivalent in Dumps/.
 */
const ALMANAC_DUMP_FILENAMES: Record<string, string | null> = {
  "LawnStringsTranslate.json": "LawnStrings.json",
  "ZombieStringsTranslate.json": "ZombieStrings.json",
  "AchievementsTextTranslate.json": "AchievementsText.json",
};
const STRINGS_DUMP_FILENAMES: Record<string, string | null> = {
  "abyss_buffs.json": "AbyssBuffData.json",
  "translation_strings.json": null,
  "translation_regexs.json": null,
};

type DumpFilenames = Record<string, string | null>;

/**
 * Read a UTF-8-SIG JSON file.
 *
 * Missing files return an empty object so callers don't need to branch on
 * optional files across locales; an unreadable or malformed one reports a
 * notice and does the same, so a single broken locale never aborts a scan.
 */
export function loadJson(filePath: string): unknown {
  let text: string;
  try {
    text = readFileSync(filePath, { encoding: "utf-8" });
  } catch (error) {
    if (isFileNotFound(error)) return {};
    reportNotice(`✗ Error reading ${filePath}: ${describeError(error)}`);
    return {};
  }
  try {
    return JSON.parse(stripByteOrderMark(text));
  } catch (error) {
    reportNotice(`✗ Error reading ${filePath}: ${describeError(error)}`);
    return {};
  }
}

function localizationRoot(root: string): string {
  return path.join(root, LOCALIZATION_DIRNAME);
}

function dumpsRoot(root: string): string {
  return path.join(root, DUMPS_DIRNAME);
}

export function listLocalizations(root: string): string[] {
  const folder = localizationRoot(root);
  return readdirSync(folder)
    .filter((name) => statSync(path.join(folder, name)).isDirectory())
    .sort();
}

export function almanacDir(root: string, locale: string): string {
  return path.join(localizationRoot(root), locale, ALMANAC_DIRNAME);
}

export function stringsDir(root: string, locale: string): string {
  return path.join(localizationRoot(root), locale, STRINGS_DIRNAME);
}

export function isDumpsSource(source: string): boolean {
  return source === DUMPS_SOURCE;
}

/** The name `filename` goes by inside `Dumps/`, or `null` when it has none. */
function dumpFilename(filename: string, mapping: DumpFilenames): string | null {
  return filename in mapping ? mapping[filename] : filename;
}

/**
 * Resolve the Dumps/ path for a canonical Localization filename.
 *
 * When the file has no Dumps equivalent we still return a (non-existent) path
 * under Dumps/ so the `loadJson` missing-file branch kicks in and produces an
 * empty diff.
 */
function dumpsPath(root: string, filename: string, mapping: DumpFilenames): string {
  return path.join(dumpsRoot(root), dumpFilename(filename, mapping) ?? filename);
}

export function sourceAlmanacPath(root: string, source: string, filename: string): string {
  return isDumpsSource(source)
    ? dumpsPath(root, filename, ALMANAC_DUMP_FILENAMES)
    : path.join(almanacDir(root, source), filename);
}

export function sourceStringsPath(root: string, source: string, filename: string): string {
  return isDumpsSource(source)
    ? dumpsPath(root, filename, STRINGS_DUMP_FILENAMES)
    : path.join(stringsDir(root, source), filename);
}

/** Whether the reference almanac file exists for this source. */
export function sourceAlmanacFileExists(root: string, source: string, filename: string): boolean {
  if (isDumpsSource(source) && dumpFilename(filename, ALMANAC_DUMP_FILENAMES) === null) {
    return false;
  }
  return existsSync(sourceAlmanacPath(root, source, filename));
}

/**
 * Whether the reference strings file exists for this source. Always false for
 * filenames with no Dumps equivalent (e.g. `translation_strings.json`).
 */
export function sourceStringsFileExists(root: string, source: string, filename: string): boolean {
  if (isDumpsSource(source) && dumpFilename(filename, STRINGS_DUMP_FILENAMES) === null) {
    return false;
  }
  return existsSync(sourceStringsPath(root, source, filename));
}
