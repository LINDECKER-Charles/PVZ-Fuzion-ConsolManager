import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createTempProject, type TempProject } from "../helpers";
import { App, CliArgError, main, parseCliArgs } from "../../src/cli/app";
import { AppSettings } from "../../src/settings";
import { PLANTS_FILE, ZOMBIES_FILE, ACHIEVEMENTS_FILE } from "../../src/parsers/almanac";
import { fakeDeps } from "./_fakes";

/** Mirror of the pytest `configured_app` fixture: an App pointed at a temp
 * project root and a temp reports dir, with silenced deps. */
function makeApp(project: TempProject): { app: App; reports: string } {
  const reports = path.join(project.root, "..", "reports");
  const settings = new AppSettings({ projectRoot: project.root, sourceLocale: "English" });
  const app = new App(settings, fakeDeps(), reports);
  return { app, reports };
}

describe("non-interactive run helpers", () => {
  let project: TempProject;
  let app: App;
  let reports: string;

  beforeEach(() => {
    project = createTempProject();
    ({ app, reports } = makeApp(project));
  });

  afterEach(() => {
    project.cleanup();
  });

  it("runStrings writes a report and returns the missing count", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A", b: "B" } } });
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "FR-A" } } });
    const count = app.runStrings(["French"]);
    expect(count).toBe(1);
    expect(existsSync(path.join(reports, "French", "missing_strings.md"))).toBe(true);
  });

  it("runStrings with diff also writes JSON", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A", b: "B" } } });
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "FR-A" } } });
    app.runStrings(["French"], true);
    const jsonPath = path.join(reports, "French", "strings_diff.json");
    expect(existsSync(jsonPath)).toBe(true);
    expect(JSON.parse(readFileSync(jsonPath, "utf-8"))).toEqual({ b: "B" });
  });

  it("runStrings skips the source locale", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A" } } });
    expect(app.runStrings(["English"])).toBe(0);
  });

  it("runTips warns when files are missing", () => {
    const warned: string[] = [];
    app = new App(
      new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
      fakeDeps({ warn: (m) => warned.push(m) }),
      reports,
    );
    project.makeLocale("English", {
      strings: { "tips_iz.json": { K: "Hi" }, "tips_fs.json": { K: "Hi" } },
    });
    project.makeLocale("French");
    const count = app.runTips(["French"]);
    expect(count).toBe(0);
    const out = warned.join("\n");
    expect(out).toContain("tips_iz.json missing");
    expect(out).toContain("tips_fs.json missing");
  });

  it("runAbyssBuffs warns when the target file is missing", () => {
    const warned: string[] = [];
    app = new App(
      new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
      fakeDeps({ warn: (m) => warned.push(m) }),
      reports,
    );
    project.makeLocale("English", { strings: { "abyss_buffs.json": { K: "V" } } });
    project.makeLocale("French");
    app.runAbyssBuffs(["French"]);
    expect(warned.join("\n")).toContain("abyss_buffs.json missing");
  });

  it("runPlants writes a report (and diff)", () => {
    project.makeLocale("English", {
      almanac: { [PLANTS_FILE]: { plants: [{ seedType: 1, name: "Peashooter" }] } },
    });
    project.makeLocale("French", { almanac: { [PLANTS_FILE]: { plants: [] } } });
    const count = app.runPlants(["French"], true);
    expect(count).toBe(1);
    expect(existsSync(path.join(reports, "French", "missing_plants.md"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "plants_diff.json"))).toBe(true);
  });

  it("runZombies and runAchievements count missing entries", () => {
    project.makeLocale("English", {
      almanac: {
        [ZOMBIES_FILE]: { zombies: [{ theZombieType: 1, name: "Z" }] },
        [ACHIEVEMENTS_FILE]: { achievements: [{ achievement: "X", Name: "A" }] },
      },
    });
    project.makeLocale("French", {
      almanac: { [ZOMBIES_FILE]: { zombies: [] }, [ACHIEVEMENTS_FILE]: { achievements: [] } },
    });
    expect(app.runZombies(["French"])).toBe(1);
    expect(app.runAchievements(["French"])).toBe(1);
  });

  it("runAll aggregates across types", () => {
    project.makeLocale("English", {
      strings: {
        "translation_strings.json": { a: "A" },
        "translation_regexs.json": { r: "R" },
      },
    });
    project.makeLocale("French");
    expect(app.runAll(["French"])).toBeGreaterThanOrEqual(2);
  });
});

