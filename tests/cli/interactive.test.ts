import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { createTempProject, type TempProject } from "../helpers";
import { App } from "../../src/cli/app";
import { AppSettings } from "../../src/settings";
import { THEME } from "../../src/cli/theme";
import { fakeDeps, seq } from "./_fakes";

/** Build an App on a temp project with silenced deps, plus a reports dir. */
function makeApp(
  project: TempProject,
  overrides: Parameters<typeof fakeDeps>[0] = {},
  settings?: AppSettings,
): { app: App; reports: string } {
  const reports = path.join(project.root, "..", "reports");
  const s = settings ?? new AppSettings({ projectRoot: project.root, sourceLocale: "English" });
  return { app: new App(s, fakeDeps(overrides), reports), reports };
}

describe("interactive TUI", () => {
  let project: TempProject;

  beforeEach(() => {
    project = createTempProject();
  });
  afterEach(() => {
    project.cleanup();
    vi.restoreAllMocks();
  });

  // ---------- _run_* source-locale-skip branches ------------------------------

  it("run helpers skip when only the source locale is provided", () => {
    const { app } = makeApp(project);
    expect(app.runPlants(["English"])).toBe(0);
    expect(app.runZombies(["English"])).toBe(0);
    expect(app.runAchievements(["English"])).toBe(0);
    expect(app.runRegexs(["English"])).toBe(0);
    expect(app.runTips(["English"])).toBe(0);
    expect(app.runAbyssBuffs(["English"])).toBe(0);
    expect(app.runTravelBuffs(["English"])).toBe(0);
  });

  // ---------- runTips: present + missing paths --------------------------------

  it("runTips writes reports when files are present", () => {
    const { app, reports } = makeApp(project);
    project.makeLocale("English", {
      strings: { "tips_iz.json": { a: "A" }, "tips_fs.json": { b: "B" } },
    });
    project.makeLocale("French", { strings: { "tips_iz.json": {}, "tips_fs.json": {} } });
    const count = app.runTips(["French"], true);
    expect(count).toBe(2);
    expect(existsSync(path.join(reports, "French", "missing_tips_iz.md"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "tips_iz_diff.json"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "tips_fs_diff.json"))).toBe(true);
  });

  it("runTips without diff skips JSON export", () => {
    const { app, reports } = makeApp(project);
    project.makeLocale("English", {
      strings: { "tips_iz.json": { a: "A" }, "tips_fs.json": { b: "B" } },
    });
    project.makeLocale("French", { strings: { "tips_iz.json": {}, "tips_fs.json": {} } });
    app.runTips(["French"], false);
    expect(existsSync(path.join(reports, "French", "tips_iz_diff.json"))).toBe(false);
    expect(existsSync(path.join(reports, "French", "tips_fs_diff.json"))).toBe(false);
  });

  it("runAbyss/runTravel with present files write diffs", () => {
    const { app, reports } = makeApp(project);
    project.makeLocale("English", {
      strings: { "abyss_buffs.json": { a: "A" }, "travel_buffs.json": { cat: { k: "V" } } },
    });
    project.makeLocale("French", { strings: { "abyss_buffs.json": {}, "travel_buffs.json": {} } });
    expect(app.runAbyssBuffs(["French"], true)).toBe(1);
    expect(app.runTravelBuffs(["French"], true)).toBe(1);
    expect(existsSync(path.join(reports, "French", "abyss_buffs_diff.json"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "travel_buffs_diff.json"))).toBe(true);
  });

  // ---------- applyTheme ------------------------------------------------------

  it("applyTheme passes settings through to THEME.configure", () => {
    const configure = vi.spyOn(THEME, "configure").mockImplementation(() => {});
    const { app } = makeApp(
      project,
      {},
      new AppSettings({
        color: "red",
        accentColor: "cyan",
        density: "compact",
        showEmoji: false,
        showBanner: true,
      }),
    );
    app.applyThemeFromSettings();
    expect(configure).toHaveBeenCalledWith({
      color: "red",
      accent: "cyan",
      density: "compact",
      showEmoji: false,
      showBanner: true,
    });
  });

  // ---------- requireValidProjectRoot ----------------------------------------

  it("requireValidProjectRoot returns false when invalid", async () => {
    const { app } = makeApp(
      project,
      {},
      new AppSettings({ projectRoot: path.join(project.root, "nope") }),
    );
    expect(await app.requireValidProjectRoot()).toBe(false);
  });

  // ---------- showMissing -----------------------------------------------------

  it("showMissing returns early when the root is invalid", async () => {
    const { app } = makeApp(
      project,
      {},
      new AppSettings({ projectRoot: path.join(project.root, "nope") }),
    );
    await expect(app.showMissing()).resolves.toBeUndefined();
  });

  it("showMissing runs all types with diff for a single locale", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const { app, reports } = makeApp(project, {
      selectLocalization: () => Promise.resolve("French"),
      askChoice: () => Promise.resolve(0), // All types
      askText: () => Promise.resolve("y"), // with_diff = true
    });
    await app.showMissing();
    expect(existsSync(path.join(reports, "French", "missing_strings.md"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "strings_diff.json"))).toBe(true);
  });

  it("showMissing runs a specific type for all locales", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const { app, reports } = makeApp(project, {
      selectLocalization: () => Promise.resolve(["English", "French"]),
      askChoice: () => Promise.resolve(4), // Strings
      askText: () => Promise.resolve(""), // default no
    });
    await app.showMissing();
    expect(existsSync(path.join(reports, "French", "missing_strings.md"))).toBe(true);
  });

  it("showMissing rejects an invalid choice", async () => {
    project.makeLocale("French");
    const { app, reports } = makeApp(project, {
      selectLocalization: () => Promise.resolve("French"),
      askChoice: () => Promise.resolve(99),
    });
    await app.showMissing();
    expect(existsSync(path.join(reports, "French"))).toBe(false);
  });

  // ---------- printMigrationResult --------------------------------------------

  it("printMigrationResult handles every branch", () => {
    const { app } = makeApp(project);
    app.printMigrationResult({ locale: "French", files: [] });
    app.printMigrationResult({
      locale: "French",
      files: [
        { filename: "tips_iz.json", status: "created", migrated: 3, available: 5 },
        { filename: "tips_fs.json", status: "created", migrated: 0, available: 4 },
        { filename: "abyss_buffs.json", status: "skippedExists", migrated: 0, available: 0 },
        { filename: "travel_buffs.json", status: "sourceMissing", migrated: 0, available: 0 },
      ],
    });
  });

  // ---------- printDuplicatesResult -------------------------------------------

  it("printDuplicatesResult handles clean and with-findings cases", () => {
    const { app } = makeApp(project);
    app.printDuplicatesResult(
      { locale: "French", files: [] },
      null,
    );
    app.printDuplicatesResult(
      {
        locale: "French",
        files: [
          {
            filename: "x.json",
            duplicateKeys: [["a", 2]],
            duplicateValues: [],
            missing: false,
          },
          {
            filename: "y.json",
            duplicateKeys: [],
            duplicateValues: [],
            missing: false,
          },
        ],
      },
      "/tmp/x.md",
    );
  });

  // ---------- tool guards: early return on invalid root -----------------------

  it("tool entry points return early when the root is invalid", async () => {
    const { app } = makeApp(
      project,
      {},
      new AppSettings({ projectRoot: path.join(project.root, "x") }),
    );
    await expect(app.toolMigrateTipsAndBuffs()).resolves.toBeUndefined();
    await expect(app.toolMigrateCustomLevels()).resolves.toBeUndefined();
    await expect(app.toolTrelloExport()).resolves.toBeUndefined();
    await expect(app.toolDuplicateChecker()).resolves.toBeUndefined();
    await expect(app.editSourceLocale()).resolves.toBeUndefined();
  });

  // ---------- toolDuplicateChecker --------------------------------------------

  it("toolDuplicateChecker scans all locales and writes a report", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "Hi", b: "Hi" } } });
    const { app, reports } = makeApp(project, {
      selectLocalization: () => Promise.resolve(["French"]),
    });
    await app.toolDuplicateChecker();
    expect(existsSync(path.join(reports, "French", "duplicates.md"))).toBe(true);
  });

  it("toolMigrateTipsAndBuffs runs to completion", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { x: "y" } } });
    const { app } = makeApp(project, { selectLocalization: () => Promise.resolve("French") });
    await expect(app.toolMigrateTipsAndBuffs()).resolves.toBeUndefined();
  });

  it("toolMigrateCustomLevels runs to completion", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { x: "y" } } });
    const { app } = makeApp(project, { selectLocalization: () => Promise.resolve("French") });
    await expect(app.toolMigrateCustomLevels()).resolves.toBeUndefined();
  });

  // ---------- translatorTools dispatch ----------------------------------------

  it("translatorTools walks each branch and exits on Back", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { x: "y" } } });
    const choices = seq(1, 2, 3, 4, 99, 0);
    const { app } = makeApp(project, {
      askChoice: () => Promise.resolve(choices()),
      selectLocalization: () => Promise.resolve("French"),
    });
    app.exportsRoot = path.join(project.root, "..", "exports");
    await expect(app.translatorTools()).resolves.toBeUndefined();
  });

  // ---------- settings sub-actions --------------------------------------------

  it("showCurrentSettings prints for valid and invalid roots", () => {
    mkdirSync(path.join(project.root, "Localization", "English"), { recursive: true });
    const valid = makeApp(project).app;
    valid.showCurrentSettings();
    const invalid = makeApp(
      project,
      {},
      new AppSettings({ projectRoot: path.join(project.root, "nope") }),
    ).app;
    invalid.showCurrentSettings();
  });

  it("editProjectRoot accepts a valid path", async () => {
    const { app } = makeApp(project, { askText: () => Promise.resolve(project.root) });
    await app.editProjectRoot();
    expect(app.settings.projectRoot).toBe(project.root);
  });

  it("editProjectRoot rejects an invalid path and restores the previous value", async () => {
    const { app } = makeApp(project, {
      askText: () => Promise.resolve(path.join(project.root, "nope")),
    });
    const previous = app.settings.projectRoot;
    await app.editProjectRoot();
    expect(app.settings.projectRoot).toBe(previous);
  });

  it("editSourceLocale saves a valid choice", async () => {
    project.makeLocale("English");
    project.makeLocale("French");
    const { app } = makeApp(project, {
      askChoiceFromList: () => Promise.resolve("French"),
    });
    await app.editSourceLocale();
    expect(app.settings.sourceLocale).toBe("French");
  });

  it("editSourceLocale reverts on an invalid choice", async () => {
    project.makeLocale("English");
    const { app } = makeApp(project, {
      askChoiceFromList: () => Promise.resolve("Klingon"),
    });
    const previous = app.settings.sourceLocale;
    await app.editSourceLocale();
    expect(app.settings.sourceLocale).toBe(previous);
  });

  it("editColor / editDensity / toggle / editTrelloLabel mutate settings", async () => {
    vi.spyOn(THEME, "configure").mockImplementation(() => {});
    const listAnswers = seq("red", "compact");
    const { app } = makeApp(project, {
      askChoiceFromList: () => Promise.resolve(listAnswers()),
      askText: () => Promise.resolve("new label"),
    });
    await app.editColor("color", "Text color");
    expect(app.settings.color).toBe("red");
    await app.editDensity();
    expect(app.settings.density).toBe("compact");
    const before = app.settings.showEmoji;
    app.toggle("showEmoji");
    expect(app.settings.showEmoji).toBe(!before);
    await app.editTrelloLabel();
    expect(app.settings.trelloLabel).toBe("new label");
  });

  it("resetSettings restores the defaults", async () => {
    vi.spyOn(THEME, "configure").mockImplementation(() => {});
    const { app } = makeApp(project);
    app.resetSettings();
    expect(app.settings.sourceLocale).toBe("English");
    expect(app.settings.projectRoot).toBeNull();
  });

  it("settingsMenu walks every branch and exits on Back", async () => {
    vi.spyOn(THEME, "configure").mockImplementation(() => {});
    project.makeLocale("English");
    project.makeLocale("French");
    const choices = seq(1, 2, 3, 4, 5, 6, 7, 8, 9, 99, 0);
    const texts = seq(project.root, "new label");
    const lists = seq("French", "red", "cyan", "compact");
    const { app } = makeApp(project, {
      askChoice: () => Promise.resolve(choices()),
      askText: () => Promise.resolve(texts()),
      askChoiceFromList: () => Promise.resolve(lists()),
    });
    await expect(app.settingsMenu()).resolves.toBeUndefined();
  });

  // ---------- mainMenu / runInteractive ---------------------------------------

  it("mainMenu returns the user's choice", async () => {
    const { app } = makeApp(project, { askChoice: () => Promise.resolve(1) });
    expect(await app.mainMenu()).toBe(1);
  });

  it("runInteractive walks each top-level choice", async () => {
    project.makeLocale("English");
    project.makeLocale("French");
    const choices = seq(1, 2, 3, 99, 0);
    const { app } = makeApp(project, { askChoice: () => Promise.resolve(choices()) });
    vi.spyOn(app, "showMissing").mockResolvedValue(undefined);
    vi.spyOn(app, "translatorTools").mockResolvedValue(undefined);
    vi.spyOn(app, "settingsMenu").mockResolvedValue(undefined);
    await expect(app.runInteractive()).resolves.toBeUndefined();
  });

  it("runInteractive warns on an invalid root", async () => {
    const { app } = makeApp(
      project,
      { askChoice: () => Promise.resolve(0) },
      new AppSettings({
        projectRoot: path.join(project.root, "nope"),
        sourceLocale: "English",
        showBanner: false,
      }),
    );
    await expect(app.runInteractive()).resolves.toBeUndefined();
  });

  it("runInteractive warns on an invalid source locale", async () => {
    project.makeLocale("English");
    const { app } = makeApp(
      project,
      { askChoice: () => Promise.resolve(0) },
      new AppSettings({
        projectRoot: project.root,
        sourceLocale: "Klingon",
        showBanner: false,
      }),
    );
    await expect(app.runInteractive()).resolves.toBeUndefined();
  });

  it("runInteractive renders the banner when enabled", async () => {
    project.makeLocale("English");
    let rendered = false;
    const { app } = makeApp(
      project,
      {
        askChoice: () => Promise.resolve(0),
        renderTitle: () => {
          rendered = true;
        },
      },
      new AppSettings({ projectRoot: project.root, sourceLocale: "English", showBanner: true }),
    );
    await app.runInteractive();
    expect(rendered).toBe(true);
  });
});
