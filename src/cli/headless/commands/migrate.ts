/** `migrate-tips` / `migrate-levels` — headless equivalents of the two migration screens. */

import {
  type FileMigrationResult,
  type MigrationResult,
  migrateCustomLevels,
  migrateTipsAndBuffs,
} from "../../../tools/migration";
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

type Migration = (app: AppContext, locale: string) => MigrationResult;

function describeFile(file: FileMigrationResult): string {
  switch (file.status) {
    case "created":
      return `created ${file.filename} (${file.migrated}/${file.available} translated)`;
    case "skippedExists":
      return `skipped ${file.filename} (already present)`;
    case "sourceMissing":
      return `skipped ${file.filename} (no source found)`;
  }
}

/** Validate the target locale, run `migration`, report each file. */
function runMigration(app: AppContext, input: CommandInput, migration: Migration): CommandResult {
  const lang = requiredValue(input, LANG_OPTION_NAME);
  const rejection = rejectTargetLocale(app, lang);
  if (rejection !== null) {
    return rejectUsage(rejection);
  }
  const result = migration(app, lang);
  const lines =
    result.files.length === 0 ? [`${lang}: nothing to do`] : result.files.map(describeFile);
  return succeed(lines, { ...result });
}

function migrationCommand(name: string, summary: string, migration: Migration): HeadlessCommand {
  return {
    name,
    summary,
    options: [LANG_OPTION],
    needsProjectRoot: true,
    run: (app, input) => runMigration(app, input, migration),
  };
}

/** Both migrations; an existing file is never overwritten. */
export const MIGRATION_COMMANDS: readonly HeadlessCommand[] = [
  migrationCommand(
    "migrate-tips",
    "Create a locale's missing tips_iz / tips_fs / abyss_buffs / travel_buffs files.",
    (app, locale) => migrateTipsAndBuffs(app.projectRoot(), locale),
  ),
  migrationCommand(
    "migrate-levels",
    "Create a locale's missing customlevel_strings / regexs / custom_level_data files.",
    (app, locale) => migrateCustomLevels(app.projectRoot(), locale, app.sourceLocale()),
  ),
];