describe("cmdDiff", () => {
  let project: TempProject;
  let app: App;
  let reports: string;
  let outSpy: any;
  let errSpy: any;

  beforeEach(() => {
    project = createTempProject();
    ({ app, reports } = makeApp(project));
    outSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  });

  afterEach(() => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    project.cleanup();
  });

  const stdoutText = (): string =>
    outSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("");
  const stderrText = (): string =>
    errSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("");

  it("runs end-to-end and returns 0", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A", b: "B" } } });
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "FR-A" } } });
    const rc = app.cmdDiff("French", reports, true);
    expect(rc).toBe(0);
    expect(stdoutText()).toContain("1 missing entries");
    expect(existsSync(path.join(reports, "French", "missing_strings.md"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "strings_diff.json"))).toBe(true);
  });

  it("rejects an unknown locale with exit code 2", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A" } } });
    const rc = app.cmdDiff("Klingon", null);
    expect(rc).toBe(2);
    expect(stderrText()).toContain("not found");
  });

  it("rejects the source locale as a target with exit code 2", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A" } } });
    const rc = app.cmdDiff("English", null);
    expect(rc).toBe(2);
    expect(stderrText()).toContain("source locale");
  });

  it("fails with exit code 2 when the root is invalid", () => {
    const bad = new App(
      new AppSettings({ projectRoot: path.join(project.root, "nope") }),
      fakeDeps(),
      reports,
    );
    expect(bad.cmdDiff("French", null)).toBe(2);
  });

  it("keeps the default reports root when out is null", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const before = app.reportsRoot;
    expect(app.cmdDiff("French", null)).toBe(0);
    expect(app.reportsRoot).toBe(before);
  });
});

describe("askYesNo / asList", () => {
  let project: TempProject;

  beforeEach(() => {
    project = createTempProject();
  });
  afterEach(() => {
    project.cleanup();
  });

  it("accepts the French 'oui'", async () => {
    const app = new App(new AppSettings(), fakeDeps({ askText: () => Promise.resolve("oui") }));
    expect(await app.askYesNo("Confirm?", false)).toBe(true);
  });

  it("falls back to the default on empty input", async () => {
    const app = new App(new AppSettings(), fakeDeps({ askText: () => Promise.resolve("") }));
    expect(await app.askYesNo("Confirm?", true)).toBe(true);
    expect(await app.askYesNo("Confirm?", false)).toBe(false);
  });

  it("wraps scalars and passes lists through", () => {
    const app = new App(new AppSettings(), fakeDeps());
    expect(app.asList("French")).toEqual(["French"]);
    expect(app.asList(["A", "B"])).toEqual(["A", "B"]);
  });
});

describe("parseCliArgs", () => {
  it("recognizes the diff subcommand", () => {
    const args = parseCliArgs(["diff", "--lang", "French", "--with-diff"]);
    expect(args.command).toBe("diff");
    expect(args.lang).toBe("French");
    expect(args.withDiff).toBe(true);
    expect(args.out).toBeNull();
  });

  it("accepts --lang=value and --out", () => {
    const args = parseCliArgs(["diff", "--lang=German", "--out", "build"]);
    expect(args.lang).toBe("German");
    expect(args.out).toBe("build");
    expect(args.withDiff).toBe(false);
  });

  it("returns a null command for empty argv", () => {
    const args = parseCliArgs([]);
    expect(args.command).toBeNull();
  });

  it("raises CliArgError (exit 2) for an unknown command", () => {
    try {
      parseCliArgs(["bogus"]);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CliArgError);
      expect((e as CliArgError).code).toBe(2);
    }
  });

  it("raises CliArgError when --lang is missing", () => {
    expect(() => parseCliArgs(["diff", "--with-diff"])).toThrow(CliArgError);
  });
});

describe("main", () => {
  let project: TempProject;
  let outSpy: any;
  let errSpy: any;

  beforeEach(() => {
    project = createTempProject();
    outSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  });
  afterEach(() => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    project.cleanup();
  });

  it("runs the diff command and returns exit code 0", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const reports = path.join(project.root, "..", "reports");
    const { exitCode } = await main(["diff", "--lang", "French"], {
      deps: fakeDeps(),
      settings: new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
      reportsRoot: reports,
    });
    expect(exitCode).toBe(0);
  });

  it("returns exit code 2 for a bogus subcommand", async () => {
    const { exitCode } = await main(["bogus"], { deps: fakeDeps() });
    expect(exitCode).toBe(2);
  });

  it("falls through to the interactive TUI when no command is given", async () => {
    let called = false;
    const deps = fakeDeps({
      askChoice: () => Promise.resolve(0), // [0] Exit immediately
      info: () => {
        called = true;
      },
    });
    const { exitCode } = await main([], { deps });
    expect(exitCode).toBe(0);
    expect(called).toBe(true);
  });
});
