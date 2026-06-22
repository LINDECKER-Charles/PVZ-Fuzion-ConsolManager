/** Markdown report generation — faithful port of `reporting/markdown.py`. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { Achievement, AlmanacEntry, Plant, StringEntry, Zombie } from "../core/models";
import type { FileDuplicates, LocaleDuplicates } from "../tools/duplicate-checker";

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

function localeDir(reportsRoot: string, localization: string): string {
  const dir = path.join(String(reportsRoot), localization);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Replicate Python's `json.dumps(obj, ensure_ascii=False, indent=2)`.
 * `JSON.stringify(obj, null, 2)` uses the same `": "` key separator and
 * `,\n` item separator with no trailing whitespace, matching CPython exactly.
 */
function jsonDumpsIndent2(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function writeAlmanac(
  spec: AlmanacSpec,
  entries: readonly AlmanacEntry[],
  localization: string,
  reportsRoot: string,
): void {
  if (entries.length === 0) {
    return;
  }
  const outPath = path.join(localeDir(reportsRoot, localization), spec.filename);

  let body = "";
  body += `# ${spec.headerEmoji} ${spec.title}\n\n`;
  body += `> **Localization:** \`${localization.toUpperCase()}\`  \n`;
  body += `> **Total missing entries:** \`${entries.length}\`  \n`;
  body += "> **Generated automatically by PVZ Fuzion Console Manager** \u{1f9e9}\n\n";
  body += "---\n\n";
  body += "## \u{1f4d1} Summary\n\n";
  body += `There are **${entries.length}** entries missing in the \`${localization.toUpperCase()}\` translation.\n\n`;
  body +=
    "Each entry below is printed as it appears in the source translation file — " +
    "copy the block, translate the values, and paste it into the locale file.\n\n";
  body += "---\n\n";
  body += "## \u{1f480} Missing Entries\n\n";

  for (const entry of entries) {
    const name = entry.name || "Name missing";
    body += `### ${spec.entryEmoji} \`${name}\` — id \`${entry.id}\`\n\n`;
    body += "```json\n";
    body += jsonDumpsIndent2(entry.raw);
    body += "\n```\n\n---\n\n";
  }

  writeFileSync(outPath, body, { encoding: "utf-8" });
  console.log(`✅ Report generated: ${outPath}`);
}

export function buildPlantReport(
  plants: readonly Plant[],
  localization: string,
  reportsRoot: string,
): void {
  writeAlmanac(PLANT_SPEC, plants, localization, reportsRoot);
}

export function buildZombieReport(
  zombies: readonly Zombie[],
  localization: string,
  reportsRoot: string,
): void {
  writeAlmanac(ZOMBIE_SPEC, zombies, localization, reportsRoot);
}

export function buildAchievementReport(
  achievements: readonly Achievement[],
  localization: string,
  reportsRoot: string,
): void {
  writeAlmanac(ACHIEVEMENT_SPEC, achievements, localization, reportsRoot);
}

// ---------- flat key/value reports (strings, regex, tips, buffs) --------------

function mdCell(text: string | null): string {
  if (text === null) {
    return "";
  }
  return text.replace(/\|/g, "\\|").replace(/\r/g, "").replace(/\n/g, " ⏎ ");
}

function writeFlatReport(
  emoji: string,
  title: string,
  filename: string,
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): void {
  if (entries.length === 0) {
    return;
  }
  const outPath = path.join(localeDir(reportsRoot, localization), filename);

  const missing = entries.filter((e) => e.status === "missing");
  const empty = entries.filter((e) => e.status === "empty");

  let body = "";
  body += `# ${emoji} ${title}\n\n`;
  body += `> **Localization:** \`${localization.toUpperCase()}\`  \n`;
  body += `> **Missing keys:** \`${missing.length}\` — **Empty values:** \`${empty.length}\`  \n`;
  body += `> **Total entries to fix:** \`${entries.length}\`  \n`;
  body += "> **Generated automatically by PVZ Fuzion Console Manager** \u{1f9e9}\n\n";
  body += "---\n\n";

  if (missing.length > 0) {
    body += `## ❌ Missing Keys (${missing.length})\n\n`;
    body += "```json\n";
    const obj: Record<string, string | null> = {};
    for (const e of missing) {
      obj[e.key] = e.source;
    }
    body += jsonDumpsIndent2(obj);
    body += "\n```\n\n---\n\n";
  }

  if (empty.length > 0) {
    body += `## ⚠️ Empty Values (${empty.length})\n\n`;
    body += "| Key | Source (English) |\n";
    body += "| --- | --- |\n";
    for (const e of empty) {
      body += `| \`${mdCell(e.key)}\` | ${mdCell(e.source)} |\n`;
    }
    body += "\n";
  }

  writeFileSync(outPath, body, { encoding: "utf-8" });
  console.log(`✅ Report generated: ${outPath}`);
}

export function buildStringsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): void {
  writeFlatReport(
    "\u{1f4dd}",
    "Missing UI String Translations",
    "missing_strings.md",
    entries,
    localization,
    reportsRoot,
  );
}

