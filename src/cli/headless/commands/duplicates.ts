/** `duplicates` — headless equivalent of "Check duplicates", one locale. */

import { REPORTS_ROOT } from "../../../config";
import { buildDuplicatesReport } from "../../../reporting/duplicates-report";
import {
  checkLocaleDuplicates,
  hasDuplicates,
  totalDuplicateKeys,
  totalDuplicateValues,
} from "../../../tools/duplicate-checker";
import type { AppContext } from "../../context";
import {
  type CommandInput,
  type CommandResult,
  type HeadlessCommand,
  rejectUsage,
  requiredValue,
  succeed,
} from "../command";
import { LANG_OPTION, LANG_OPTION_NAME, rejectUnknownLocale } from "../locale-target";
import { outOption, outRoot } from "./out-option";

function runDuplicates(app: AppContext, input: CommandInput): CommandResult {
  const lang = requiredValue(input, LANG_OPTION_NAME);
  const rejection = rejectUnknownLocale(app, lang);
  if (rejection !== null) {
    return rejectUsage(rejection);
  }

  const result = checkLocaleDuplicates(app.projectRoot(), lang);
  const report = buildDuplicatesReport(result, outRoot(input, app.reportsRoot));
  const duplicateKeys = totalDuplicateKeys(result);
  const repeatedValues = totalDuplicateValues(result);
  const summary =
    `duplicates ${lang}: ${duplicateKeys} duplicate key(s), ` +
    `${repeatedValues} repeated value group(s)`;

  return succeed(report === null ? [summary] : [summary, `report: ${report}`], {
    locale: lang,
    duplicateKeys,
    repeatedValues,
    report,
    files: result.files.filter(hasDuplicates),
  });
}

export const DUPLICATES_COMMAND: HeadlessCommand = {
  name: "duplicates",
  summary: "Find duplicate keys, and values shared by several keys, in a locale.",
  options: [LANG_OPTION, outOption(REPORTS_ROOT)],
  needsProjectRoot: true,
  run: runDuplicates,
};
