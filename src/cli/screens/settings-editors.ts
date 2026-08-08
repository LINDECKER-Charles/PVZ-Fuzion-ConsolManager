/** Individual settings editors, one screen each. */

import type { AppContext } from "../context";
import { AppSettings, COLORS, DENSITIES } from "../../settings";
import { DUMPS_SOURCE, listLocalizations } from "../../parsers/loaders";

/** Settings whose value is a colour name. */
type ColorAttribute = "color" | "accentColor";
/** Settings that are plain on/off switches. */
type ToggleAttribute = "showEmoji" | "showBanner";

const SOURCE_LOCALE_SUBTITLE =
  "The reference used to detect missing translations. " +
  `Pick '${DUMPS_SOURCE}' to diff against the raw game dumps.`;

/** Split a comma-separated alias list, dropping blanks and duplicates. */
export function splitAliases(raw: string): string[] {
  return [...new Set(raw.split(",").map((alias) => alias.trim()).filter(Boolean))];
}

export async function editProjectRoot(app: AppContext): Promise<void> {
  app.deps.header(
    "Change PvZ_Fusion_Translator folder",
    "Leave blank to revert to the bundled default.",
  );
  app.deps.info(`Current: ${app.settings.resolvedProjectRoot()}`);

  const previous = app.settings.projectRoot;
  app.settings.projectRoot = (await app.deps.askText("New absolute path", "")) || null;

  const error = app.settings.validateProjectRoot();
  if (error !== null) {
    app.settings.projectRoot = previous;
    app.deps.error(error);
  } else {
    app.persistSettings();
    app.deps.success("Project root updated.");
  }
  await app.deps.pressEnterToContinue();
}

export async function editSourceLocale(app: AppContext): Promise<void> {
  if (!(await app.requireValidProjectRoot())) {
    return;
  }
  app.deps.header("Change source locale", SOURCE_LOCALE_SUBTITLE);

  const choices = [DUMPS_SOURCE, ...listLocalizations(app.projectRoot())];
  const previous = app.settings.sourceLocale;
  app.settings.sourceLocale = await app.deps.askChoiceFromList(
    "Source locale",
    choices,
    previous,
  );

  const error = app.settings.validateSourceLocale();
  if (error !== null) {
    app.settings.sourceLocale = previous;
    app.deps.error(error);
  } else {
    app.persistSettings();
    app.deps.success(`Source locale set to '${app.settings.sourceLocale}'.`);
  }
  await app.deps.pressEnterToContinue();
}

export async function editColor(
  app: AppContext,
  attribute: ColorAttribute,
  label: string,
): Promise<void> {
  app.settings[attribute] = await app.deps.askChoiceFromList(
    label,
    COLORS,
    app.settings[attribute],
  );
  app.applyTheme();
  app.persistSettings();
}

export async function editDensity(app: AppContext): Promise<void> {
  app.settings.density = await app.deps.askChoiceFromList(
    "Spacing density",
    DENSITIES,
    app.settings.density,
  );
  app.applyTheme();
  app.persistSettings();
}

export function toggle(app: AppContext, attribute: ToggleAttribute): void {
  app.settings[attribute] = !app.settings[attribute];
  app.applyTheme();
  app.persistSettings();
}

export function resetSettings(app: AppContext): void {
  app.settings = new AppSettings();
  app.applyTheme();
  app.persistSettings();
}

export async function editTrelloLabel(app: AppContext): Promise<void> {
  app.deps.header("Trello label");
  app.deps.info(`Current: ${app.settings.trelloLabel}`);
  app.settings.trelloLabel = await app.deps.askText("New label", app.settings.trelloLabel);
  app.persistSettings();
  app.deps.success("Label updated.");
  await app.deps.pressEnterToContinue();
}

/**
 * Set who the "Reviews" block belongs to.
 *
 * Aliases are every other spelling of that person a PR recap may use; they are
 * folded into the canonical name so one block is produced instead of one per
 * spelling.
 */
export async function editDocsLead(app: AppContext): Promise<void> {
  app.deps.header(
    "Documentation lead",
    "The maintainer credited with reviewing everyone else's contributions.",
  );
  const name = await app.deps.askText("Canonical name", app.settings.docsLeadName);
  if (!name) {
    app.deps.error("The lead name cannot be empty.");
    await app.deps.pressEnterToContinue();
    return;
  }
  const aliases = await app.deps.askText(
    "Aliases (comma-separated)",
    app.settings.docsLeadAliases.join(", "),
  );
  app.settings.docsLeadName = name;
  app.settings.docsLeadAliases = splitAliases(aliases);
  app.persistSettings();
  app.deps.success(`Documentation lead set to '${name}'.`);
  await app.deps.pressEnterToContinue();
}

export async function editDocsOutput(app: AppContext): Promise<void> {
  app.deps.header(
    "Default summary output",
    "Where the contribution summary is written by default.",
  );
  app.settings.docsOutput = await app.deps.askText("Output file", app.settings.docsOutput);
  app.persistSettings();
  app.deps.success("Default output updated.");
  await app.deps.pressEnterToContinue();
}
