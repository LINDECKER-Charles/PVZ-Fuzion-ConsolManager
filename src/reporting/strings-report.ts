/** Markdown reports for the flat key/value files: strings, regex, tips, buffs. */

import type { StringEntry, TravelBuffEntry } from "../core/models";
import {
  GENERATED_BY_LINE,
  type LocaleTarget,
  formatJson,
  localizationLine,
  markdownCell,
  writeLocaleFile,
} from "./output";

interface FlatReportSpec {
  emoji: string;
  title: string;
  filename: string;
}

const STRINGS_SPEC: FlatReportSpec = {
  emoji: "\u{1f4dd}",
  title: "Missing UI String Translations",
  filename: "missing_strings.md",
};
const REGEXS_SPEC: FlatReportSpec = {
  emoji: "\u{1f524}",
  title: "Missing Regex Translations",
  filename: "missing_regexs.md",
};
const TIPS_IZ_SPEC: FlatReportSpec = {
  emoji: "\u{1f4cc}",
  title: "Missing Tips Translations (I, Zombie)",
  filename: "missing_tips_iz.md",
};
const TIPS_FS_SPEC: FlatReportSpec = {
  emoji: "\u{1f4cc}",
  title: "Missing Tips Translations (Fusion Showcase)",
  filename: "missing_tips_fs.md",
};
const ABYSS_BUFFS_SPEC: FlatReportSpec = {
  emoji: "\u{1f30a}",
  title: "Missing Abyss Buff Translations",
  filename: "missing_abyss_buffs.md",
};

function renderHeader(
  spec: FlatReportSpec,
  counts: { missing: number; empty: number; total: number },
  localization: string,
): string {
  return (
    `# ${spec.emoji} ${spec.title}\n\n` +
    localizationLine(localization) +
    `> **Missing keys:** \`${counts.missing}\` — **Empty values:** \`${counts.empty}\`  \n` +
    `> **Total entries to fix:** \`${counts.total}\`  \n` +
    GENERATED_BY_LINE +
    "---\n\n"
  );
}

function renderMissingSection(missing: readonly StringEntry[]): string {
  if (missing.length === 0) {
    return "";
  }
  const sources: Record<string, string | null> = {};
  for (const entry of missing) {
    sources[entry.key] = entry.source;
  }
  return (
    `## ❌ Missing Keys (${missing.length})\n\n` +
    "```json\n" +
    formatJson(sources) +
    "\n```\n\n---\n\n"
  );
}

function renderEmptySection(empty: readonly StringEntry[]): string {
  if (empty.length === 0) {
    return "";
  }
  const rows = empty
    .map((entry) => `| \`${markdownCell(entry.key)}\` | ${markdownCell(entry.source)} |\n`)
    .join("");
  return (
    `## ⚠️ Empty Values (${empty.length})\n\n` +
    "| Key | Source (English) |\n| --- | --- |\n" +
    rows +
    "\n"
  );
}

/** Write the report, or return `null` when there is nothing to fix. */
function writeFlatReport(
  spec: FlatReportSpec,
  entries: readonly StringEntry[],
  target: LocaleTarget,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  const missing = entries.filter((entry) => entry.status === "missing");
  const empty = entries.filter((entry) => entry.status === "empty");
  const counts = { missing: missing.length, empty: empty.length, total: entries.length };
  const body =
    renderHeader(spec, counts, target.localization) +
    renderMissingSection(missing) +
    renderEmptySection(empty);
  return writeLocaleFile(target, spec.filename, body);
}

export function buildStringsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatReport(STRINGS_SPEC, entries, { localization, reportsRoot });
}

export function buildRegexsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatReport(REGEXS_SPEC, entries, { localization, reportsRoot });
}

export function buildTipsIzReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatReport(TIPS_IZ_SPEC, entries, { localization, reportsRoot });
}

export function buildTipsFsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatReport(TIPS_FS_SPEC, entries, { localization, reportsRoot });
}

export function buildAbyssBuffsReport(
  entries: readonly StringEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  return writeFlatReport(ABYSS_BUFFS_SPEC, entries, { localization, reportsRoot });
}

type BuffsByCategory = Record<string, Record<string, unknown>>;

/** Regroup flattened entries back into their `{category: {id: raw}}` shape. */
function groupByCategory(entries: readonly TravelBuffEntry[]): BuffsByCategory {
  const data: BuffsByCategory = {};
  for (const entry of entries) {
    data[entry.category] ??= {};
    data[entry.category][entry.id] = entry.raw;
  }
  return data;
}

export function buildTravelBuffsReport(
  entries: readonly TravelBuffEntry[],
  localization: string,
  reportsRoot: string,
): string | null {
  if (entries.length === 0) {
    return null;
  }
  const body =
    "# \u{1f9f3} Missing Travel Buff Translations\n\n" +
    localizationLine(localization) +
    `> **Missing IDs:** \`${entries.length}\`  \n` +
    GENERATED_BY_LINE +
    "---\n\n## ❌ Missing IDs\n\n```json\n" +
    formatJson(groupByCategory(entries)) +
    "\n```\n";
  return writeLocaleFile({ localization, reportsRoot }, "missing_travel_buffs.md", body);
}
