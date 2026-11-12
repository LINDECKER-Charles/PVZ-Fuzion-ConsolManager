/** `diff` — headless equivalent of "Show what's missing", every category. */

import path from "node:path";

import { REPORTS_ROOT } from "../../../config";
import { scanLocale } from "../../../tools/scan";
import { type AppContext, toScanRequest } from "../../context";
import {
  type CommandInput,
  type CommandResult,
  type HeadlessCommand,
  rejectUsage,
  requiredValue,
  succeed,
  warnOnStderr,
} from "../command";
import { LANG_OPTION, LANG_OPTION_NAME, rejectTargetLocale } from "../locale-target";
import { outOption, outRoot } from "./out-option";

const WITH_DIFF_FLAG = "--with-diff";

function runDiff(app: AppContext, input: CommandInput): CommandResult {
  const lang = requiredValue(input, LANG_OPTION_NAME);
  const rejection = rejectTargetLocale(app, lang);
  if (rejection !== null) {
    return rejectUsage(rejection);
  }

  const reportsRoot = outRoot(input, app.reportsRoot);
  const jsonDiff = input.flags.has(WITH_DIFF_FLAG);
  const request = { ...toScanRequest(app, jsonDiff), reportsRoot, warn: warnOnStderr };
  const categories = scanLocale(request, lang);
  const totalMissing = categories.reduce((sum, category) => sum + category.missing, 0);

  return succeed(
    [`diff ${lang} → ${reportsRoot}/${lang}/`, `${totalMissing} missing entries`],
    { locale: lang, reportsDir: path.join(reportsRoot, lang), jsonDiff, totalMissing, categories },
  );
}

export const DIFF_COMMAND: HeadlessCommand = {
  name: "diff",
  summary: "Write the missing-entries reports of a locale, every category.",
  options: [
    LANG_OPTION,
    outOption(REPORTS_ROOT),
    { name: WITH_DIFF_FLAG, description: "Also write a *_diff.json next to each report." },
  ],
  needsProjectRoot: true,
  run: runDiff,
};
