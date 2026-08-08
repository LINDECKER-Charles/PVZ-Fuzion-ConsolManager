/** Headless subcommands — no prompts, an exit code as the only outcome. */

import { stderr, stdout } from "node:process";
import path from "node:path";

import { describeError } from "../core/text";
import { listLocalizations } from "../parsers/loaders";
import {
  type ContributionSummaryResult,
  generateContributionSummary,
  resolveRecapInput,
  resolveSummaryOutput,
} from "../tools/pr-resume";
import { runScan } from "../tools/scan";
import { type AppContext, toScanRequest } from "./context";
import { USAGE_EXIT_CODE } from "./args";

const SUCCESS = 0;
const FAILURE = 1;
const PREFIX = "pvzf-console:";

export interface DiffCommandOptions {
  lang: string;
  /** Reports root override; `null` keeps the session default. */
  out: string | null;
  exportJsonDiff: boolean;
}

export interface PrResumeCommandOptions {
  input: string | null;
  output: string | null;
}

/** Shorten an absolute path for display when it sits under `cwd`. */
function relativeToCwd(app: AppContext, target: string): string {
  const relative = path.relative(app.cwd, target);
  return relative && !relative.startsWith("..") ? relative : target;
}

/** Validate the requested locale; returns the reason it cannot be diffed. */
function rejectDiffTarget(app: AppContext, lang: string): string | null {
  const rootError = app.settings.validateProjectRoot();
  if (rootError !== null) {
    return `error: ${rootError}\n`;
  }
  const locales = listLocalizations(app.projectRoot());
  if (!locales.includes(lang)) {
    return `error: locale '${lang}' not found.\navailable: ${locales.join(", ")}\n`;
  }
  if (lang === app.sourceLocale()) {
    const source = app.sourceLocale();
    return `error: '${lang}' is the source locale (${source}); nothing to diff.\n`;
  }
  return null;
}

export function cmdDiff(app: AppContext, options: DiffCommandOptions): number {
  const rejection = rejectDiffTarget(app, options.lang);
  if (rejection !== null) {
    stderr.write(rejection);
    return USAGE_EXIT_CODE;
  }

  const reportsRoot = options.out ?? app.reportsRoot;
  stdout.write(`${PREFIX} diff ${options.lang} → ${reportsRoot}/${options.lang}/\n`);

  const request = { ...toScanRequest(app, options.exportJsonDiff), reportsRoot };
  const count = runScan(request, [options.lang]);
  stdout.write(`${PREFIX} ${count} missing entries\n`);
  return SUCCESS;
}

/** Headless equivalent of the Documentation tab's PR-recap screen. */
export function cmdPrResume(app: AppContext, options: PrResumeCommandOptions): number {
  const outputPath = resolveSummaryOutput(options.output, app.cwd);
  let result: ContributionSummaryResult;
  try {
    result = generateContributionSummary({
      inputPath: resolveRecapInput(options.input, app.cwd, path.basename(outputPath)),
      outputPath,
      lead: app.settings.leadIdentity(),
    });
  } catch (error) {
    stderr.write(`error: ${describeError(error)}\n`);
    return FAILURE;
  }

  const from = relativeToCwd(app, result.inputPath);
  const to = relativeToCwd(app, result.outputPath);
  stdout.write(`${PREFIX} ${from} → ${to}\n`);
  stdout.write(
    `${PREFIX} PR#${result.prNumber} · ${result.period} · ` +
      `${result.contributors.length} contributor(s)\n`,
  );
  return SUCCESS;
}
