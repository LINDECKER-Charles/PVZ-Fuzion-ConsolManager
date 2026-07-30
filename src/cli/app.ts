/** Interactive TUI + non-interactive CLI — faithful port of `cli/app.py`.
 *
 * ## Testability seam
 *
 * The Python tests monkeypatched module globals (`_SETTINGS`,
 * `_REPORTS_ROOT_STR`) and UI helpers (`ask_choice`, `select_localization`,
 * `ask_text`, `ask_choice_from_list`, `render_title`, the print-ish helpers and
 * even whole sub-menus like `_show_missing`). ESM bindings can't be reassigned,
 * so the app is modelled as a class {@link App} that holds the mutable state
 * (`settings`, `reportsRoot`) and an injectable {@link AppDeps} bundle of every
 * UI/menu function. Tests build an `App` with overridden deps that return
 * scripted answers and capture writes — the exact equivalent of the pytest seam.
 */

import { stderr, stdout } from "node:process";
import path from "node:path";

import { renderTitle } from "./banner";
import {
  type ConsoleIO,
  type MenuOption,
  askChoice,
  askChoiceFromList,
  askText,
  clearConsole,
  defaultIO,
  error,
  info,
  pressEnterToContinue,
  section,
  selectLocalization,
  success,
  warn,
} from "./menus";
import { THEME, enableAnsiOnWindows } from "./theme";
import { EXPORTS_ROOT, REPORTS_ROOT, TITLE_CANDIDATES } from "../config";
import {
  COLORS,
  DENSITIES,
  AppSettings,
  loadSettings,
  saveSettings,
  settingsPath,
} from "../settings";
import { missingById } from "../core/diff";
import { DUMPS_SOURCE, listLocalizations } from "../parsers/loaders";
import { loadAchievements, loadPlants, loadZombies } from "../parsers/almanac";
import {
  ABYSS_BUFFS_FILE,
  TIPS_FS_FILE,
  TIPS_IZ_FILE,
  TRAVEL_BUFFS_FILE,
  diffAbyssBuffs,
  diffRegexs,
  diffStrings,
  diffTipsFs,
  diffTipsIz,
  diffTravelBuffs,
  stringsFileExists,
} from "../parsers/strings";
import {
  buildAbyssBuffsDiff,
  buildAchievementsDiff,
  buildPlantsDiff,
  buildRegexsDiff,
  buildStringsDiff,
  buildTipsDiff,
  buildTravelBuffsDiff,
  buildZombiesDiff,
} from "../reporting/diff-json";
import {
  buildAbyssBuffsReport,
  buildAchievementReport,
  buildDuplicatesReport,
  buildPlantReport,
  buildRegexsReport,
  buildStringsReport,
  buildTipsReport,
  buildTravelBuffsReport,
  buildZombieReport,
} from "../reporting/markdown";
import {
  type FileDuplicates,
  type LocaleDuplicates,
  checkLocaleDuplicates,
} from "../tools/duplicate-checker";
import {
  type MigrationResult,
  migrateCustomLevels,
  migrateTipsAndBuffs,
} from "../tools/migration";
import { exportTrello } from "../tools/trello-export";

// ---------- Translation-type dispatch -----------------------------------------

export interface TranslationType {
  label: string;
  run(locales: string[], withDiff: boolean): number;
}

type LocalizationChoice = string | string[];

/**
 * Injectable UI/menu dependencies. Every member mirrors a Python helper that
 * tests monkeypatched. `io` carries the underlying ConsoleIO so writes and
 * questions can be captured/scripted.
 */
export interface AppDeps {
  io: ConsoleIO;
  /** Persist settings; returns `null` on success or a reason on failure.
   * Injectable so tests can intercept disk writes (the Python tests
   * monkeypatched `save_settings`). */
  saveSettings(settings: AppSettings): string | null;
  renderTitle(candidates: readonly string[]): void;
  askChoice(title: string, options: readonly MenuOption[], defaultValue?: number): Promise<number>;
  askChoiceFromList(label: string, values: readonly string[], current: string): Promise<string>;
  askText(label: string, defaultValue?: string): Promise<string>;
  selectLocalization(
    root: string,
    opts?: { allowMulti?: boolean; exclude?: readonly string[] | null },
  ): Promise<LocalizationChoice>;
  clearConsole(): void;
  pressEnterToContinue(): Promise<void>;
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  section(title: string): void;
}

