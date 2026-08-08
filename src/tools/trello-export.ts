import { mkdirSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT, SOURCE_LOCALE } from "../config";
import { missingById } from "../core/diff";
import {
  DEFAULT_TRELLO_LABEL,
  type AlmanacEntry,
  type StringEntry,
  type TravelBuffEntry,
  type TrelloCard,
} from "../core/models";
import { stripTrailingWhitespace } from "../core/text";
import { loadAchievements, loadPlants, loadZombies } from "../parsers/almanac";
import {
  diffAbyssBuffs,
  diffRegexs,
  diffStrings,
  diffTipsFs,
  diffTipsIz,
  diffTravelBuffs,
} from "../parsers/strings";
import {
  type TrelloListSummary,
  buildTrelloReadme,
  writeTrelloCsvsByList,
} from "../reporting/trello-csv";

export const NAME_MAX_LEN = 100;
export const DESCRIPTION_MAX_LEN = 15000; // Trello hard limit is 16384; leave headroom.

export const LIST_PLANTS = "Plants";
export const LIST_ZOMBIES = "Zombies";
export const LIST_ACHIEVEMENTS = "Achievements";
export const LIST_STRINGS = "Strings";
export const LIST_REGEX = "Regex";
export const LIST_TIPS_IZ = "Tips IZ";
export const LIST_TIPS_FS = "Tips FS";
export const LIST_ABYSS = "Abyss Buffs";
export const LIST_TRAVEL = "Travel Buffs";

const README_FILENAME = "trello_README.md";

/** What to export, and against which reference. */
export interface TrelloExportRequest {
  /** Target locale — the one that still needs translating. */
  locale: string;
  /** `PvZ_Fusion_Translator/` root. Defaults to the discovered project root. */
  root?: string;
  /** Trello label stamped on every card. */
  label?: string;
  /** Reference locale the target is diffed against. */
  source?: string;
}

export interface TrelloExportOptions extends TrelloExportRequest {
  /** Folder receiving `<locale>/`, with the CSVs and the import README. */
  exportsRoot: string;
}

export interface TrelloExportResult {
  locale: string;
  outputDir: string;
  readmePath: string;
  /** One entry per written CSV — empty when the locale is fully translated. */
  lists: TrelloListSummary[];
  totalCards: number;
}

export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${stripTrailingWhitespace(text.slice(0, limit - 1))}…`;
}

function fence(body: string): string {
  return "```json\n" + body + "\n```";
}

/** Wrap the raw entry (braces included) in a ```json fence — same shape as the source file. */
export function describeAlmanac(entry: AlmanacEntry): string {
  return fence(JSON.stringify(entry.raw, null, 2));
}

/** Render a flat key/value entry as the JSON member `"key": "value"`. */
export function describeString(entry: StringEntry): string {
  return fence(`${JSON.stringify(entry.key)}: ${JSON.stringify(entry.source ?? "")}`);
}

function almanacCards(
  entries: readonly AlmanacEntry[],
  listName: string,
  label: string,
): TrelloCard[] {
  return entries.map((entry) => ({
    name: truncate(entry.name || `id ${entry.id}`, NAME_MAX_LEN),
    description: truncate(describeAlmanac(entry), DESCRIPTION_MAX_LEN),
    listName,
    labels: label,
  }));
}

function stringCards(
  entries: readonly StringEntry[],
  listName: string,
  label: string,
): TrelloCard[] {
  return entries.map((entry) => ({
    name: truncate(entry.key, NAME_MAX_LEN),
    description: truncate(describeString(entry), DESCRIPTION_MAX_LEN),
    listName,
    labels: label,
  }));
}

function travelBuffCards(entries: readonly TravelBuffEntry[], label: string): TrelloCard[] {
  return entries.map((entry) => ({
    name: truncate(entry.source || entry.key, NAME_MAX_LEN),
    description: truncate(
      fence(JSON.stringify({ [entry.category]: { [entry.id]: entry.raw } }, null, 2)),
      DESCRIPTION_MAX_LEN,
    ),
    listName: LIST_TRAVEL,
    labels: label,
  }));
}

/** Resolved form of a {@link TrelloExportRequest}, defaults applied. */
interface ResolvedRequest {
  locale: string;
  root: string;
  label: string;
  source: string;
}

function resolveRequest(request: TrelloExportRequest): ResolvedRequest {
  return {
    locale: request.locale,
    root: request.root ?? PROJECT_ROOT,
    label: request.label ?? DEFAULT_TRELLO_LABEL,
    source: request.source ?? SOURCE_LOCALE,
  };
}

function almanacListCards({ root, locale, label, source }: ResolvedRequest): TrelloCard[] {
  const missingPlants = missingById(loadPlants(root, source), loadPlants(root, locale));
  const missingZombies = missingById(loadZombies(root, source), loadZombies(root, locale));
  const missingAchievements = missingById(
    loadAchievements(root, source),
    loadAchievements(root, locale),
  );
  return [
    ...almanacCards(missingPlants, LIST_PLANTS, label),
    ...almanacCards(missingZombies, LIST_ZOMBIES, label),
    ...almanacCards(missingAchievements, LIST_ACHIEVEMENTS, label),
  ];
}

function stringListCards({ root, locale, label, source }: ResolvedRequest): TrelloCard[] {
  return [
    ...stringCards(diffStrings(root, source, locale), LIST_STRINGS, label),
    ...stringCards(diffRegexs(root, source, locale), LIST_REGEX, label),
    ...stringCards(diffTipsIz(root, source, locale), LIST_TIPS_IZ, label),
    ...stringCards(diffTipsFs(root, source, locale), LIST_TIPS_FS, label),
    ...stringCards(diffAbyssBuffs(root, source, locale), LIST_ABYSS, label),
    ...travelBuffCards(diffTravelBuffs(root, source, locale), label),
  ];
}

/** Every untranslated entry of `locale`, as Trello cards. */
export function collectCards(request: TrelloExportRequest): TrelloCard[] {
  const resolved = resolveRequest(request);
  return [...almanacListCards(resolved), ...stringListCards(resolved)];
}

export function exportTrello(options: TrelloExportOptions): TrelloExportResult {
  const resolved = resolveRequest(options);
  const outputDir = path.join(options.exportsRoot, resolved.locale);
  mkdirSync(outputDir, { recursive: true });

  const lists = writeTrelloCsvsByList(collectCards(options), outputDir);
  const readmePath = buildTrelloReadme({
    locale: resolved.locale,
    label: resolved.label,
    outputPath: path.join(outputDir, README_FILENAME),
    lists,
  });

  return {
    locale: resolved.locale,
    outputDir,
    readmePath,
    lists,
    totalCards: lists.reduce((sum, list) => sum + list.cardCount, 0),
  };
}
