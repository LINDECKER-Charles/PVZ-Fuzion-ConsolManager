import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

import { App, MAIN_MENU_ACTIONS } from "../../src/cli/app";
import { MENU_CANCELLED } from "../../src/cli/menus";
import { THEME } from "../../src/cli/theme";
import { AppSettings } from "../../src/settings";
import { createTempProject, type TempProject } from "../helpers";
import { fakeDeps, seq } from "./_fakes";

vi.mock("../../src/cli/screens/missing", () => ({ showMissing: vi.fn(() => Promise.resolve()) }));
vi.mock("../../src/cli/screens/tools-menu", () => ({
  translatorTools: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../src/cli/screens/documentation", () => ({
  documentation: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../src/cli/screens/settings", () => ({
  settingsMenu: vi.fn(() => Promise.resolve()),
}));

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
});

afterEach(() => {
  project.cleanup();
  vi.restoreAllMocks();
});

describe("App state", () => {
  it("resolves the project root and the source locale from the settings", () => {
    const app = makeApp();
    expect(app.projectRoot()).toBe(path.resolve(project.root));
    expect(app.sourceLocale()).toBe("English");
  });

  it("pushes the settings into the theme", () => {
    const configure = vi.spyOn(THEME, "configure").mockImplementation(() => {});
    const app = makeApp(
      {},
      new AppSettings({
        color: "red",
        accentColor: "cyan",
        density: "compact",
        showEmoji: false,
        showBanner: true,
      }),
    );
    app.applyTheme();
    expect(configure).toHaveBeenCalledWith({
      color: "red",
      accent: "cyan",
      density: "compact",
      showEmoji: false,
      showBanner: true,
    });
  });

  it("warns instead of throwing when the settings cannot be saved", () => {
    const warnings: string[] = [];
    const app = makeApp({ saveSettings: () => "disk is full", warn: (m) => warnings.push(m) });
    app.persistSettings();
    expect(warnings.join()).toContain("disk is full");
  });

  it("requireValidProjectRoot reports and refuses an unusable root", async () => {
    const errors: string[] = [];
    const app = makeApp(
      { error: (m) => errors.push(m) },
      new AppSettings({ projectRoot: path.join(project.root, "nope") }),
    );
    expect(await app.requireValidProjectRoot()).toBe(false);
    expect(errors.join()).toContain("does not exist");
  });

  it("requireValidProjectRoot accepts a complete project", async () => {
    expect(await makeApp().requireValidProjectRoot()).toBe(true);
  });
});

describe("main menu dispatch", () => {
  it("maps every menu key to a screen", () => {
    expect([...MAIN_MENU_ACTIONS.keys()].sort()).toEqual([1, 2, 3, 4]);
  });

  it("mainMenu returns the user's choice", async () => {
    expect(await makeApp({ askChoice: () => Promise.resolve(1) }).mainMenu()).toBe(1);
  });

  it("runs each screen then exits on the Exit entry", async () => {
    project.makeLocale("English");
    const choices = seq(1, 2, 3, 4, 0);
    const app = makeApp({ askChoice: () => Promise.resolve(choices()) });
    await expect(app.runInteractive()).resolves.toBeUndefined();
  });

  it("reports an unknown choice and keeps the loop alive", async () => {
    project.makeLocale("English");
    const choices = seq(99, 0);
    const errors: string[] = [];
    const app = makeApp({
      askChoice: () => Promise.resolve(choices()),
      error: (m) => errors.push(m),
    });
    await app.runInteractive();
    expect(errors.join()).toContain("Invalid choice.");
  });

  it("says goodbye when the main menu is cancelled", async () => {
    project.makeLocale("English");
    let farewelled = false;
    const app = makeApp({
      askChoice: () => Promise.resolve(MENU_CANCELLED),
      farewell: () => {
        farewelled = true;
      },
    });
    await app.runInteractive();
    expect(farewelled).toBe(true);
  });
});

describe("startup status", () => {
  it("warns on an invalid project root", async () => {
    const warnings: string[] = [];
    const app = makeApp(
      { askChoice: () => Promise.resolve(0), warn: (m) => warnings.push(m) },
      new AppSettings({
        projectRoot: path.join(project.root, "nope"),
        sourceLocale: "English",
        showBanner: false,
      }),
    );
    await app.runInteractive();
    expect(warnings.join()).toContain("does not exist");
  });

  it("warns on an invalid source locale", async () => {
    project.makeLocale("English");
    const warnings: string[] = [];
    const app = makeApp(
      { askChoice: () => Promise.resolve(0), warn: (m) => warnings.push(m) },
      new AppSettings({
        projectRoot: project.root,
        sourceLocale: "Klingon",
        showBanner: false,
      }),
    );
    await app.runInteractive();
    expect(warnings.join()).toContain("Klingon");
  });

  it("renders the banner when enabled", async () => {
    project.makeLocale("English");
    let rendered = false;
    const app = makeApp(
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