/** Build the real dependency bundle from a {@link ConsoleIO}. */
export function realDeps(io: ConsoleIO = defaultIO): AppDeps {
  return {
    io,
    saveSettings,
    renderTitle: (candidates) => renderTitle(candidates, (text) => io.write(text)),
    askChoice: (title, options, defaultValue = -1) => askChoice(title, options, defaultValue, io),
    askChoiceFromList: (label, values, current) => askChoiceFromList(label, values, current, io),
    askText: (label, defaultValue = "") => askText(label, defaultValue, io),
    selectLocalization: (root, opts) => selectLocalization(root, opts, io),
    clearConsole,
    pressEnterToContinue: () => pressEnterToContinue(io),
    info: (message) => info(message, io),
    success: (message) => success(message, io),
    warn: (message) => warn(message, io),
    error: (message) => error(message, io),
    section: (title) => section(title, io),
  };
}

export class App {
  settings: AppSettings;
  reportsRoot: string;
  /** Mutable so tests can point the Trello export at a temp dir (the Python
   * tests monkeypatched `cli_app.EXPORTS_ROOT`). */
  exportsRoot: string;
  readonly deps: AppDeps;
  readonly translationTypes: Map<number, TranslationType>;

  constructor(settings?: AppSettings, deps?: AppDeps, reportsRoot?: string) {
    this.settings = settings ?? loadSettings();
    this.reportsRoot = reportsRoot ?? String(REPORTS_ROOT);
    this.exportsRoot = String(EXPORTS_ROOT);
    this.deps = deps ?? realDeps();
    this.translationTypes = new Map<number, TranslationType>([
      [1, { label: "Plants", run: (l, d) => this.runPlants(l, d) }],
      [2, { label: "Zombies", run: (l, d) => this.runZombies(l, d) }],
      [3, { label: "Achievements", run: (l, d) => this.runAchievements(l, d) }],
      [4, { label: "Strings (UI)", run: (l, d) => this.runStrings(l, d) }],
      [5, { label: "Regex", run: (l, d) => this.runRegexs(l, d) }],
      [6, { label: "Tips (IZ + FS)", run: (l, d) => this.runTips(l, d) }],
      [7, { label: "Abyss buffs", run: (l, d) => this.runAbyssBuffs(l, d) }],
      [8, { label: "Travel buffs", run: (l, d) => this.runTravelBuffs(l, d) }],
    ]);
  }

  private projectRootStr(): string {
    return this.settings.resolvedProjectRoot();
  }

  private sourceLocale(): string {
    return this.settings.sourceLocale;
  }

  private applyTheme(settings: AppSettings): void {
    THEME.configure({
      color: settings.color,
      accent: settings.accentColor,
      density: settings.density,
      showEmoji: settings.showEmoji,
      showBanner: settings.showBanner,
    });
  }

  // ---------- Show-what's-missing dispatch ------------------------------------

  runPlants(locales: string[], withDiff = false): number {
    const src = loadPlants(this.projectRootStr(), this.sourceLocale());
    let total = 0;
    for (const loc of locales) {
      if (loc === this.sourceLocale()) continue;
      const missing = missingById(src, loadPlants(this.projectRootStr(), loc));
      total += missing.length;
      buildPlantReport(missing, loc, this.reportsRoot);
      if (withDiff) buildPlantsDiff(missing, loc, this.reportsRoot);
    }
    return total;
  }

  runZombies(locales: string[], withDiff = false): number {
    const src = loadZombies(this.projectRootStr(), this.sourceLocale());
    let total = 0;
    for (const loc of locales) {
      if (loc === this.sourceLocale()) continue;
      const missing = missingById(src, loadZombies(this.projectRootStr(), loc));
      total += missing.length;
      buildZombieReport(missing, loc, this.reportsRoot);
      if (withDiff) buildZombiesDiff(missing, loc, this.reportsRoot);
    }
    return total;
  }

  runAchievements(locales: string[], withDiff = false): number {
    const src = loadAchievements(this.projectRootStr(), this.sourceLocale());
    let total = 0;
    for (const loc of locales) {
      if (loc === this.sourceLocale()) continue;
      const missing = missingById(src, loadAchievements(this.projectRootStr(), loc));
      total += missing.length;
      buildAchievementReport(missing, loc, this.reportsRoot);
      if (withDiff) buildAchievementsDiff(missing, loc, this.reportsRoot);
    }
    return total;
  }

  runStrings(locales: string[], withDiff = false): number {
    let total = 0;
    for (const loc of locales) {
      if (loc === this.sourceLocale()) continue;
      const entries = diffStrings(this.projectRootStr(), this.sourceLocale(), loc);
      total += entries.length;
      buildStringsReport(entries, loc, this.reportsRoot);
      if (withDiff) buildStringsDiff(entries, loc, this.reportsRoot);
    }
    return total;
  }

