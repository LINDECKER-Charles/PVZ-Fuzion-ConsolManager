/** The "Settings" tab: current values, then one editor per entry. */

import type { AppContext } from "../context";
import type { MenuOption } from "../menus";
import { THEME } from "../theme";
import { settingsPath } from "../../settings-storage";
import { BACK_KEY, type MenuAction, runMenuLoop, syncAction } from "./menu-loop";
import {
  editDensity,
  editDocsLead,
  editDocsOutput,
  editProjectRoot,
  editSourceLocale,
  editTrelloLabel,
  editColor,
  resetSettings,
  toggle,
} from "./settings-editors";

const OPTIONS: readonly MenuOption[] = [
  { key: "1", label: "Change PvZ_Fusion_Translator folder" },
  { key: "2", label: "Change source locale", hint: "reference for diffs" },
  { key: "3", label: "Change text color" },
  { key: "4", label: "Change accent color" },
  { key: "5", label: "Change spacing density" },
  { key: "6", label: "Toggle emoji" },
  { key: "7", label: "Toggle ASCII banner" },
  { key: "8", label: "Change Trello label text" },
  { key: "9", label: "Change documentation lead", hint: "name & aliases" },
  { key: "10", label: "Change default summary output" },
  { key: "11", label: "Reset to defaults" },
  { key: String(BACK_KEY), label: "Back" },
];

async function resetToDefaults(app: AppContext): Promise<void> {
  resetSettings(app);
  app.deps.success("Settings reset to defaults.");
  await app.deps.pressEnterToContinue();
}

const ACTIONS = new Map<number, MenuAction>([
  [1, editProjectRoot],
  [2, editSourceLocale],
  [3, (app) => editColor(app, "color", "Text color")],
  [4, (app) => editColor(app, "accentColor", "Accent color")],
  [5, editDensity],
  [6, syncAction((app) => toggle(app, "showEmoji"))],
  [7, syncAction((app) => toggle(app, "showBanner"))],
  [8, editTrelloLabel],
  [9, editDocsLead],
  [10, editDocsOutput],
  [11, resetToDefaults],
]);

/** `✅` or `❌ <reason>` for the configured project root. */
function rootBadge(app: AppContext): string {
  const error = app.settings.validateProjectRoot();
  return error === null ? THEME.okBadge : `${THEME.koBadge} ${error}`;
}

/** Source-locale badge — blank while the root itself is broken. */
function sourceBadge(app: AppContext): string {
  if (app.settings.validateProjectRoot() !== null) {
    return "";
  }
  const error = app.settings.validateSourceLocale();
  return error === null ? `  ${THEME.okBadge}` : `  ${THEME.koBadge} ${error}`;
}

export function showCurrentSettings(app: AppContext): void {
  const settings = app.settings;
  app.deps.panel(
    [
      `Project root     ${settings.resolvedProjectRoot()}  ${rootBadge(app)}`,
      `Source locale    ${settings.sourceLocale}${sourceBadge(app)}`,
      `Text color       ${settings.color}`,
      `Accent color     ${settings.accentColor}`,
      `Density          ${settings.density}`,
      `Show emoji       ${settings.showEmoji}`,
      `Show banner      ${settings.showBanner}`,
      `Trello label     ${settings.trelloLabel}`,
      `Docs lead        ${settings.docsLeadName}`,
      `Docs aliases     ${settings.docsLeadAliases.join(", ") || "—"}`,
      `Docs output      ${settings.docsOutput}`,
      `Settings file    ${settingsPath()}`,
    ],
    "Current settings",
  );
}

export function settingsMenu(app: AppContext): Promise<void> {
  return runMenuLoop(app, {
    title: "Settings",
    render: (context) => {
      context.deps.header("Settings");
      showCurrentSettings(context);
    },
    options: OPTIONS,
    actions: ACTIONS,
  });
}