export function buildRegexsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): void {
  writeFlatReport(
    "\u{1f524}",
    "Missing Regex Translations",
    "missing_regexs.md",
    entries,
    localization,
    reportsRoot,
  );
}

export function buildTipsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
  kind: string,
): void {
  const labels: Record<string, string> = { iz: "I, Zombie", fs: "Fusion Showcase" };
  const label = labels[kind];
  if (label === undefined) {
    throw new Error(kind);
  }
  writeFlatReport(
    "\u{1f4cc}",
    `Missing Tips Translations (${label})`,
    `missing_tips_${kind}.md`,
    entries,
    localization,
    reportsRoot,
  );
}

export function buildAbyssBuffsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): void {
  writeFlatReport(
    "\u{1f30a}",
    "Missing Abyss Buff Translations",
    "missing_abyss_buffs.md",
    entries,
    localization,
    reportsRoot,
  );
}

export function buildTravelBuffsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): void {
  writeFlatReport(
    "\u{1f9f3}",
    "Missing Travel Buff Translations",
    "missing_travel_buffs.md",
    entries,
    localization,
    reportsRoot,
  );
}

// ---------- duplicates report --------------------------------------------------

function hasAny(f: FileDuplicates): boolean {
  return f.duplicateKeys.length > 0 || f.duplicateValues.length > 0;
}

/**
 * Write `duplicates.md` for `result`. Returns the path, or `null` when the
 * locale is clean (no duplicates found in any scanned file).
 */
export function buildDuplicatesReport(
  result: LocaleDuplicates,
  reportsRoot: string,
): string | null {
  const localeHasAny = result.files.some(hasAny);
  if (!localeHasAny) {
    return null;
  }
  const totalDuplicateKeys = result.files.reduce((sum, f) => sum + f.duplicateKeys.length, 0);
  const totalDuplicateValues = result.files.reduce((sum, f) => sum + f.duplicateValues.length, 0);

  const outPath = path.join(localeDir(reportsRoot, result.locale), "duplicates.md");

  let body = "";
  body += "# \u{1f501} Duplicate translations\n\n";
  body += `> **Localization:** \`${result.locale.toUpperCase()}\`  \n`;
  body +=
    `> **Duplicate keys:** \`${totalDuplicateKeys}\` — ` +
    `**Repeated values:** \`${totalDuplicateValues}\`  \n`;
  body += "> **Generated automatically by PVZ Fuzion Console Manager** \u{1f9e9}\n\n";
  body += "---\n\n";

  for (const fd of result.files) {
    if (!hasAny(fd)) {
      continue;
    }
    body += `## \`${fd.filename}\`\n\n`;

    if (fd.duplicateKeys.length > 0) {
      body += `### ❌ Duplicate keys (${fd.duplicateKeys.length})\n\n`;
      body += "| Key | Occurrences |\n| --- | --- |\n";
      for (const [key, count] of fd.duplicateKeys) {
        body += `| \`${mdCell(key)}\` | ${count} |\n`;
      }
      body += "\n";
    }

    if (fd.duplicateValues.length > 0) {
      body += `### \u{1f501} Repeated values (${fd.duplicateValues.length})\n\n`;
      body += "| Value | Keys sharing it |\n| --- | --- |\n";
      for (const [value, keys] of fd.duplicateValues) {
        const keysCell = keys.map((k) => `\`${k}\``).join(", ");
        body += `| ${mdCell(value)} | ${mdCell(keysCell)} |\n`;
      }
      body += "\n";
    }

    body += "---\n\n";
  }

  writeFileSync(outPath, body, { encoding: "utf-8" });
  console.log(`✅ Report generated: ${outPath}`);
  return outPath;
}
