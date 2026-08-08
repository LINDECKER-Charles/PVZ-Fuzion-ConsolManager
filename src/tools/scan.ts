/**
 * The translation-type registry: what "run a diff" means for each category.
 *
 * Every category boils down to the same three steps — collect what the target
 * locale is missing, write a Markdown report, optionally write a JSON diff —
 * so each one is a descriptor rather than a hand-written method.
 */

import { missingById } from "../core/diff";
import type { AlmanacEntry, StringEntry, TravelBuffEntry } from "../core/models";
import { loadAchievements, loadPlants, loadZombies } from "../parsers/almanac";
import {
  ABYSS_BUFFS_FILE,
  TIPS_FS_FILE,
  TIPS_IZ_FILE,
  TRAVEL_BUFFS_FILE,
  diffAbyssBuffs,
  diffRegexs,
  diffStrings,
  diffTipsFs,
  diffTipsIz,
  diffTravelBuffs,
  stringsFileExists,
} from "../parsers/strings";
import {
  buildAchievementReport,
  buildPlantReport,
  buildZombieReport,
} from "../reporting/almanac-report";
import {
  buildAbyssBuffsDiff,
  buildAchievementsDiff,
  buildPlantsDiff,
  buildRegexsDiff,
  buildStringsDiff,
  buildTipsFsDiff,
  buildTipsIzDiff,
  buildTravelBuffsDiff,
  buildZombiesDiff,
} from "../reporting/diff-json";
import {
  buildAbyssBuffsReport,
  buildRegexsReport,
  buildStringsReport,
  buildTipsFsReport,
  buildTipsIzReport,
  buildTravelBuffsReport,
} from "../reporting/strings-report";

/** Everything a scan needs, minus the locale it is about to look at. */
export interface ScanRequest {
  projectRoot: string;
  sourceLocale: string;
  reportsRoot: string;
  /** Also write the machine-readable JSON diff next to each report. */
  exportJsonDiff: boolean;
  /** Where a skipped locale explains itself. */
  warn(message: string): void;
}

/** Scans one locale and returns how many entries it is missing. */
type Scanner = (request: ScanRequest, locale: string) => number;

export interface TranslationType {
  /** Stable menu key, also the headless dispatch value. */
  key: number;
  label: string;
  scan: Scanner;
}

type ReportWriter<E> = (
  entries: readonly E[],
  localization: string,
  reportsRoot: string,
) => string | null;

interface AlmanacScanSpec {
  load(root: string, locale: string): AlmanacEntry[];
  report: ReportWriter<AlmanacEntry>;
  diff: ReportWriter<AlmanacEntry>;
}

function almanacScanner(spec: AlmanacScanSpec): Scanner {
  return (request, locale) => {
    const source = spec.load(request.projectRoot, request.sourceLocale);
    const missing = missingById(source, spec.load(request.projectRoot, locale));
    spec.report(missing, locale, request.reportsRoot);
    if (request.exportJsonDiff) {
      spec.diff(missing, locale, request.reportsRoot);
    }
    return missing.length;
  };
}

interface StringsScanSpec<E extends StringEntry> {
  collect(root: string, source: string, target: string): E[];
  report: ReportWriter<E>;
  diff: ReportWriter<E>;
  /**
   * File the target locale must own for the scan to mean anything. Absent from
   * the locale, the scan warns and contributes nothing.
   */
  requiredFile?: string;
  /** Advice appended to the "file missing" warning. */
  hint?: string;
}

function stringsScanner<E extends StringEntry>(spec: StringsScanSpec<E>): Scanner {
  return (request, locale) => {
    if (spec.requiredFile && !stringsFileExists(request.projectRoot, locale, spec.requiredFile)) {
      request.warn(`${locale}: ${spec.requiredFile} missing${spec.hint ?? ""}`);
      return 0;
    }
    const entries = spec.collect(request.projectRoot, request.sourceLocale, locale);
    spec.report(entries, locale, request.reportsRoot);
    if (request.exportJsonDiff) {
      spec.diff(entries, locale, request.reportsRoot);
    }
    return entries.length;
  };
}

/** Run several scanners as one translation type (tips covers two files). */
function combined(...scanners: readonly Scanner[]): Scanner {
  return (request, locale) =>
    scanners.reduce((total, scan) => total + scan(request, locale), 0);
}

const MIGRATE_HINT = " — run Translator Tools > Migrate tips & buffs";

const scanPlants = almanacScanner({
  load: loadPlants,
  report: buildPlantReport,
  diff: buildPlantsDiff,
});
const scanZombies = almanacScanner({
  load: loadZombies,
  report: buildZombieReport,
  diff: buildZombiesDiff,
});
const scanAchievements = almanacScanner({
  load: loadAchievements,
  report: buildAchievementReport,
  diff: buildAchievementsDiff,
});

const scanStrings = stringsScanner<StringEntry>({
  collect: diffStrings,
  report: buildStringsReport,
  diff: buildStringsDiff,
});
const scanRegexs = stringsScanner<StringEntry>({
  collect: diffRegexs,
  report: buildRegexsReport,
  diff: buildRegexsDiff,
});
const scanTipsIz = stringsScanner<StringEntry>({
  collect: diffTipsIz,
  report: buildTipsIzReport,
  diff: buildTipsIzDiff,
  requiredFile: TIPS_IZ_FILE,
  hint: MIGRATE_HINT,
});
const scanTipsFs = stringsScanner<StringEntry>({
  collect: diffTipsFs,
  report: buildTipsFsReport,
  diff: buildTipsFsDiff,
  requiredFile: TIPS_FS_FILE,
  hint: MIGRATE_HINT,
});
const scanAbyssBuffs = stringsScanner<StringEntry>({
  collect: diffAbyssBuffs,
  report: buildAbyssBuffsReport,
  diff: buildAbyssBuffsDiff,
  requiredFile: ABYSS_BUFFS_FILE,
});
const scanTravelBuffs = stringsScanner<TravelBuffEntry>({
  collect: diffTravelBuffs,
  report: buildTravelBuffsReport,
  diff: buildTravelBuffsDiff,
  requiredFile: TRAVEL_BUFFS_FILE,
});

/** Every category the toolkit knows how to diff, in menu order. */
export const TRANSLATION_TYPES: readonly TranslationType[] = [
  { key: 1, label: "Plants", scan: scanPlants },
  { key: 2, label: "Zombies", scan: scanZombies },
  { key: 3, label: "Achievements", scan: scanAchievements },
  { key: 4, label: "Strings (UI)", scan: scanStrings },
  { key: 5, label: "Regex", scan: scanRegexs },
  { key: 6, label: "Tips (IZ + FS)", scan: combined(scanTipsIz, scanTipsFs) },
  { key: 7, label: "Abyss buffs", scan: scanAbyssBuffs },
  { key: 8, label: "Travel buffs", scan: scanTravelBuffs },
];

/** Look up a translation type by its menu key; `undefined` when unknown. */
export function findTranslationType(key: number): TranslationType | undefined {
  return TRANSLATION_TYPES.find((type) => type.key === key);
}

/**
 * Scan `locales` and return the total number of missing entries.
 *
 * `types` defaults to every category. The source locale is always skipped —
 * diffing the reference against itself has no meaning.
 */
export function runScan(
  request: ScanRequest,
  locales: readonly string[],
  types: readonly TranslationType[] = TRANSLATION_TYPES,
): number {
  let total = 0;
  for (const locale of locales) {
    if (locale === request.sourceLocale) continue;
    for (const type of types) {
      total += type.scan(request, locale);
    }
  }
  return total;
}