  runRegexs(locales: string[], withDiff = false): number {
    let total = 0;
    for (const loc of locales) {
      if (loc === this.sourceLocale()) continue;
      const entries = diffRegexs(this.projectRootStr(), this.sourceLocale(), loc);
      total += entries.length;
      buildRegexsReport(entries, loc, this.reportsRoot);
      if (withDiff) buildRegexsDiff(entries, loc, this.reportsRoot);
    }
    return total;
  }

  runTips(locales: string[], withDiff = false): number {
    let total = 0;
    for (const loc of locales) {
      if (loc === this.sourceLocale()) continue;
      if (stringsFileExists(this.projectRootStr(), loc, TIPS_IZ_FILE)) {
        const entries = diffTipsIz(this.projectRootStr(), this.sourceLocale(), loc);
        total += entries.length;
        buildTipsReport(entries, loc, this.reportsRoot, "iz");
        if (withDiff) buildTipsDiff(entries, loc, this.reportsRoot, "iz");
      } else {
        this.deps.warn(`${loc}: ${TIPS_IZ_FILE} missing — run Translator Tools > Migrate tips & buffs`);
      }

      if (stringsFileExists(this.projectRootStr(), loc, TIPS_FS_FILE)) {
        const entries = diffTipsFs(this.projectRootStr(), this.sourceLocale(), loc);
        total += entries.length;
        buildTipsReport(entries, loc, this.reportsRoot, "fs");
        if (withDiff) buildTipsDiff(entries, loc, this.reportsRoot, "fs");
      } else {
        this.deps.warn(`${loc}: ${TIPS_FS_FILE} missing — run Translator Tools > Migrate tips & buffs`);
      }
    }
    return total;
  }

  runAbyssBuffs(locales: string[], withDiff = false): number {
    let total = 0;
    for (const loc of locales) {
      if (loc === this.sourceLocale()) continue;
      if (!stringsFileExists(this.projectRootStr(), loc, ABYSS_BUFFS_FILE)) {
        this.deps.warn(`${loc}: ${ABYSS_BUFFS_FILE} missing`);
        continue;
      }
      const entries = diffAbyssBuffs(this.projectRootStr(), this.sourceLocale(), loc);
      total += entries.length;
      buildAbyssBuffsReport(entries, loc, this.reportsRoot);
      if (withDiff) buildAbyssBuffsDiff(entries, loc, this.reportsRoot);
    }
    return total;
  }

  runTravelBuffs(locales: string[], withDiff = false): number {
    let total = 0;
    for (const loc of locales) {
      if (loc === this.sourceLocale()) continue;
      if (!stringsFileExists(this.projectRootStr(), loc, TRAVEL_BUFFS_FILE)) {
        this.deps.warn(`${loc}: ${TRAVEL_BUFFS_FILE} missing`);
        continue;
      }
      const entries = diffTravelBuffs(this.projectRootStr(), this.sourceLocale(), loc);
      total += entries.length;
      buildTravelBuffsReport(entries, loc, this.reportsRoot);
      if (withDiff) buildTravelBuffsDiff(entries, loc, this.reportsRoot);
    }
    return total;
  }

  asList(choice: LocalizationChoice): string[] {
    return Array.isArray(choice) ? choice : [choice];
  }

  runAll(locales: string[], withDiff = false): number {
    let total = 0;
    for (const t of this.translationTypes.values()) {
      total += t.run(locales, withDiff);
    }
    return total;
  }

  /**
   * Guard: prints a friendly error and returns false if the configured project
   * root is missing or not a `PvZ_Fusion_Translator/` layout.
   */
  async requireValidProjectRoot(): Promise<boolean> {
    const err = this.settings.validateProjectRoot();
    if (err === null) {
      return true;
    }
    this.deps.error(err);
    this.deps.info("Fix it via [3] Settings → Change PvZ_Fusion_Translator folder.");
    await this.deps.pressEnterToContinue();
    return false;
  }

  async askYesNo(label: string, defaultValue = false): Promise<boolean> {
    const suffix = defaultValue ? "Y/n" : "y/N";
    const raw = (await this.deps.askText(`${label} (${suffix})`, "")).trim().toLowerCase();
    if (!raw) {
      return defaultValue;
    }
    return ["y", "yes", "o", "oui"].includes(raw);
  }

