import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ACHIEVEMENTS_FILE, PLANTS_FILE, ZOMBIES_FILE } from "../../src/parsers/almanac";
import { type ScanRequest, findTranslationType, runScan } from "../../src/tools/scan";
import { createTempProject, type TempProject } from "../helpers";

const PLANTS = 1;
const ZOMBIES = 2;
const ACHIEVEMENTS = 3;
const STRINGS = 4;
const REGEX = 5;
const TIPS = 6;
const ABYSS = 7;
const TRAVEL = 8;

let project: TempProject;
let reports: string;
let warnings: string[];

/** A request pointed at the temp project, capturing warnings. */
function request(overrides: Partial<ScanRequest> = {}): ScanRequest {
  return {
    projectRoot: project.root,
    sourceLocale: "English",
    reportsRoot: reports,
    exportJsonDiff: false,
    warn: (message) => warnings.push(message),
    ...overrides,
  };
}

/** Run one translation type by menu key. */
function scan(key: number, locales: string[], exportJsonDiff = false): number {
  const type = findTranslationType(key);
  expect(type).toBeDefined();
  return runScan(request({ exportJsonDiff }), locales, [type!]);
}

const reportPath = (...parts: string[]): string => path.join(reports, ...parts);

beforeEach(() => {
  project = createTempProject();
  reports = path.join(project.root, "..", "reports");
  warnings = [];
});

afterEach(() => {
  project.cleanup();
});

describe("string-based translation types", () => {
  it("writes a report and returns the missing count", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A", b: "B" } } });
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "FR-A" } } });
    expect(scan(STRINGS, ["French"])).toBe(1);
    expect(existsSync(reportPath("French", "missing_strings.md"))).toBe(true);
  });

  it("also writes the JSON diff when asked", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A", b: "B" } } });
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "FR-A" } } });
    scan(STRINGS, ["French"], true);
    const jsonPath = reportPath("French", "strings_diff.json");
    expect(existsSync(jsonPath)).toBe(true);
    expect(JSON.parse(readFileSync(jsonPath, "utf-8"))).toEqual({ b: "B" });
  });

  it("skips the source locale", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A" } } });
    expect(scan(STRINGS, ["English"])).toBe(0);
  });
});

describe("tips", () => {
  it("warns once per missing file and contributes nothing", () => {
    project.makeLocale("English", {
      strings: { "tips_iz.json": { K: "Hi" }, "tips_fs.json": { K: "Hi" } },
    });
    project.makeLocale("French");
    expect(scan(TIPS, ["French"])).toBe(0);
    const text = warnings.join("\n");
    expect(text).toContain("tips_iz.json missing");
    expect(text).toContain("tips_fs.json missing");
    expect(text).toContain("Migrate tips & buffs");
  });

  it("covers both files when they are present", () => {
    project.makeLocale("English", {
      strings: { "tips_iz.json": { a: "A" }, "tips_fs.json": { b: "B" } },
    });
    project.makeLocale("French", { strings: { "tips_iz.json": {}, "tips_fs.json": {} } });
    expect(scan(TIPS, ["French"], true)).toBe(2);
    expect(existsSync(reportPath("French", "missing_tips_iz.md"))).toBe(true);
    expect(existsSync(reportPath("French", "tips_iz_diff.json"))).toBe(true);
    expect(existsSync(reportPath("French", "tips_fs_diff.json"))).toBe(true);
  });

  it("skips the JSON diff when not requested", () => {
    project.makeLocale("English", {
      strings: { "tips_iz.json": { a: "A" }, "tips_fs.json": { b: "B" } },
    });
    project.makeLocale("French", { strings: { "tips_iz.json": {}, "tips_fs.json": {} } });
    scan(TIPS, ["French"]);
    expect(existsSync(reportPath("French", "tips_iz_diff.json"))).toBe(false);
    expect(existsSync(reportPath("French", "tips_fs_diff.json"))).toBe(false);
  });
});

describe("buff translation types", () => {
  it("warns when the target file is missing", () => {
    project.makeLocale("English", { strings: { "abyss_buffs.json": { K: "V" } } });
    project.makeLocale("French");
    expect(scan(ABYSS, ["French"])).toBe(0);
    expect(warnings.join("\n")).toContain("abyss_buffs.json missing");
  });

  it("writes reports and diffs when the files are present", () => {
    project.makeLocale("English", {
      strings: { "abyss_buffs.json": { a: "A" }, "travel_buffs.json": { cat: { k: "V" } } },
    });
    project.makeLocale("French", { strings: { "abyss_buffs.json": {}, "travel_buffs.json": {} } });
    expect(scan(ABYSS, ["French"], true)).toBe(1);
    expect(scan(TRAVEL, ["French"], true)).toBe(1);
    expect(existsSync(reportPath("French", "abyss_buffs_diff.json"))).toBe(true);
    expect(existsSync(reportPath("French", "travel_buffs_diff.json"))).toBe(true);
  });
});

describe("almanac translation types", () => {
  it("writes a report and a diff for plants", () => {
    project.makeLocale("English", {
      almanac: { [PLANTS_FILE]: { plants: [{ seedType: 1, name: "Peashooter" }] } },
    });
    project.makeLocale("French", { almanac: { [PLANTS_FILE]: { plants: [] } } });
    expect(scan(PLANTS, ["French"], true)).toBe(1);
    expect(existsSync(reportPath("French", "missing_plants.md"))).toBe(true);
    expect(existsSync(reportPath("French", "plants_diff.json"))).toBe(true);
  });

  it("counts missing zombies and achievements", () => {
    project.makeLocale("English", {
      almanac: {
        [ZOMBIES_FILE]: { zombies: [{ theZombieType: 1, name: "Z" }] },
        [ACHIEVEMENTS_FILE]: { achievements: [{ achievement: "X", Name: "A" }] },
      },
    });
    project.makeLocale("French", {
      almanac: { [ZOMBIES_FILE]: { zombies: [] }, [ACHIEVEMENTS_FILE]: { achievements: [] } },
    });
    expect(scan(ZOMBIES, ["French"])).toBe(1);
    expect(scan(ACHIEVEMENTS, ["French"])).toBe(1);
  });
});

describe("runScan", () => {
  it("aggregates every type by default", () => {
    project.makeLocale("English", {
      strings: {
        "translation_strings.json": { a: "A" },
        "translation_regexs.json": { r: "R" },
      },
    });
    project.makeLocale("French");
    expect(runScan(request(), ["French"])).toBeGreaterThanOrEqual(2);
  });

  it("skips the source locale for every type", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A" } } });
    expect(runScan(request(), ["English"])).toBe(0);
  });

  it("exposes every menu key from 1 to 8", () => {
    for (const key of [PLANTS, ZOMBIES, ACHIEVEMENTS, STRINGS, REGEX, TIPS, ABYSS, TRAVEL]) {
      expect(findTranslationType(key)?.label).toBeTruthy();
    }
    expect(findTranslationType(99)).toBeUndefined();
  });
});
