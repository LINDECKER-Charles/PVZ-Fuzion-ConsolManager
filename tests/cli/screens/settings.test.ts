import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

import { App } from "../../../src/cli/app";
import { MENU_CANCELLED } from "../../../src/cli/menus";
import { settingsMenu, showCurrentSettings } from "../../../src/cli/screens/settings";
import {
  editColor,
  editDensity,
  editDocsLead,
  editDocsOutput,
  editProjectRoot,
  editSourceLocale,
  editTrelloLabel,
  resetSettings,
  splitAliases,
  toggle,
} from "../../../src/cli/screens/settings-editors";
import { THEME } from "../../../src/cli/theme";
import { AppSettings } from "../../../src/settings";
import { createTempProject, type TempProject } from "../../helpers";
import { fakeDeps, seq } from "../_fakes";

let project: TempProject;

function makeApp(
  overrides: Parameters<typeof fakeDeps>[0] = {},
  settings?: AppSettings,
): App {
  return new App({
    settings: settings ?? new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
    deps: fakeDeps(overrides),
    reportsRoot: path.join(project.root, "..", "reports"),
  });
}

beforeEach(() => {
  project = createTempProject();
  vi.spyOn(THEME, "configure").mockImplementation(() => {});
});

afterEach(() => {
  project.cleanup();
  vi.restoreAllMocks();
});

describe("splitAliases", () => {
  it("trims, drops blanks and de-duplicates", () => {
    expect(splitAliases(" @ada , ada-l ,, @ada ")).toEqual(["@ada", "ada-l"]);
    expect(splitAliases("")).toEqual([]);
  });
});

describe("showCurrentSettings", () => {
  it("renders the values for a valid and an invalid root", () => {
    const panels: string[][] = [];
    const capture = { panel: (lines: readonly string[]) => panels.push([...lines]) };
    project.makeLocale("English");
    showCurrentSettings(makeApp(capture));
    showCurrentSettings(
      makeApp(capture, new AppSettings({ projectRoot: path.join(project.root, "nope") })),
    );
    const [valid, invalid] = panels.map((lines) => lines.join("\n"));
    expect(valid).toContain("Source locale    English");
    expect(valid).toContain("Settings file");
    expect(invalid).toContain("does not exist");
  });
});

describe("project root and source locale", () => {
  it("accepts a valid path", async () => {
    const app = makeApp({ askText: () => Promise.resolve(project.root) });
    await editProjectRoot(app);
    expect(app.settings.projectRoot).toBe(project.root);
  });

  it("restores the previous value when the path is invalid", async () => {
    const app = makeApp({ askText: () => Promise.resolve(path.join(project.root, "nope")) });
    const previous = app.settings.projectRoot;
    await editProjectRoot(app);
    expect(app.settings.projectRoot).toBe(previous);
  });

  it("saves a valid source locale", async () => {
    project.makeLocale("English");
    project.makeLocale("French");
    const app = makeApp({ askChoiceFromList: () => Promise.resolve("French") });
    await editSourceLocale(app);
    expect(app.settings.sourceLocale).toBe("French");
  });

  it("reverts an unknown source locale", async () => {
    project.makeLocale("English");
    const app = makeApp({ askChoiceFromList: () => Promise.resolve("Klingon") });
    const previous = app.settings.sourceLocale;
    await editSourceLocale(app);
    expect(app.settings.sourceLocale).toBe(previous);
  });

  it("refuses to edit the source locale on a broken root", async () => {
    const app = makeApp({}, new AppSettings({ projectRoot: path.join(project.root, "nope") }));
    await expect(editSourceLocale(app)).resolves.toBeUndefined();
  });
});

describe("appearance and labels", () => {
  it("edits colors, density, toggles and the Trello label", async () => {
    const lists = seq("red", "compact");
    const app = makeApp({
      askChoiceFromList: () => Promise.resolve(lists()),
      askText: () => Promise.resolve("new label"),
    });
    await editColor(app, "color", "Text color");
    expect(app.settings.color).toBe("red");
    await editDensity(app);
    expect(app.settings.density).toBe("compact");

    const before = app.settings.showEmoji;
    toggle(app, "showEmoji");
    expect(app.settings.showEmoji).toBe(!before);

    await editTrelloLabel(app);
    expect(app.settings.trelloLabel).toBe("new label");
  });

  it("resets to the defaults", () => {
    const app = makeApp();
    resetSettings(app);
    expect(app.settings.sourceLocale).toBe("English");
    expect(app.settings.projectRoot).toBeNull();
  });
});

describe("documentation settings", () => {
  it("stores the canonical name and splits the aliases", async () => {
    const texts = seq("Ada Lovelace", " @ada , ada-l ,, @ada ");
    const app = makeApp({ askText: () => Promise.resolve(texts()) });
    await editDocsLead(app);
    expect(app.settings.docsLeadName).toBe("Ada Lovelace");
    expect(app.settings.docsLeadAliases).toEqual(["@ada", "ada-l"]);
  });

  it("refuses an empty lead name", async () => {
    const app = makeApp({ askText: () => Promise.resolve("") });
    const previous = app.settings.docsLeadName;
    await editDocsLead(app);
    expect(app.settings.docsLeadName).toBe(previous);
  });

  it("updates the default summary output", async () => {
    const app = makeApp({ askText: () => Promise.resolve("docs/summary.md") });
    await editDocsOutput(app);
    expect(app.settings.docsOutput).toBe("docs/summary.md");
  });
});

describe("settings menu", () => {
  it("walks every branch and exits on Back", async () => {
    project.makeLocale("English");
    project.makeLocale("French");
    const choices = seq(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 99, 0);
    const texts = seq(project.root, "new label", "Ada", "@ada", "summary.md");
    const lists = seq("French", "red", "cyan", "compact");
    const app = makeApp({
      askChoice: () => Promise.resolve(choices()),
      askText: () => Promise.resolve(texts()),
      askChoiceFromList: () => Promise.resolve(lists()),
    });
    await expect(settingsMenu(app)).resolves.toBeUndefined();
  });

  it("exits when the menu is cancelled", async () => {
    const app = makeApp({ askChoice: () => Promise.resolve(MENU_CANCELLED) });
    await expect(settingsMenu(app)).resolves.toBeUndefined();
  });
});
