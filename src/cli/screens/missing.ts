/** "Show what's missing" — pick locales and a category, then run the scan. */

import { type AppContext, asLocaleList, toScanRequest } from "../context";
import type { LocalizationChoice } from "../deps";
import { MENU_CANCELLED, type MenuOption } from "../menus";
import {
  TRANSLATION_TYPES,
  type TranslationType,
  findTranslationType,
  runScan,
} from "../../tools/scan";

/** Menu key of the "every category" entry. */
const ALL_TYPES_KEY = 0;
const ALL_TYPES_LABEL = "All";

/** A category the user actually settled on. */
type ResolvedChoice = { kind: "all" } | { kind: "one"; type: TranslationType };
/** What the category menu came back with. */
type TypeChoice = ResolvedChoice | { kind: "cancelled" } | { kind: "invalid" };

/** The run about to happen, as shown in the confirmation panel. */
interface RunPlan {
  localization: LocalizationChoice;
  label: string;
  exportJsonDiff: boolean;
}

function typeOptions(): MenuOption[] {
  return [
    { key: String(ALL_TYPES_KEY), label: "All types", hint: "every category" },
    ...TRANSLATION_TYPES.map((type) => ({ key: String(type.key), label: type.label })),
  ];
}

async function askTranslationType(app: AppContext): Promise<TypeChoice> {
  const choice = await app.deps.askChoice("Select translation type", typeOptions());
  if (choice === MENU_CANCELLED) return { kind: "cancelled" };
  if (choice === ALL_TYPES_KEY) return { kind: "all" };
  const type = findTranslationType(choice);
  return type === undefined ? { kind: "invalid" } : { kind: "one", type };
}

function printPlan(app: AppContext, plan: RunPlan): void {
  const locales = Array.isArray(plan.localization)
    ? `All (${plan.localization.length})`
    : plan.localization;
  app.deps.panel(
    [
      `Localization   ${locales}`,
      `Type           ${plan.label}`,
      `JSON diff      ${plan.exportJsonDiff ? "yes" : "no"}`,
    ],
    "Run",
  );
}

function printOutcome(app: AppContext, count: number, exportedJsonDiff: boolean): void {
  app.deps.success(`Total missing entries found: ${count}`);
  app.deps.info(`Reports written under ${app.reportsRoot}/`);
  if (exportedJsonDiff) {
    app.deps.info("JSON diff files written next to the markdown reports.");
  }
}

async function runChosenScan(
  app: AppContext,
  localization: LocalizationChoice,
  choice: ResolvedChoice,
): Promise<void> {
  const exportJsonDiff = await app.deps.askConfirm(
    "Also export JSON diff files alongside reports?",
    false,
  );
  const types = choice.kind === "one" ? [choice.type] : undefined;
  const label = choice.kind === "one" ? choice.type.label : ALL_TYPES_LABEL;
  printPlan(app, { localization, label, exportJsonDiff });

  const request = toScanRequest(app, exportJsonDiff);
  printOutcome(app, runScan(request, asLocaleList(localization), types), exportJsonDiff);
}

export async function showMissing(app: AppContext): Promise<void> {
  if (!(await app.requireValidProjectRoot())) {
    return;
  }
  app.deps.header("Show what's missing", `Reference: ${app.sourceLocale()}`);

  const localization = await app.deps.selectLocalization(app.projectRoot());
  if (localization === null) {
    return;
  }

  const choice = await askTranslationType(app);
  if (choice.kind === "cancelled") {
    return;
  }
  if (choice.kind === "invalid") {
    app.deps.error("Invalid choice.");
    await app.deps.pressEnterToContinue();
    return;
  }

  await runChosenScan(app, localization, choice);
  await app.deps.pressEnterToContinue();
}