  async showMissing(): Promise<void> {
    if (!(await this.requireValidProjectRoot())) {
      return;
    }
    this.deps.clearConsole();
    const localiz = await this.deps.selectLocalization(this.projectRootStr());
    this.deps.clearConsole();
    this.deps.info(
      `Localization: ${
        !Array.isArray(localiz) ? localiz : "All (" + String(localiz.length) + ")"
      }`,
    );

    const options: MenuOption[] = [{ key: "0", label: "All types" }];
    for (const [k, t] of this.translationTypes) {
      options.push({ key: String(k), label: t.label });
    }
    const choice = await this.deps.askChoice("Select translation type", options, -1);

    if (choice !== 0 && !this.translationTypes.has(choice)) {
      this.deps.clearConsole();
      this.deps.error("Invalid choice.");
      await this.deps.pressEnterToContinue();
      return;
    }

    const withDiff = await this.askYesNo(
      "Also export JSON diff files alongside reports?",
      false,
    );
    this.deps.clearConsole();

    const locales = this.asList(localiz);
    let count: number;
    if (choice === 0) {
      this.deps.info("Type: All");
      count = this.runAll(locales, withDiff);
    } else {
      const trans = this.translationTypes.get(choice)!;
      this.deps.info(`Type: ${trans.label}`);
      count = trans.run(locales, withDiff);
    }

    this.deps.io.write("");
    this.deps.success(`Total missing entries found: ${count}`);
    if (withDiff) {
      this.deps.info("JSON diff files written next to the markdown reports.");
    }
    await this.deps.pressEnterToContinue();
  }

  // ---------- Translator tools ------------------------------------------------

  printMigrationResult(result: MigrationResult): void {
    this.deps.io.write("");
    this.deps.info(`✨ ${result.locale}`);
    for (const f of result.files) {
      if (f.status === "created") {
        const suffix =
          f.migrated === 0 ? " (empty — run a diff to list missing entries)" : "";
        this.deps.success(`  Created ${f.filename} — ${f.migrated}/${f.available} translated${suffix}`);
      } else if (f.status === "skippedExists") {
        this.deps.info(`  ↷ Skipped ${f.filename} (already present)`);
      } else {
        this.deps.warn(`  Skipped ${f.filename} (no source found)`);
      }
    }
    if (result.files.length === 0) {
      this.deps.info("  — nothing to do.");
    }
  }

  async toolMigrateTipsAndBuffs(): Promise<void> {
    if (!(await this.requireValidProjectRoot())) {
      return;
    }
    this.deps.clearConsole();
    this.deps.section("Migrate tips & buffs");
    this.deps.info("Builds tips_iz / tips_fs / abyss_buffs / travel_buffs for a locale,");
    this.deps.info("pulling each translation from its translation_strings.json (found entries only).");

    const locale = (await this.deps.selectLocalization(this.projectRootStr(), {
      allowMulti: false,
      exclude: [this.sourceLocale()],
    })) as string;
    this.deps.clearConsole();
    const result = migrateTipsAndBuffs(this.projectRootStr(), locale);
    this.printMigrationResult(result);
    await this.deps.pressEnterToContinue();
  }

  async toolMigrateCustomLevels(): Promise<void> {
    if (!(await this.requireValidProjectRoot())) {
      return;
    }
    this.deps.clearConsole();
    this.deps.section("Migrate custom levels");
    this.deps.info("Builds customlevel_strings / customlevel_regexs / custom_level_data for a locale.");
    this.deps.info(`Key set is taken from the source locale (${this.sourceLocale()}); translations from the target.`);

    const locale = (await this.deps.selectLocalization(this.projectRootStr(), {
      allowMulti: false,
      exclude: [this.sourceLocale()],
    })) as string;
    this.deps.clearConsole();
    const result = migrateCustomLevels(this.projectRootStr(), locale, this.sourceLocale());
    this.printMigrationResult(result);
    await this.deps.pressEnterToContinue();
  }

