import { mkdirSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT, SOURCE_LOCALE } from "../config";
import { missingById } from "../core/diff";
import type { AlmanacEntry, StringEntry, TrelloCard } from "../core/models";
import { loadAchievements, loadPlants, loadZombies } from "../parsers/almanac";
import {
  diffAbyssBuffs,
  diffRegexs,
  diffStrings,
  diffTipsFs,
  diffTipsIz,
  diffTravelBuffs,
} from "../parsers/strings";
import { buildTrelloReadme, writeTrelloCsvsByList } from "../reporting/trello-csv";

export const NAME_MAX_LEN = 100;
export const DESCRIPTION_MAX_LEN = 15000; // Trello hard limit is 16384; leave headroom.
export const DEFAULT_LABEL = "To be translated";

export const LIST_PLANTS = "Plants";
export const LIST_ZOMBIES = "Zombies";
export const LIST_ACHIEVEMENTS = "Achievements";
export const LIST_STRINGS = "Strings";
export const LIST_REGEX = "Regex";
export const LIST_TIPS_IZ = "Tips IZ";
export const LIST_TIPS_FS = "Tips FS";
export const LIST_ABYSS = "Abyss Buffs";
export const LIST_TRAVEL = "Travel Buffs";

/**
 * Port of the Python `TrelloExportResult` dataclass.
 *
 * The Python `@property total_cards` is materialised here as the data field
 * `totalCards` (sum of `countsByList` values), computed at construction.
 */
export interface TrelloExportResult {
  locale: string;
  outputDir: string;
  csvPaths: Record<string, string>;
  readmePath: string;
  countsByList: Record<string, number>;
  totalCards: number;
}

export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  // text[: limit - 1].rstrip() + "…"
  return rstrip(text.slice(0, limit - 1)) + "…";
}

function fence(body: string): string {
  return "```json\n" + body + "\n```";
}

/**
 * Wrap the raw dict (with braces) in a ```json fence — same shape as the source
 * file. `json.dumps(..., indent=2)` is matched by `JSON.stringify(..., null, 2)`;
 * `\n` inside string values stays literal, as Python's dumps escapes it.
 */
export function describeAlmanac(entry: AlmanacEntry): string {
  return fence(JSON.stringify(entry.raw, null, 2));
}

/**
 * Render a flat key/value entry as a JSON member inside a ```json fence:
 * `"key": "value"`. Matches how each line would appear in the source `.json`.
 */
export function describeString(entry: StringEntry): string {
  const key = JSON.stringify(entry.key);
  const value = JSON.stringify(entry.source !== null && entry.source !== undefined ? entry.source : "");
  return fence(`${key}: ${value}`);
}

function almanacCards(entries: ReadonlyArray<AlmanacEntry>, listName: string, label: string): TrelloCard[] {
  const cards: TrelloCard[] = [];
  for (const entry of entries) {
    const name = entry.name || `id ${entry.id}`;
    cards.push({
      name: truncate(name, NAME_MAX_LEN),
      description: truncate(describeAlmanac(entry), DESCRIPTION_MAX_LEN),
      listName,
      labels: label,
    });
  }
  return cards;
}

function stringCards(entries: ReadonlyArray<StringEntry>, listName: string, label: string): TrelloCard[] {
  const cards: TrelloCard[] = [];
  for (const entry of entries) {
    cards.push({
      name: truncate(entry.key, NAME_MAX_LEN),
      description: truncate(describeString(entry), DESCRIPTION_MAX_LEN),
      listName,
      labels: label,
    });
  }
  return cards;
}

export function collectCards(
  root: string,
  locale: string,
  label: string = DEFAULT_LABEL,
  source: string = SOURCE_LOCALE,
): TrelloCard[] {
  const cards: TrelloCard[] = [];

  cards.push(
    ...almanacCards(missingById(loadPlants(root, source), loadPlants(root, locale)), LIST_PLANTS, label),
  );
  cards.push(
    ...almanacCards(missingById(loadZombies(root, source), loadZombies(root, locale)), LIST_ZOMBIES, label),
  );
  cards.push(
    ...almanacCards(
      missingById(loadAchievements(root, source), loadAchievements(root, locale)),
      LIST_ACHIEVEMENTS,
      label,
    ),
  );

  cards.push(...stringCards(diffStrings(root, source, locale), LIST_STRINGS, label));
  cards.push(...stringCards(diffRegexs(root, source, locale), LIST_REGEX, label));
  cards.push(...stringCards(diffTipsIz(root, source, locale), LIST_TIPS_IZ, label));
  cards.push(...stringCards(diffTipsFs(root, source, locale), LIST_TIPS_FS, label));
  cards.push(...stringCards(diffAbyssBuffs(root, source, locale), LIST_ABYSS, label));
  cards.push(...stringCards(diffTravelBuffs(root, source, locale), LIST_TRAVEL, label));

  return cards;
}

export function exportTrello(
  locale: string,
  exportsRoot: string,
  root: string = PROJECT_ROOT,
  label: string = DEFAULT_LABEL,
  source: string = SOURCE_LOCALE,
): TrelloExportResult {
  const rootStr = String(root);
  const out = path.join(String(exportsRoot), locale);
  mkdirSync(out, { recursive: true });

  const cards = collectCards(rootStr, locale, label, source);
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card.listName] = (counts[card.listName] ?? 0) + 1;
  }

  const csvPaths = writeTrelloCsvsByList(cards, out);
  const readmePath = path.join(out, "trello_README.md");
  buildTrelloReadme(locale, csvPaths, label, readmePath);

  return {
    locale,
    outputDir: out,
    csvPaths,
    readmePath,
    countsByList: counts,
    totalCards: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

/** Python `str.rstrip()` — strip trailing ASCII + Unicode whitespace. */
function rstrip(text: string): string {
  return text.replace(/\s+$/u, "");
}
