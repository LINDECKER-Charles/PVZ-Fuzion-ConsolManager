/** `trello` — headless equivalent of "Export Trello CSV". */

import { EXPORTS_ROOT } from "../../../config";
import { exportTrello } from "../../../tools/trello-export";
import type { AppContext } from "../../context";
import {
  type CommandInput,
  type CommandResult,
  type HeadlessCommand,
  rejectUsage,
  requiredValue,
  succeed,
} from "../command";
import { LANG_OPTION, LANG_OPTION_NAME, rejectTargetLocale } from "../locale-target";
import { outOption, outRoot } from "./out-option";

function runTrello(app: AppContext, input: CommandInput): CommandResult {
  const lang = requiredValue(input, LANG_OPTION_NAME);
  const rejection = rejectTargetLocale(app, lang);
  if (rejection !== null) {
    return rejectUsage(rejection);
  }

  const result = exportTrello({
    locale: lang,
    exportsRoot: outRoot(input, app.exportsRoot),
    root: app.projectRoot(),
    label: app.settings.trelloLabel,
    source: app.sourceLocale(),
  });
  return succeed(
    [
      `trello ${lang} → ${result.outputDir}`,
      `${result.totalCards} card(s) in ${result.lists.length} list(s)`,
    ],
    { ...result },
  );
}

export const TRELLO_COMMAND: HeadlessCommand = {
  name: "trello",
  summary: "Export every untranslated entry of a locale as Trello-importable CSVs.",
  options: [LANG_OPTION, outOption(EXPORTS_ROOT)],
  needsProjectRoot: true,
  run: runTrello,
};
