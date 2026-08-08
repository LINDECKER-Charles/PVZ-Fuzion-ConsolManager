/** The "Documentation" tab: turn a weekly PR recap into contributor blocks. */

import path from "node:path";

import type { AppContext } from "../context";
import { describeError } from "../../core/text";
import type { MenuOption } from "../menus";
import { BACK_KEY, type MenuAction, runMenuLoop } from "./menu-loop";
import {
  type ContributionSummaryResult,
  type ContributorStat,
  generateContributionSummary,
  resolveRecapInput,
  resolveSummaryOutput,
  writeContributionSummary,
} from "../../tools/pr-resume";

const CONTRIBUTOR_COLUMN_MIN_WIDTH = 11;
const COUNT_COLUMN_WIDTH = 5;

/** Shorten an absolute path for display when it sits under `cwd`. */
function relativeToCwd(app: AppContext, target: string): string {
  const relative = path.relative(app.cwd, target);
  return relative && !relative.startsWith("..") ? relative : target;
}

/** Best-effort default for the recap file: the first candidate `.md` in `cwd`. */
function guessRecapPath(app: AppContext, outputBasename: string): string {
  try {
    return relativeToCwd(app, resolveRecapInput(null, app.cwd, outputBasename));
  } catch {
    return "";
  }
}

/** The aligned `name new mod rev` table, or nothing when no one contributed. */
function contributorRows(contributors: readonly ContributorStat[]): string[] {
  if (contributors.length === 0) {
    return [];
  }
  const width = Math.max(
    ...contributors.map((contributor) => contributor.name.length),
    CONTRIBUTOR_COLUMN_MIN_WIDTH,
  );
  const count = (value: number): string => String(value).padStart(COUNT_COLUMN_WIDTH);
  return [
    "",
    `${"Contributor".padEnd(width)}   new   mod   rev`,
    ...contributors.map(
      (contributor) =>
        `${contributor.name.padEnd(width)} ${count(contributor.newCount)} ` +
        `${count(contributor.modifiedCount)} ${count(contributor.reviewCount)}`,
    ),
  ];
}

/** Render the contribution stats as an aligned table inside a panel. */
export function printContributionSummary(
  app: AppContext,
  result: ContributionSummaryResult,
): void {
  app.deps.panel(
    [
      `Period   ${result.period}`,
      `PR       #${result.prNumber}`,
      `Source   ${relativeToCwd(app, result.inputPath)}`,
      `Target   ${relativeToCwd(app, result.outputPath)}`,
      ...contributorRows(result.contributors),
    ],
    "Contribution summary",
  );
}

/** Ask for the recap and target paths; `null` when the user gives no recap. */
async function askPaths(app: AppContext): Promise<{ input: string; output: string } | null> {
  const defaultOutput = app.settings.docsOutput;
  const rawInput = await app.deps.askText(
    "Recap file",
    guessRecapPath(app, path.basename(defaultOutput)),
  );
  if (!rawInput) {
    app.deps.error("No recap file given.");
    await app.deps.pressEnterToContinue();
    return null;
  }
  const rawOutput = await app.deps.askText("Output file", defaultOutput);
  return {
    input: path.resolve(app.cwd, rawInput),
    output: resolveSummaryOutput(rawOutput, app.cwd),
  };
}

/**
 * Render without touching disk, so the recap can be reviewed before it
 * overwrites an existing summary. `null` when the recap cannot be read.
 */
function preview(app: AppContext, input: string, output: string): ContributionSummaryResult | null {
  try {
    return generateContributionSummary({
      inputPath: input,
      outputPath: output,
      lead: app.settings.leadIdentity(),
      dryRun: true,
    });
  } catch (error) {
    app.deps.error(describeError(error));
    return null;
  }
}

async function confirmAndWrite(
  app: AppContext,
  result: ContributionSummaryResult,
): Promise<void> {
  if (!(await app.deps.askConfirm(`Write ${relativeToCwd(app, result.outputPath)}?`, true))) {
    app.deps.info("Nothing written.");
    return;
  }
  try {
    writeContributionSummary(result);
    app.deps.success(`Summary written: ${result.outputPath}`);
  } catch (error) {
    app.deps.error(describeError(error));
  }
}

export async function prResumeScreen(app: AppContext): Promise<void> {
  app.deps.header("PR recap → contributor summary", `Lead: ${app.settings.docsLeadName}`);
  app.deps.info("Splits a weekly PR recap into one markdown block per contributor.");
  app.deps.info("Expected input — line 1: period (2026-04-01..2026-04-07), line 2: PR URL.");

  const paths = await askPaths(app);
  if (paths === null) {
    return;
  }

  const result = preview(app, paths.input, paths.output);
  if (result === null) {
    await app.deps.pressEnterToContinue();
    return;
  }
  printContributionSummary(app, result);

  if (result.contributors.length === 0) {
    app.deps.warn("No contributor detected — check the recap's `@handle :` markers.");
  } else {
    await confirmAndWrite(app, result);
  }
  await app.deps.pressEnterToContinue();
}

function options(app: AppContext): MenuOption[] {
  return [
    {
      key: "1",
      label: "PR recap → contributor summary",
      hint: `lead: ${app.settings.docsLeadName}`,
    },
    { key: String(BACK_KEY), label: "Back" },
  ];
}

const ACTIONS = new Map<number, MenuAction>([[1, prResumeScreen]]);

export function documentation(app: AppContext): Promise<void> {
  return runMenuLoop(app, {
    title: "Documentation",
    render: (context) =>
      context.deps.header("Documentation", "Author the contributor documentation from a PR recap."),
    options: options(app),
    actions: ACTIONS,
  });
}
