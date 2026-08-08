/** The "Translator tools" sub-menu. */

import type { AppContext } from "../context";
import type { MenuOption } from "../menus";
import { duplicateCheckerScreen } from "./duplicates";
import { type MenuAction, BACK_KEY, runMenuLoop } from "./menu-loop";
import { migrateCustomLevelsScreen, migrateTipsAndBuffsScreen } from "./migration";
import { trelloExportScreen } from "./trello";

const OPTIONS: readonly MenuOption[] = [
  { key: "1", label: "Migrate tips & buffs", hint: "tips_iz · tips_fs · abyss · travel" },
  { key: "2", label: "Migrate custom levels", hint: "customlevel_strings · regexs · data" },
  { key: "3", label: "Export Trello CSV", hint: "missing translations for a locale" },
  { key: "4", label: "Check duplicates", hint: "duplicate keys & repeated values" },
  { key: String(BACK_KEY), label: "Back" },
];

const ACTIONS = new Map<number, MenuAction>([
  [1, migrateTipsAndBuffsScreen],
  [2, migrateCustomLevelsScreen],
  [3, trelloExportScreen],
  [4, duplicateCheckerScreen],
]);

export function translatorTools(app: AppContext): Promise<void> {
  return runMenuLoop(app, {
    title: "Translator tools",
    render: (context) => context.deps.header("Translator tools"),
    options: OPTIONS,
    actions: ACTIONS,
  });
}
