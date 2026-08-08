/** Trello CSV export screen. */

import path from "node:path";

import type { AppContext } from "../context";
import { type TrelloExportResult, exportTrello } from "../../tools/trello-export";

const SUBTITLE =
  "Every untranslated entry for a locale, ready for the " +
  "'Import to Trello by Blue Cat' Power-Up.";
const COUNT_COLUMN_WIDTH = 6;
const NAME_COLUMN_PADDING = 2;
const TOTAL_LABEL = "TOTAL";

function printListTable(app: AppContext, result: TrelloExportResult): void {
  const width =
    Math.max(...result.lists.map((list) => list.name.length), TOTAL_LABEL.length) +
    NAME_COLUMN_PADDING;
  app.deps.section("Cards per Trello list");
  for (const list of result.lists) {
    const count = String(list.cardCount).padStart(COUNT_COLUMN_WIDTH);
    app.deps.io.write(`  ${list.name.padEnd(width)} ${count}   ${path.basename(list.csvPath)}`);
  }
  const total = String(result.totalCards).padStart(COUNT_COLUMN_WIDTH);
  app.deps.io.write(`  ${TOTAL_LABEL.padEnd(width)} ${total}`);
}

function printResult(app: AppContext, result: TrelloExportResult): void {
  app.deps.panel(
    [`Output folder  ${result.outputDir}`, `README         ${result.readmePath}`],
    "Export",
  );
  if (result.lists.length === 0) {
    app.deps.info("Nothing to export — the target locale looks fully translated. 🎉");
  } else {
    printListTable(app, result);
  }
}

export async function trelloExportScreen(app: AppContext): Promise<void> {
  if (!(await app.requireValidProjectRoot())) {
    return;
  }
  app.deps.header("Export Trello CSV", SUBTITLE);

  const choice = await app.deps.selectLocalization(app.projectRoot(), {
    allowMulti: false,
    exclude: [app.sourceLocale()],
  });
  if (typeof choice !== "string") {
    return;
  }

  app.deps.info(`Building Trello export for ${choice}…`);
  printResult(
    app,
    exportTrello({
      locale: choice,
      exportsRoot: app.exportsRoot,
      root: app.projectRoot(),
      label: app.settings.trelloLabel,
      source: app.sourceLocale(),
    }),
  );
  await app.deps.pressEnterToContinue();
}
