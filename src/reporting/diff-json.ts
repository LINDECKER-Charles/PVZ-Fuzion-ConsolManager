/** JSON diff files, written next to the Markdown reports. */

import type { AlmanacEntry, StringEntry, TravelBuffEntry } from "../core/models";
import { type LocaleTarget, formatJson, writeLocaleFile } from "./output";

/** Which collection key an almanac diff nests its entries under. */
interface AlmanacDiffSpec {
  rootKey: string;
  filename: string;
}

const PLANTS_SPEC: AlmanacDiffSpec = { rootKey: "plants", filename: "plants_diff.json" };
const ZOMBIES_SPEC: AlmanacDiffSpec = { rootKey: "zombies", filename: "zombies_diff.json" };
const ACHIEVEMENTS_SPEC: AlmanacDiffSpec = {
  rootKey: "achievements",
  filename: "achievements_diff.json",
};

/** `json.dump(..., indent=2)` writes no trailing newline; the Python port added one. */
function writeJsonFile(target: LocaleTarget, filename: string, data: unknown): string {
  return writeLocaleFile(target, filename, `${formatJson(data)}\n`);
}

function writeAlmanacDiff(
  spec: AlmanacDiffSpec,
  entries: readonly AlmanacEntry[],
  target: LocaleTarget,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  return writeJsonFile(target, spec.filename, {
    [spec.rootKey]: entries.map((entry) => entry.raw),
  });
}

export function buildPlantsDiff(
  plants: readonly AlmanacEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeAlmanacDiff(PLANTS_SPEC, plants, { localization, reportsRoot });
}

export function buildZombiesDiff(
  zombies: readonly AlmanacEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeAlmanacDiff(ZOMBIES_SPEC, zombies, { localization, reportsRoot });
}

export function buildAchievementsDiff(
  achievements: readonly AlmanacEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeAlmanacDiff(ACHIEVEMENTS_SPEC, achievements, { localization, reportsRoot });
}

function writeFlatDiff(
  filename: string,
  entries: readonly StringEntry[],
  target: LocaleTarget,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  const data: Record<string, string> = {};
  for (const entry of entries) {
    data[entry.key] = entry.source ?? "";
  }
  return writeJsonFile(target, filename, data);
}

export function buildStringsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatDiff("strings_diff.json", entries, { localization, reportsRoot });
}

export function buildRegexsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatDiff("regexs_diff.json", entries, { localization, reportsRoot });
}

export function buildTipsIzDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatDiff("tips_iz_diff.json", entries, { localization, reportsRoot });
}

export function buildTipsFsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatDiff("tips_fs_diff.json", entries, { localization, reportsRoot });
}

export function buildAbyssBuffsDiff(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatDiff("abyss_buffs_diff.json", entries, { localization, reportsRoot });
}

/**
 * Restore the nested source shape from the flattened entries.
 *
 * For example, `advancedBuffs:0` becomes `{ advancedBuffs: { "0": raw } }`.
 */
export function buildTravelBuffsDiff(
  entries: readonly TravelBuffEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  const data: Record<string, Record<string, unknown>> = {};
  for (const entry of entries) {
    data[entry.category] ??= {};
    data[entry.category][entry.id] = entry.raw;
  }
  return writeJsonFile({ localization, reportsRoot }, "travel_buffs_diff.json", data);
}
