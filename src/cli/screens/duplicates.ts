/** Duplicate-key / repeated-value scan screen. */

import { type AppContext, asLocaleList } from "../context";
import { buildDuplicatesReport } from "../../reporting/duplicates-report";
import {
  type LocaleDuplicates,
  checkLocaleDuplicates,
  hasDuplicates,
  totalDuplicateKeys,
  totalDuplicateValues,
} from "../../tools/duplicate-checker";

const SUBTITLE = "Scans translation files for duplicate keys and values shared by multiple keys.";

export function printDuplicatesResult(
  app: AppContext,
  result: LocaleDuplicates,
  reportPath: string | null,
): void {
  app.deps.section(result.locale);
  const offenders = result.files.filter(hasDuplicates);
  if (offenders.length === 0) {
    app.deps.success("No duplicates found.");
    return;
  }
  app.deps.success(
    `${totalDuplicateKeys(result)} duplicate key(s), ` +
      `${totalDuplicateValues(result)} repeated value group(s).`,
  );
  for (const file of offenders) {
    app.deps.info(
      `• ${file.filename}: ` +
        `${file.duplicateKeys.length} dup key(s), ` +
        `${file.duplicateValues.length} repeated value(s)`,
    );
  }
  if (reportPath) {
    app.deps.info(`Report: ${reportPath}`);
  }
}

export async function duplicateCheckerScreen(app: AppContext): Promise<void> {
  if (!(await app.requireValidProjectRoot())) {
    return;
  }
  app.deps.header("Check duplicates", SUBTITLE);

  const choice = await app.deps.selectLocalization(app.projectRoot());
  if (choice === null) {
    return;
  }

  let keys = 0;
  let values = 0;
  for (const locale of asLocaleList(choice)) {
    const result = checkLocaleDuplicates(app.projectRoot(), locale);
    printDuplicatesResult(app, result, buildDuplicatesReport(result, app.reportsRoot));
    keys += totalDuplicateKeys(result);
    values += totalDuplicateValues(result);
  }

  app.deps.success(`Total: ${keys} duplicate key(s), ${values} repeated value group(s).`);
  await app.deps.pressEnterToContinue();
}
