import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

import { App } from "../../../src/cli/app";
import { MENU_CANCELLED } from "../../../src/cli/menus";
import { duplicateCheckerScreen, printDuplicatesResult } from "../../../src/cli/screens/duplicates";
import {
  migrateCustomLevelsScreen,
  migrateTipsAndBuffsScreen,
  printMigrationResult,
} from "../../../src/cli/screens/migration";
import { translatorTools } from "../../../src/cli/screens/tools-menu";
import { trelloExportScreen } from "../../../src/cli/screens/trello";
import { AppSettings } from "../../../src/settings";
import { createTempProject, type TempProject } from "../../helpers";
import { fakeDeps, seq } from "../_fakes";

let project: TempProject;
let reports: string;
let exports: string;

function makeApp(
  overrides: Parameters<typeof fakeDeps>[0] = {},
  settings?: AppSettings,
): App {
  const app = new App({
    settings: settings ?? new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
    deps: fakeDeps(overrides),
    reportsRoot: reports,
  });
  app.exportsRoot = exports;
  return app;
}

const brokenRoot = (): AppSettings =>
  new AppSettings({ projectRoot: path.join(project.root, "nope") });

beforeEach(() => {
  project = createTempProject();
  reports = path.join(project.root, "..", "reports");
  exports = path.join(project.root, "..", "exports");
});

afterEach(() => {
  project.cleanup();
});

describe("project-root guard", () => {
  it("stops every tool before it touches the disk", async () => {
    const app = makeApp({}, brokenRoot());
    await expect(migrateTipsAndBuffsScreen(app)).resolves.toBeUndefined();
    await expect(migrateCustomLevelsScreen(app)).resolves.toBeUndefined();
    await expect(trelloExportScreen(app)).resolves.toBeUndefined();
    await expect(duplicateCheckerScreen(app)).resolves.toBeUndefined();
    expect(existsSync(reports)).toBe(false);
    expect(existsSync(exports)).toBe(false);
  });

  it("stops every tool when the locale picker is cancelled", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { x: "y" } } });
    const app = makeApp({ selectLocalization: () => Promise.resolve(null) });
    await migrateTipsAndBuffsScreen(app);
    await migrateCustomLevelsScreen(app);
    await trelloExportScreen(app);
    await duplicateCheckerScreen(app);
    expect(existsSync(reports)).toBe(false);
    expect(existsSync(exports)).toBe(false);
  });
});

describe("migration screens", () => {
  it("prints one line per file status", () => {
    const messages: string[] = [];
    const app = makeApp({
      success: (m) => messages.push(m),
      info: (m) => messages.push(m),
      warn: (m) => messages.push(m),
    });
    printMigrationResult(app, { locale: "French", files: [] });
    printMigrationResult(app, {
      locale: "French",
      files: [
        { filename: "tips_iz.json", status: "created", migrated: 3, available: 5 },
        { filename: "tips_fs.json", status: "created", migrated: 0, available: 4 },
        { filename: "abyss_buffs.json", status: "skippedExists", migrated: 0, available: 0 },
        { filename: "travel_buffs.json", status: "sourceMissing", migrated: 0, available: 0 },
      ],
    });
    const text = messages.join("\n");
    expect(text).toContain("Nothing to do.");
    expect(text).toContain("Created tips_iz.json — 3/5 translated");
    expect(text).toContain("(empty — run a diff to list missing entries)");
    expect(text).toContain("Skipped abyss_buffs.json (already present)");
    expect(text).toContain("Skipped travel_buffs.json (no source found)");
  });

  it("runs the tips migration to completion", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { x: "y" } } });
    const app = makeApp({ selectLocalization: () => Promise.resolve("French") });
    await expect(migrateTipsAndBuffsScreen(app)).resolves.toBeUndefined();
  });

  it("runs the custom-level migration to completion", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { x: "y" } } });
    const app = makeApp({ selectLocalization: () => Promise.resolve("French") });
    await expect(migrateCustomLevelsScreen(app)).resolves.toBeUndefined();
  });
});

describe("trello export screen", () => {
  it("writes the export and lists the cards per Trello list", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k1: "Hello" } } });
    project.makeLocale("French");
    const written: string[] = [];
    const app = makeApp({
      selectLocalization: () => Promise.resolve("French"),
      io: {
        question: () => Promise.resolve(""),
        write: (text: string) => written.push(text),
      },
    });
    await trelloExportScreen(app);
    const text = written.join("\n");
    expect(text).toContain("Strings");
    expect(text).toContain("TOTAL");
    expect(existsSync(path.join(exports, "French", "trello_README.md"))).toBe(true);
  });

  it("says so when the locale is fully translated", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "v" } } });
    project.makeLocale("French", { strings: { "translation_strings.json": { k: "v-fr" } } });
    const notes: string[] = [];
    const app = makeApp({
      selectLocalization: () => Promise.resolve("French"),
      info: (m) => notes.push(m),
    });
    await trelloExportScreen(app);
    expect(notes.join()).toContain("Nothing to export");
  });
});

describe("duplicate checker screen", () => {
  it("reports a clean locale", () => {
    const messages: string[] = [];
    const app = makeApp({ success: (m) => messages.push(m) });
    printDuplicatesResult(app, { locale: "French", files: [] }, null);
    expect(messages.join()).toContain("No duplicates found.");
  });

  it("lists only the files with findings", () => {
    const messages: string[] = [];
    const app = makeApp({ success: (m) => messages.push(m), info: (m) => messages.push(m) });
    printDuplicatesResult(
      app,
      {
        locale: "French",
        files: [
          { filename: "x.json", duplicateKeys: [["a", 2]], duplicateValues: [], isMissing: false },
          { filename: "y.json", duplicateKeys: [], duplicateValues: [], isMissing: false },
        ],
      },
      "/tmp/x.md",
    );
    const text = messages.join("\n");
    expect(text).toContain("x.json");
    expect(text).not.toContain("y.json");
    expect(text).toContain("Report: /tmp/x.md");
  });

  it("scans every locale and writes a report", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "Hi", b: "Hi" } } });
    const app = makeApp({ selectLocalization: () => Promise.resolve(["French"]) });
    await duplicateCheckerScreen(app);
    expect(existsSync(path.join(reports, "French", "duplicates.md"))).toBe(true);
  });
});

describe("translator tools menu", () => {
  it("walks each branch and exits on Back", async () => {
    project.makeLocale("French", { strings: { "translation_strings.json": { x: "y" } } });
    const choices = seq(1, 2, 3, 4, 99, 0);
    const app = makeApp({
      askChoice: () => Promise.resolve(choices()),
      selectLocalization: () => Promise.resolve("French"),
    });
    await expect(translatorTools(app)).resolves.toBeUndefined();
  });

  it("exits when the menu is cancelled", async () => {
    const app = makeApp({ askChoice: () => Promise.resolve(MENU_CANCELLED) });
    await expect(translatorTools(app)).resolves.toBeUndefined();
  });
});
