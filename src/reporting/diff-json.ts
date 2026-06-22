/** JSON diff generation — faithful port of `reporting/diff_json.py`. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { AlmanacEntry, StringEntry } from "../core/models";

function localeDir(reportsRoot: string, localization: string): string {
  const dir = path.join(String(reportsRoot), localization);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Replicate `json.dump(data, f, ensure_ascii=False, indent=2)` followed by a
 * trailing `f.write("\n")`.
 */
function writeJsonFile(outPath: string, data: unknown): string {
  writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", { encoding: "utf-8" });
  console.log(`✅ Diff generated: ${outPath}`);
  return outPath;
}

// ---------- almanac diffs (plants, zombies, achievements) ---------------------

function buildAlmanacDiff(
  entries: readonly AlmanacEntry[],
  localization: string,
  reportsRoot: string,
  rootKey: string,
  filename: string,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  const outPath = path.join(localeDir(reportsRoot, localization), filename);
  return writeJsonFile(outPath, { [rootKey]: entries.map((entry) => entry.raw) });
}

export function buildPlantsDiff(
  plants: readonly AlmanacEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return buildAlmanacDiff(plants, localization, reportsRoot, "plants", "plants_diff.json");
}

export function buildZombiesDiff(
  zombies: readonly AlmanacEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return buildAlmanacDiff(zombies, localization, reportsRoot, "zombies", "zombies_diff.json");
}

export function buildAchievementsDiff(
  achievements: readonly AlmanacEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return buildAlmanacDiff(
    achievements,
    localization,
    reportsRoot,
    "achievements",
    "achievements_diff.json",
  );
}

// ---------- flat key/value diffs ----------------------------------------------

function buildFlatDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
  filename: string,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  const outPath = path.join(localeDir(reportsRoot, localization), filename);
  const data: Record<string, string> = {};
  for (const e of entries) {
    data[e.key] = e.source !== null ? e.source : "";
  }
  return writeJsonFile(outPath, data);
}

export function buildStringsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return buildFlatDiff(entries, localization, reportsRoot, "strings_diff.json");
}

export function buildRegexsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return buildFlatDiff(entries, localization, reportsRoot, "regexs_diff.json");
}

export function buildTipsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
  kind: string,
): string | null {
  return buildFlatDiff(entries, localization, reportsRoot, `tips_${kind}_diff.json`);
}

export function buildAbyssBuffsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return buildFlatDiff(entries, localization, reportsRoot, "abyss_buffs_diff.json");
}

// ---------- nested diff (travel buffs) ----------------------------------------

/**
 * Restore the nested `{category: {key: source_value}}` shape.
 *
 * `parsers.strings._flatten_nested` collapses keys to `category:key`; we split
 * on the first `:` to rebuild the original two-level dict.
 */
export function buildTravelBuffsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  const outPath = path.join(localeDir(reportsRoot, localization), "travel_buffs_diff.json");
  const data: Record<string, Record<string, string>> = {};
  for (const e of entries) {
    // Mirror Python's str.partition(":"): split on the FIRST ":" only.
    const idx = e.key.indexOf(":");
    let category: string;
    let key: string;
    if (idx === -1) {
      category = "";
      key = e.key;
    } else {
      category = e.key.slice(0, idx);
      key = e.key.slice(idx + 1);
    }
    if (!(category in data)) {
      data[category] = {};
    }
    data[category]![key] = e.source !== null ? e.source : "";
  }
  return writeJsonFile(outPath, data);
}
