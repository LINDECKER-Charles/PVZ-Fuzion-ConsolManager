/** Translator tools that build missing locale files from the game dumps. */

import type { AppContext } from "../context";
import {
  type MigrationResult,
  migrateCustomLevels,
  migrateTipsAndBuffs,
} from "../../tools/migration";

const TIPS_SUBTITLE =
  "Builds tips_iz / tips_fs / abyss_buffs / travel_buffs, pulling each " +
  "translation from translation_strings.json.";

export function printMigrationResult(app: AppContext, result: MigrationResult): void {
  app.deps.section(result.locale);
  if (result.files.length === 0) {
    app.deps.info("Nothing to do.");
    return;
  }
  for (const file of result.files) {
    if (file.status === "created") {
      const suffix = file.migrated === 0 ? " (empty — run a diff to list missing entries)" : "";
      app.deps.success(
        `Created ${file.filename} — ${file.migrated}/${file.available} translated${suffix}`,
      );
    } else if (file.status === "skippedExists") {
      app.deps.info(`Skipped ${file.filename} (already present)`);
    } else {
      app.deps.warn(`Skipped ${file.filename} (no source found)`);
    }
  }
}

/** Ask for a single target locale, excluding the reference one. */
async function askTargetLocale(app: AppContext): Promise<string | null> {
  const choice = await app.deps.selectLocalization(app.projectRoot(), {
    allowMulti: false,
    exclude: [app.sourceLocale()],
  });
  return typeof choice === "string" ? choice : null;
}

export async function migrateTipsAndBuffsScreen(app: AppContext): Promise<void> {
  if (!(await app.requireValidProjectRoot())) {
    return;
  }
  app.deps.header("Migrate tips & buffs", TIPS_SUBTITLE);

  const locale = await askTargetLocale(app);
  if (locale === null) {
    return;
  }
  printMigrationResult(app, migrateTipsAndBuffs(app.projectRoot(), locale));
  await app.deps.pressEnterToContinue();
}

export async function migrateCustomLevelsScreen(app: AppContext): Promise<void> {
  if (!(await app.requireValidProjectRoot())) {
    return;
  }
  app.deps.header(
    "Migrate custom levels",
    "Builds customlevel_strings / customlevel_regexs / custom_level_data. " +
      `Key set from ${app.sourceLocale()}.`,
  );

  const locale = await askTargetLocale(app);
  if (locale === null) {
    return;
  }
  printMigrationResult(
    app,
    migrateCustomLevels(app.projectRoot(), locale, app.sourceLocale()),
  );
  await app.deps.pressEnterToContinue();
}
