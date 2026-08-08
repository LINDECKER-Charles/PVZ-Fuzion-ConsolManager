/** PR recap → per-contributor documentation blocks.
 *
 * Ported from the standalone `pvzf-make-pr` CLI. Turns the weekly translation
 * PR recap into one markdown block per contributor, ready to archive under the
 * contributor documentation.
 */

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { type PrRecapDocument, extractPrNumber, readRecapFile } from "./parser";
import {
  type ContributorSummary,
  type LeadIdentity,
  buildSummaries,
  countContributions,
} from "./service";
import { formatPeriod } from "./period";
import { renderContributionSummary } from "./renderer";

export { PrRecapParseError, parseRecap, readRecapFile } from "./parser";
export type { PrRecapDocument } from "./parser";
export type { ContributorSummary, LeadIdentity } from "./service";
export { buildSummaries, countContributions, totalReviews } from "./service";
export { renderContributionSummary } from "./renderer";
export { formatPeriod } from "./period";

export const DEFAULT_SUMMARY_OUTPUT = "contribution-summary.md";

/** Repository boilerplate that is never a PR recap. */
const AUTO_DETECT_SKIP = new Set([
  "readme.md",
  "readme.dist.md",
  "changelog.md",
  "license.md",
  "contributing.md",
  "release.md",
]);

/** Thrown when no candidate recap can be found in the working directory. */
export class RecapNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecapNotFoundError";
  }
}

/**
 * Pick the recap file: the explicit path when given, otherwise the first `.md`
 * in `cwd` that is neither repository boilerplate nor the output file itself.
 */
export function resolveRecapInput(
  explicitPath: string | null,
  cwd: string,
  outputBasename?: string,
): string {
  if (explicitPath) {
    return path.resolve(cwd, explicitPath);
  }

  const skipped = new Set(AUTO_DETECT_SKIP);
  if (outputBasename) {
    skipped.add(outputBasename.toLowerCase());
  }

  const candidates = readdirSync(cwd, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .filter((name) => !skipped.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const first = candidates[0];
  if (first === undefined) {
    throw new RecapNotFoundError(
      `No .md recap found in ${cwd} — pass the file explicitly.`,
    );
  }
  return path.resolve(cwd, first);
}

export function resolveSummaryOutput(explicitPath: string | null, cwd: string): string {
  return path.resolve(cwd, explicitPath || DEFAULT_SUMMARY_OUTPUT);
}

export interface ContributorStat {
  name: string;
  newCount: number;
  modifiedCount: number;
  reviewCount: number;
}

export interface ContributionSummaryResult {
  inputPath: string;
  outputPath: string;
  /** Period as rendered in the output (`01/04/26 → 07/04/26`). */
  period: string;
  prNumber: string;
  prUrl: string;
  contributors: ContributorStat[];
  markdown: string;
}

export interface GenerateSummaryOptions {
  inputPath: string;
  outputPath: string;
  lead: LeadIdentity;
  /** Skip the disk write — used to preview the result. */
  dryRun?: boolean;
}

function toStats(summaries: Map<string, ContributorSummary>): ContributorStat[] {
  return [...summaries.entries()]
    .map(([name, summary]) => ({ name, ...countContributions(summary) }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

/** Render the summary for an already-parsed recap. Pure — touches no disk. */
export function buildContributionSummary(
  document: PrRecapDocument,
  lead: LeadIdentity,
): Omit<ContributionSummaryResult, "inputPath" | "outputPath"> {
  const prNumber = extractPrNumber(document.prUrl);
  const summaries = buildSummaries(document, lead);
  return {
    period: formatPeriod(document.period),
    prNumber,
    prUrl: document.prUrl,
    contributors: toStats(summaries),
    markdown: renderContributionSummary({
      period: document.period,
      prUrl: document.prUrl,
      prNumber,
      summaries,
    }),
  };
}

/** Persist an already-rendered summary — the deferred half of a `dryRun`. */
export function writeContributionSummary(
  result: Pick<ContributionSummaryResult, "outputPath" | "markdown">,
): void {
  mkdirSync(path.dirname(result.outputPath), { recursive: true });
  writeFileSync(result.outputPath, result.markdown, { encoding: "utf-8" });
}

/** Read the recap, render the blocks and (unless `dryRun`) write them out. */
export function generateContributionSummary({
  inputPath,
  outputPath,
  lead,
  dryRun = false,
}: GenerateSummaryOptions): ContributionSummaryResult {
  const result = {
    ...buildContributionSummary(readRecapFile(inputPath), lead),
    inputPath,
    outputPath,
  };
  if (!dryRun) {
    writeContributionSummary(result);
  }
  return result;
}
