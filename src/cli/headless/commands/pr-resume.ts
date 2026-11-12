/** `pr-resume` — headless equivalent of the Documentation tab's PR-recap screen. */

import path from "node:path";

import {
  DEFAULT_SUMMARY_OUTPUT,
  generateContributionSummary,
  resolveRecapInput,
  resolveSummaryOutput,
} from "../../../tools/pr-resume";
import type { AppContext } from "../../context";
import { type CommandInput, type CommandResult, type HeadlessCommand, succeed } from "../command";

const INPUT_OPTION = "--input";
const OUTPUT_OPTION = "--output";

/** Shorten an absolute path for display when it sits under `cwd`. */
function relativeToCwd(app: AppContext, target: string): string {
  const relative = path.relative(app.cwd, target);
  return relative && !relative.startsWith("..") ? relative : target;
}

function runPrResume(app: AppContext, input: CommandInput): CommandResult {
  const outputPath = resolveSummaryOutput(input.values.get(OUTPUT_OPTION) ?? null, app.cwd);
  const inputPath = resolveRecapInput(
    input.values.get(INPUT_OPTION) ?? null,
    app.cwd,
    path.basename(outputPath),
  );
  const result = generateContributionSummary({
    inputPath,
    outputPath,
    lead: app.settings.leadIdentity(),
  });

  return succeed(
    [
      `${relativeToCwd(app, result.inputPath)} → ${relativeToCwd(app, result.outputPath)}`,
      `PR#${result.prNumber} · ${result.period} · ${result.contributors.length} contributor(s)`,
    ],
    {
      input: result.inputPath,
      output: result.outputPath,
      prNumber: result.prNumber,
      prUrl: result.prUrl,
      period: result.period,
      contributors: result.contributors,
    },
  );
}

export const PR_RESUME_COMMAND: HeadlessCommand = {
  name: "pr-resume",
  summary: "Turn the weekly PR recap into the contributor documentation.",
  options: [
    {
      name: INPUT_OPTION,
      value: "FILE",
      description: "Recap to read (default: first candidate .md of the working directory).",
    },
    {
      name: OUTPUT_OPTION,
      value: "FILE",
      description: `Summary to write (default: ${DEFAULT_SUMMARY_OUTPUT}).`,
    },
  ],
  needsProjectRoot: false,
  run: runPrResume,
};