  async toolTrelloExport(): Promise<void> {
    if (!(await this.requireValidProjectRoot())) {
      return;
    }
    this.deps.clearConsole();
    this.deps.section("Export Trello CSV");
    this.deps.info("Generates a CSV of every untranslated entry for the chosen locale,");
    this.deps.info("ready for import with the 'Import to Trello by Blue Cat' Power-Up.");

    const locale = (await this.deps.selectLocalization(this.projectRootStr(), {
      allowMulti: false,
      exclude: [this.sourceLocale()],
    })) as string;
    this.deps.clearConsole();
    this.deps.info(`Building Trello export for ${locale}…`);
    const result = exportTrello(
      locale,
      this.exportsRoot,
      this.projectRootStr(),
      this.settings.trelloLabel,
      this.sourceLocale(),
    );

    this.deps.io.write("");
    this.deps.success(`Output folder: ${result.outputDir}`);
    this.deps.success(`README:        ${result.readmePath}`);
    this.deps.io.write("");
    if (mapSize(result.countsByList) === 0) {
      this.deps.info("Nothing to export — the target locale looks fully translated. 🎉");
    } else {
      this.deps.section("Cards per Trello list");
      const names = [...mapKeys(result.countsByList)];
      const width = Math.max(...names.map((n) => n.length)) + 2;
      for (const [name, count] of mapEntries(result.countsByList)) {
        const csvName = path.basename(mapGet(result.csvPaths, name) ?? "");
        this.deps.io.write(
          `    ${name.padEnd(width)} ${String(count).padStart(6)}   ${csvName}`,
        );
      }
      this.deps.io.write(
        `\n    ${"TOTAL".padEnd(width)} ${String(result.totalCards).padStart(6)}`,
      );
    }
    await this.deps.pressEnterToContinue();
  }

  printDuplicatesResult(result: LocaleDuplicates, reportPath: string | null): void {
    this.deps.io.write("");
    this.deps.info(`✨ ${result.locale}`);
    if (!result.files.some(fileHasDuplicates)) {
      this.deps.success("  No duplicates found.");
      return;
    }
    this.deps.success(
      `  ${totalDuplicateKeys(result)} duplicate key(s), ` +
        `${totalDuplicateValues(result)} repeated value group(s).`,
    );
    for (const fd of result.files) {
      if (!fileHasDuplicates(fd)) {
        continue;
      }
      this.deps.info(
        `  • ${fd.filename}: ` +
          `${fd.duplicateKeys.length} dup key(s), ` +
          `${fd.duplicateValues.length} repeated value(s)`,
      );
    }
    if (reportPath) {
      this.deps.info(`  Report: ${reportPath}`);
    }
  }

  async toolDuplicateChecker(): Promise<void> {
    if (!(await this.requireValidProjectRoot())) {
      return;
    }
    this.deps.clearConsole();
    this.deps.section("Check duplicates");
    this.deps.info("Scans translation files for duplicate keys and values shared by multiple keys.");
    this.deps.info("Generates a 'duplicates.md' report for any locale that has matches.");

    const localiz = await this.deps.selectLocalization(this.projectRootStr());
    this.deps.clearConsole();
    const locales = this.asList(localiz);
    this.deps.info(
      `Localization: ${
        !Array.isArray(localiz) ? localiz : "All (" + String(localiz.length) + ")"
      }`,
    );

    let totalDupKeys = 0;
    let totalDupValues = 0;
    for (const loc of locales) {
      const result = checkLocaleDuplicates(this.projectRootStr(), loc);
      const reportPath = buildDuplicatesReport(result, this.reportsRoot);
      this.printDuplicatesResult(result, reportPath);
      totalDupKeys += totalDuplicateKeys(result);
      totalDupValues += totalDuplicateValues(result);
    }

    this.deps.io.write("");
    this.deps.success(
      `Total: ${totalDupKeys} duplicate key(s), ` +
        `${totalDupValues} repeated value group(s).`,
    );
    await this.deps.pressEnterToContinue();
  }

  async translatorTools(): Promise<void> {
    const options: MenuOption[] = [
      { key: "1", label: "Migrate tips & buffs — tips_iz/tips_fs/abyss_buffs/travel_buffs" },
      { key: "2", label: "Migrate custom levels — customlevel_strings/regexs/custom_level_data" },
      { key: "3", label: "Export Trello CSV — missing translations for a locale" },
      { key: "4", label: "Check duplicates — duplicate keys & repeated values" },
      { key: "0", label: "Back" },
    ];
    for (;;) {
      this.deps.clearConsole();
      const choice = await this.deps.askChoice("Translator Tools", options, -1);
      this.deps.clearConsole();
      switch (choice) {
        case 1:
          await this.toolMigrateTipsAndBuffs();
          break;
        case 2:
          await this.toolMigrateCustomLevels();
          break;
        case 3:
          await this.toolTrelloExport();
          break;
        case 4:
          await this.toolDuplicateChecker();
          break;
        case 0:
          return;
        default:
          this.deps.error("Invalid choice.");
          await this.deps.pressEnterToContinue();
      }
    }
  }

  // ---------- Settings --------------------------------------------------------

