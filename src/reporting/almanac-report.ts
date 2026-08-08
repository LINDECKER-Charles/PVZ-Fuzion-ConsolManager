/** Markdown reports for the almanac entities: plants, zombies, achievements. */

import type { Achievement, AlmanacEntry, Plant, Zombie } from "../core/models";
import {
  GENERATED_BY_LINE,
  type LocaleTarget,
  formatJson,
  localizationLine,
  writeLocaleFile,
} from "./output";

interface AlmanacSpec {
  headerEmoji: string;
  title: string;
  entryEmoji: string;
  filename: string;
}

const PLANT_SPEC: AlmanacSpec = {
  headerEmoji: "\u{1f331}",
  title: "Missing Plant Translations",
  entryEmoji: "\u{1fab4}",
  filename: "missing_plants.md",
};
const ZOMBIE_SPEC: AlmanacSpec = {
  headerEmoji: "\u{1f9df}",
  title: "Missing Zombie Translations",
  entryEmoji: "\u{1f9e0}",
  filename: "missing_zombies.md",
};
const ACHIEVEMENT_SPEC: AlmanacSpec = {
  headerEmoji: "\u{1f3c6}",
  title: "Missing Achievement Translations",
  entryEmoji: "\u{1f947}",
  filename: "missing_achievements.md",
};

const COPY_INSTRUCTIONS =
  "Each entry below is printed as it appears in the source translation file — " +
  "copy the block, translate the values, and paste it into the locale file.\n\n";

function renderHeader(spec: AlmanacSpec, entries: readonly AlmanacEntry[], locale: string): string {
  const upper = locale.toUpperCase();
  return (
    `# ${spec.headerEmoji} ${spec.title}\n\n` +
    localizationLine(locale) +
    `> **Total missing entries:** \`${entries.length}\`  \n` +
    GENERATED_BY_LINE +
    "---\n\n## \u{1f4d1} Summary\n\n" +
    `There are **${entries.length}** entries missing in the \`${upper}\` translation.\n\n` +
    COPY_INSTRUCTIONS +
    "---\n\n## \u{1f480} Missing Entries\n\n"
  );
}

function renderEntry(spec: AlmanacSpec, entry: AlmanacEntry): string {
  const name = entry.name || "Name missing";
  return (
    `### ${spec.entryEmoji} \`${name}\` — id \`${entry.id}\`\n\n` +
    "```json\n" +
    formatJson(entry.raw) +
    "\n```\n\n---\n\n"
  );
}

/** Write the report, or return `null` when there is nothing missing. */
function writeAlmanacReport(
  spec: AlmanacSpec,
  entries: readonly AlmanacEntry[],
  target: LocaleTarget,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  const body =
    renderHeader(spec, entries, target.localization) +
    entries.map((entry) => renderEntry(spec, entry)).join("");
  return writeLocaleFile(target, spec.filename, body);
}

export function buildPlantReport(
  plants: readonly Plant[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeAlmanacReport(PLANT_SPEC, plants, { localization, reportsRoot });
}

export function buildZombieReport(
  zombies: readonly Zombie[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeAlmanacReport(ZOMBIE_SPEC, zombies, { localization, reportsRoot });
}

export function buildAchievementReport(
  achievements: readonly Achievement[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeAlmanacReport(ACHIEVEMENT_SPEC, achievements, { localization, reportsRoot });
}
