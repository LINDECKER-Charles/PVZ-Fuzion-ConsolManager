import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

import { App } from "../../../src/cli/app";
import { MENU_CANCELLED } from "../../../src/cli/menus";
import { showMissing } from "../../../src/cli/screens/missing";
import { AppSettings } from "../../../src/settings";
import { createTempProject, type TempProject } from "../../helpers";
import { fakeDeps } from "../_fakes";

let project: TempProject;
let reports: string;

function makeApp(
  overrides: Parameters<typeof fakeDeps>[0] = {},
  settings?: AppSettings,
): App {
  return new App({
    settings: settings ?? new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
    deps: fakeDeps(overrides),
    reportsRoot: reports,
  });
}

beforeEach(() => {
  project = createTempProject();
  reports = path.join(project.root, "..", "reports");
});

afterEach(() => {
  project.cleanup();
});

describe("showMissing", () => {
  it("returns early when the root is invalid", async () => {
    const app = makeApp({}, new AppSettings({ projectRoot: path.join(project.root, "nope") }));
    await expect(showMissing(app)).resolves.toBeUndefined();
    expect(existsSync(reports)).toBe(false);
  });

  it("runs all types with diff for a single locale", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const app = makeApp({
      selectLocalization: () => Promise.resolve("French"),
      askChoice: () => Promise.resolve(0), // All types
      askConfirm: () => Promise.resolve(true),
    });
    await showMissing(app);
    expect(existsSync(path.join(reports, "French", "missing_strings.md"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "strings_diff.json"))).toBe(true);
  });

  it("runs a specific type across every locale", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const app = makeApp({
      selectLocalization: () => Promise.resolve(["English", "French"]),
      askChoice: () => Promise.resolve(4), // Strings (UI)
      askConfirm: () => Promise.resolve(false),
    });
    await showMissing(app);
    expect(existsSync(path.join(reports, "French", "missing_strings.md"))).toBe(true);
  });

  it("rejects an unknown type without writing anything", async () => {
    project.makeLocale("French");
    const errors: string[] = [];
    const app = makeApp({
      selectLocalization: () => Promise.resolve("French"),
      askChoice: () => Promise.resolve(99),
      error: (m) => errors.push(m),
    });
    await showMissing(app);
    expect(errors.join()).toContain("Invalid choice.");
    expect(existsSync(path.join(reports, "French"))).toBe(false);
  });

  it("leaves the screen when the locale picker is cancelled", async () => {
    project.makeLocale("French");
    let askedType = false;
    const app = makeApp({
      selectLocalization: () => Promise.resolve(null),
      askChoice: () => {
        askedType = true;
        return Promise.resolve(0);
      },
    });
    await showMissing(app);
    expect(askedType).toBe(false);
  });

  it("leaves the screen when the type menu is cancelled", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const app = makeApp({
      selectLocalization: () => Promise.resolve("French"),
      askChoice: () => Promise.resolve(MENU_CANCELLED),
    });
    await showMissing(app);
    expect(existsSync(path.join(reports, "French"))).toBe(false);
  });

  it("shows the run plan and the outcome", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const panels: string[][] = [];
    const successes: string[] = [];
    const app = makeApp({
      selectLocalization: () => Promise.resolve(["English", "French"]),
      askChoice: () => Promise.resolve(4),
      askConfirm: () => Promise.resolve(false),
      panel: (lines) => panels.push([...lines]),
      success: (m) => successes.push(m),
    });
    await showMissing(app);
    const rendered = panels.flat().join("\n");
    expect(rendered).toContain("All (2)");
    expect(rendered).toContain("Strings (UI)");
    expect(rendered).toContain("JSON diff      no");
    expect(successes.join()).toContain("Total missing entries found: 1");
  });
});