  /**
   * Write the settings file, reporting a failure as a warning.
   *
   * The in-memory change stays applied either way: an unwritable config
   * directory should cost the user persistence, not the running session.
   */
  persistSettings(): void {
    const err = this.deps.saveSettings(this.settings);
    if (err) {
      this.deps.warn(`Settings could not be saved — ${err}`);
    }
  }

  showCurrentSettings(): void {
    this.deps.section("Current settings");
    const s = this.settings;
    const rootStatus = s.validateProjectRoot();
    const rootBadge = rootStatus === null ? "✅ valid" : `❌ ${rootStatus}`;
    this.deps.io.write(`    Project root     : ${s.resolvedProjectRoot()}  (${rootBadge})`);
    const srcStatus = rootStatus === null ? s.validateSourceLocale() : null;
    const srcBadge = srcStatus === null ? "✅ valid" : `❌ ${srcStatus}`;
    const srcSuffix = rootStatus !== null ? "" : `  (${srcBadge})`;
    this.deps.io.write(`    Source locale    : ${s.sourceLocale}${srcSuffix}`);
    this.deps.io.write(`    Text color       : ${s.color}`);
    this.deps.io.write(`    Accent color     : ${s.accentColor}`);
    this.deps.io.write(`    Density          : ${s.density}`);
    this.deps.io.write(`    Show emoji       : ${pyBool(s.showEmoji)}`);
    this.deps.io.write(`    Show banner      : ${pyBool(s.showBanner)}`);
    this.deps.io.write(`    Trello label     : ${s.trelloLabel}`);
    this.deps.io.write(`    Settings file    : ${settingsPath()}`);
  }

  async editProjectRoot(): Promise<void> {
    this.deps.clearConsole();
    this.deps.section("Change PvZ_Fusion_Translator folder");
    this.deps.info(`Current: ${this.settings.resolvedProjectRoot()}`);
    this.deps.info("Leave blank to revert to the bundled default.");
    const raw = await this.deps.askText("New absolute path", "");
    const previous = this.settings.projectRoot;
    this.settings.projectRoot = raw || null;
    const err = this.settings.validateProjectRoot();
    if (err !== null) {
      this.deps.error(err);
      this.settings.projectRoot = previous;
      await this.deps.pressEnterToContinue();
      return;
    }
    this.persistSettings();
    this.deps.success("Project root updated.");
    await this.deps.pressEnterToContinue();
  }

  async editSourceLocale(): Promise<void> {
    if (!(await this.requireValidProjectRoot())) {
      return;
    }
    this.deps.clearConsole();
    this.deps.section("Change source locale");
    this.deps.info("The source locale is the reference used to detect missing translations.");
    this.deps.info(`Pick '${DUMPS_SOURCE}' to diff every locale against the raw game dumps.`);
    const choices = [DUMPS_SOURCE, ...listLocalizations(this.projectRootStr())];
    const choice = await this.deps.askChoiceFromList(
      "Source locale",
      choices,
      this.settings.sourceLocale,
    );
    const previous = this.settings.sourceLocale;
    this.settings.sourceLocale = choice;
    const err = this.settings.validateSourceLocale();
    if (err !== null) {
      this.deps.error(err);
      this.settings.sourceLocale = previous;
      await this.deps.pressEnterToContinue();
      return;
    }
    this.persistSettings();
    this.deps.success(`Source locale set to '${choice}'.`);
    await this.deps.pressEnterToContinue();
  }

  async editColor(attr: "color" | "accentColor", label: string): Promise<void> {
    const current = this.settings[attr];
    const choice = await this.deps.askChoiceFromList(label, COLORS as readonly string[], current);
    this.settings[attr] = choice;
    this.applyTheme(this.settings);
    this.persistSettings();
  }

  async editDensity(): Promise<void> {
    const choice = await this.deps.askChoiceFromList(
      "Spacing density",
      DENSITIES as readonly string[],
      this.settings.density,
    );
    this.settings.density = choice;
    this.applyTheme(this.settings);
    this.persistSettings();
  }

  toggle(attr: "showEmoji" | "showBanner"): void {
    this.settings[attr] = !this.settings[attr];
    this.applyTheme(this.settings);
    this.persistSettings();
  }

  resetSettings(): void {
    this.settings = new AppSettings();
    this.applyTheme(this.settings);
    this.persistSettings();
  }

  async editTrelloLabel(): Promise<void> {
    this.deps.clearConsole();
    this.deps.section("Trello label");
    this.deps.info(`Current: ${this.settings.trelloLabel}`);
    const newLabel = await this.deps.askText("New label", this.settings.trelloLabel);
    this.settings.trelloLabel = newLabel;
    this.persistSettings();
    this.deps.success("Label updated.");
    await this.deps.pressEnterToContinue();
  }

