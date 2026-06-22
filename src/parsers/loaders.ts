import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const DUMPS_DIRNAME = "Dumps";
/** Sentinel used in settings to select the Dumps/ folder as source. */
export const DUMPS_SOURCE = "Dumps";

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

/**
 * Read a UTF-8-SIG JSON file.
 *
 * Missing files return an empty object so callers don't need to branch on
 * optional files across locales.
 */
export function loadJson(filePath: string): unknown {
  let text: string;
  try {
    text = readFileSync(filePath, { encoding: "utf-8" });
  } catch (e) {
    if (isNotFound(e)) return {};
    console.log(`✗ Error reading ${filePath}: ${describeError(e)}`);
    return {};
  }
  try {
    return JSON.parse(stripBom(text));
  } catch (e) {
    console.log(`✗ Error reading ${filePath}: ${describeError(e)}`);
    return {};
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function isNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as NodeJS.ErrnoException).code === "ENOENT";
}

function describeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function localizationRoot(root: string): string {
  return path.join(root, "Localization");
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
  return path.join(localizationRoot(root), locale, "Almanac");
}

export function stringsDir(root: string, locale: string): string {
  return path.join(localizationRoot(root), locale, "Strings");
}

export function isDumpsSource(source: string): boolean {
  return source === DUMPS_SOURCE;
}

/**
 * Resolve the Dumps/ path for a canonical Localization filename.
 *
 * When `mapping[filename]` is `null` the file has no Dumps equivalent;
 * we still return a (non-existent) path under Dumps/ so the `loadJson`
 * missing-file branch kicks in and produces an empty diff.
 */
function dumpsPath(root: string, filename: string, mapping: Record<string, string | null>): string {
  const mapped = filename in mapping ? mapping[filename] : filename;
  return path.join(dumpsRoot(root), mapped !== null && mapped !== undefined ? mapped : filename);
}

export function sourceAlmanacPath(root: string, source: string, filename: string): string {
  if (isDumpsSource(source)) {
    return dumpsPath(root, filename, ALMANAC_DUMP_FILENAMES);
  }
  return path.join(almanacDir(root, source), filename);
}

export function sourceStringsPath(root: string, source: string, filename: string): string {
  if (isDumpsSource(source)) {
    return dumpsPath(root, filename, STRINGS_DUMP_FILENAMES);
  }
  return path.join(stringsDir(root, source), filename);
}

/**
 * Whether the reference file exists for this source.
 *
 * `kind` is `"almanac"` or `"strings"`. Returns false for filenames that
 * have no Dumps equivalent (e.g. translation_strings.json).
 */
export function sourceHasFile(root: string, source: string, kind: string, filename: string): boolean {
  if (isDumpsSource(source)) {
    const mapping = kind === "almanac" ? ALMANAC_DUMP_FILENAMES : STRINGS_DUMP_FILENAMES;
    if ((filename in mapping ? mapping[filename] : filename) === null) {
      return false;
    }
  }
  const resolved =
    kind === "almanac"
      ? sourceAlmanacPath(root, source, filename)
      : sourceStringsPath(root, source, filename);
  return existsSync(resolved);
}
