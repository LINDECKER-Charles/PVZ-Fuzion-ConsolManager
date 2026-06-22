import { afterEach, describe, expect, it } from "vitest";

import {
  STRINGS_FILE,
  diffStrings,
  diffTravelBuffs,
  flattenNested,
  stringsFileExists,
} from "../../src/parsers/strings";
import { createTempProject, type TempProject } from "../helpers";

let project: TempProject;

afterEach(() => {
  project?.cleanup();
});

describe("flattenNested", () => {
  it("collapses two levels", () => {
    expect(flattenNested({ cat: { a: "1", b: "2" } })).toEqual({ "cat:a": "1", "cat:b": "2" });
  });

  it("skips non-dict top level", () => {
    expect(flattenNested({ cat: { a: "1" }, stray: "scalar" })).toEqual({ "cat:a": "1" });
  });

  it("normalizes non-string leaves to empty", () => {
    expect(flattenNested({ cat: { a: 42 } })).toEqual({ "cat:a": "" });
  });
});

/**
 * The Python suite calls the private `_diff` directly; the TS port keeps it
 * module-private, so the missing/empty branches are exercised through the
 * public `diffStrings` filesystem entry point.
 */
describe("diff (via filesystem)", () => {
  it("reports missing keys", () => {
    project = createTempProject();
    project.makeLocale("English", { strings: { [STRINGS_FILE]: { a: "A", b: "B" } } });
    project.makeLocale("French", { strings: { [STRINGS_FILE]: { a: "A" } } });
    const entries = diffStrings(project.root, "English", "French");
    expect(entries.map((e) => [e.key, e.status])).toEqual([["b", "missing"]]);
  });

  it("reports empty target values", () => {
    project = createTempProject();
    project.makeLocale("English", { strings: { [STRINGS_FILE]: { a: "A" } } });
    project.makeLocale("French", { strings: { [STRINGS_FILE]: { a: "" } } });
    const entries = diffStrings(project.root, "English", "French");
    expect(entries.map((e) => [e.key, e.status, e.target])).toEqual([["a", "empty", ""]]);
  });

  it("skips empty when source is also empty", () => {
    project = createTempProject();
    project.makeLocale("English", { strings: { [STRINGS_FILE]: { a: "" } } });
    project.makeLocale("French", { strings: { [STRINGS_FILE]: { a: "" } } });
    expect(diffStrings(project.root, "English", "French")).toEqual([]);
  });

  it("diff_strings via filesystem", () => {
    project = createTempProject();
    project.makeLocale("English", { strings: { [STRINGS_FILE]: { k1: "Hello", k2: "Bye" } } });
    project.makeLocale("French", { strings: { [STRINGS_FILE]: { k1: "Salut" } } });
    const entries = diffStrings(project.root, "English", "French");
    expect(entries.map((e) => e.key)).toEqual(["k2"]);
  });
});

describe("travel buffs", () => {
  it("unflattens via category", () => {
    project = createTempProject();
    project.makeLocale("English", {
      strings: {
        "travel_buffs.json": {
          catA: { k1: "A1", k2: "A2" },
          catB: { k1: "B1" },
        },
      },
    });
    project.makeLocale("French", { strings: { "travel_buffs.json": { catA: { k1: "FR-A1" } } } });
    const entries = diffTravelBuffs(project.root, "English", "French");
    const keys = entries.map((e) => e.key).sort();
    expect(keys).toEqual(["catA:k2", "catB:k1"]);
  });
});

describe("stringsFileExists", () => {
  it("detects existing and missing files", () => {
    project = createTempProject();
    project.makeLocale("French", { strings: { [STRINGS_FILE]: { k: "v" } } });
    expect(stringsFileExists(project.root, "French", STRINGS_FILE)).toBe(true);
    expect(stringsFileExists(project.root, "French", "tips_iz.json")).toBe(false);
  });
});