  async settingsMenu(): Promise<void> {
    const options: MenuOption[] = [
      { key: "1", label: "Change PvZ_Fusion_Translator folder" },
      { key: "2", label: "Change source locale (reference)" },
      { key: "3", label: "Change text color" },
      { key: "4", label: "Change accent color" },
      { key: "5", label: "Change spacing density" },
      { key: "6", label: "Toggle emoji" },
      { key: "7", label: "Toggle ASCII banner" },
      { key: "8", label: "Change Trello label text" },
      { key: "9", label: "Reset to defaults" },
      { key: "0", label: "Back" },
    ];
    for (;;) {
      this.deps.clearConsole();
      this.showCurrentSettings();
      const choice = await this.deps.askChoice("Settings", options, -1);
      this.deps.clearConsole();
      switch (choice) {
        case 1:
          await this.editProjectRoot();
          break;
        case 2:
          await this.editSourceLocale();
          break;
        case 3:
          await this.editColor("color", "Text color");
          break;
        case 4:
          await this.editColor("accentColor", "Accent color");
          break;
        case 5:
          await this.editDensity();
          break;
        case 6:
          this.toggle("showEmoji");
          break;
        case 7:
          this.toggle("showBanner");
          break;
        case 8:
          await this.editTrelloLabel();
          break;
        case 9:
          this.resetSettings();
          this.deps.success("Settings reset to defaults.");
          await this.deps.pressEnterToContinue();
          break;
        case 0:
          return;
        default:
          this.deps.error("Invalid choice.");
          await this.deps.pressEnterToContinue();
      }
    }
  }

  // ---------- Entry point -----------------------------------------------------

  async mainMenu(): Promise<number> {
    const options: MenuOption[] = [
      { key: "1", label: "Show what's missing" },
      { key: "2", label: "Translator tools" },
      { key: "3", label: "Settings" },
      { key: "0", label: "Exit" },
    ];
    return this.deps.askChoice("Main menu", options, -1);
  }

  cmdDiff(lang: string, out: string | null, withDiff = false): number {
    const err = this.settings.validateProjectRoot();
    if (err !== null) {
      stderr.write(`error: ${err}\n`);
      return 2;
    }

    const locales = listLocalizations(this.projectRootStr());
    if (!locales.includes(lang)) {
      stderr.write(`error: locale '${lang}' not found.\n`);
      stderr.write(`available: ${locales.join(", ")}\n`);
      return 2;
    }
    if (lang === this.sourceLocale()) {
      stderr.write(
        `error: '${lang}' is the source locale (${this.sourceLocale()}); nothing to diff.\n`,
      );
      return 2;
    }

    if (out !== null) {
      this.reportsRoot = out;
    }

    stdout.write(`pvzf-console: diff ${lang} → ${this.reportsRoot}/${lang}/\n`);
    const count = this.runAll([lang], withDiff);
    stdout.write(`pvzf-console: ${count} missing entries\n`);
    return 0;
  }

  async runInteractive(): Promise<void> {
    this.deps.clearConsole();
    if (this.settings.showBanner) {
      this.deps.renderTitle(TITLE_CANDIDATES);
    }
    this.deps.info("Translation toolkit for Plants vs Zombies: Fusion.");

    const err = this.settings.validateProjectRoot();
    if (err !== null) {
      this.deps.warn(err);
      this.deps.info("Fix it via [3] Settings → Change PvZ_Fusion_Translator folder.");
    } else {
      const srcErr = this.settings.validateSourceLocale();
      if (srcErr !== null) {
        this.deps.warn(srcErr);
        this.deps.info("Fix it via [3] Settings → Change source locale.");
      }
    }

    for (;;) {
      const choice = await this.mainMenu();
      this.deps.clearConsole();
      switch (choice) {
        case 1:
          await this.showMissing();
          break;
        case 2:
          await this.translatorTools();
          break;
        case 3:
          await this.settingsMenu();
          break;
        case 0:
          this.deps.info("Goodbye!");
          return;
        default:
          this.deps.error("Invalid choice.");
          await this.deps.pressEnterToContinue();
      }
    }
  }

  applyThemeFromSettings(): void {
    this.applyTheme(this.settings);
  }
}

// ---------- argparse-equivalent argv parser -----------------------------------

export interface ParsedCliArgs {
  command: "diff" | null;
  lang?: string;
  out: string | null;
  withDiff: boolean;
}

/** Raised when argv parsing fails — carries the process exit code argparse uses. */
export class CliArgError extends Error {
  readonly code: number;
  constructor(message: string, code = 2) {
    super(message);
    this.name = "CliArgError";
    this.code = code;
  }
}

/**
 * Minimal reproduction of the Python argparse surface:
 *   `diff --lang <LOCALE> [--out DIR] [--with-diff]`
 * Unknown commands / missing required `--lang` raise {@link CliArgError} with
 * exit code 2, matching argparse.
 */
export function parseCliArgs(argv: readonly string[] = []): ParsedCliArgs {
  if (argv.length === 0) {
    return { command: null, out: null, withDiff: false };
  }
  const [command, ...rest] = argv;
  if (command !== "diff") {
    throw new CliArgError(`error: invalid choice: '${command}' (choose from 'diff')`);
  }

  let lang: string | undefined;
  let out: string | null = null;
  let withDiff = false;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--with-diff") {
      withDiff = true;
    } else if (arg === "--lang" || arg.startsWith("--lang=")) {
      const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : rest[++i];
      if (value === undefined) {
        throw new CliArgError("error: argument --lang: expected one argument");
      }
      lang = value;
    } else if (arg === "--out" || arg.startsWith("--out=")) {
      const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : rest[++i];
      if (value === undefined) {
        throw new CliArgError("error: argument --out: expected one argument");
      }
      out = value;
    } else {
      throw new CliArgError(`error: unrecognized arguments: ${arg}`);
    }
  }

  if (lang === undefined) {
    throw new CliArgError("error: the following arguments are required: --lang");
  }

  return { command: "diff", lang, out, withDiff };
}

/** Process exit signal carried out of {@link main}. `cli.ts` applies the code. */
export interface MainResult {
  exitCode: number;
}

export interface MainOptions {
  deps?: AppDeps;
  /** Override the loaded settings (tests; mirrors patching `_SETTINGS`). */
  settings?: AppSettings;
  /** Override the reports root (tests; mirrors patching `_REPORTS_ROOT_STR`). */
  reportsRoot?: string;
}

/**
 * Program entry point. Non-interactive `diff` returns an exit code; the
 * interactive TUI returns 0 when the user exits.
 *
 * `argv` defaults to `process.argv.slice(2)`; `opts` is injectable for tests.
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  opts: MainOptions = {},
): Promise<MainResult> {
  enableAnsiOnWindows();

  const app = new App(opts.settings ?? loadSettings(), opts.deps, opts.reportsRoot);
  app.applyThemeFromSettings();

  let args: ParsedCliArgs;
  try {
    args = parseCliArgs(argv);
  } catch (e) {
    if (e instanceof CliArgError) {
      stderr.write(`${e.message}\n`);
      return { exitCode: e.code };
    }
    throw e;
  }

  if (args.command === "diff") {
    return { exitCode: app.cmdDiff(args.lang!, args.out, args.withDiff) };
  }

  await app.runInteractive();
  return { exitCode: 0 };
}

// ---------- helpers: Map-or-Record tolerance ----------------------------------
//
// The tool modules (written in parallel) may model "dict" fields as either a
// `Map` or a plain object. These accessors tolerate both so the app stays
// decoupled from that choice.

function mapEntries<V>(m: Map<string, V> | Record<string, V>): [string, V][] {
  return m instanceof Map ? [...m.entries()] : Object.entries(m);
}

function mapKeys<V>(m: Map<string, V> | Record<string, V>): string[] {
  return m instanceof Map ? [...m.keys()] : Object.keys(m);
}

function mapSize<V>(m: Map<string, V> | Record<string, V>): number {
  return m instanceof Map ? m.size : Object.keys(m).length;
}

/** Derived counts for duplicate results (the Python `@property` getters). */
function fileHasDuplicates(fd: FileDuplicates): boolean {
  return fd.duplicateKeys.length > 0 || fd.duplicateValues.length > 0;
}

function totalDuplicateKeys(result: LocaleDuplicates): number {
  return result.files.reduce((sum, f) => sum + f.duplicateKeys.length, 0);
}

function totalDuplicateValues(result: LocaleDuplicates): number {
  return result.files.reduce((sum, f) => sum + f.duplicateValues.length, 0);
}

function mapGet<V>(m: Map<string, V> | Record<string, V>, key: string): V | undefined {
  return m instanceof Map ? m.get(key) : m[key];
}

/** Render a boolean the way Python's `str(bool)` does: `True` / `False`. */
function pyBool(value: boolean): string {
  return value ? "True" : "False";
}
