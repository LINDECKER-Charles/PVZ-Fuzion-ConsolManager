import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  LAYOUT_FLAT,
  checkLocaleDuplicates,
  detectRawDuplicateKeys,
  detectValueDuplicates,
  flattenNested,
  scanFile,
} from "../../src/tools/duplicate-checker";
import { createTempProject, type TempProject } from "../helpers";

let project: TempProject | undefined;
const tempDirs: string[] = [];

afterEach(() => {
  project?.cleanup();
  project = undefined;
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tmpFile(name: string, content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pvzf-dup-"));
  tempDirs.push(dir);
  const p = path.join(dir, name);
  writeFileSync(p, content, { encoding: "utf-8" });
  return p;
}

describe("detectValueDuplicates", () => {
  it("groups keys sharing a value", () => {
    expect(detectValueDuplicates({ a: "X", b: "X", c: "Y" })).toEqual([["X", ["a", "b"]]]);
  });

  it("ignores empty and blank values", () => {
    expect(detectValueDuplicates({ a: "", b: "   ", c: "Hi" })).toEqual([]);
  });

  it("orders by group size desc", () => {
    const out = detectValueDuplicates({
      a: "X",
      b: "X",
      c: "X",
      d: "Y",
      e: "Y",
      f: "Z",
    });
    expect(out.map(([v]) => v)).toEqual(["X", "Y"]);
    expect(out[0][1]).toEqual(["a", "b", "c"]);
  });
});

describe("detectRawDuplicateKeys", () => {
  it("finds repeated top-level keys", () => {
    const p = tmpFile("dup.json", '{"a": 1, "b": 2, "a": 3}');
    expect(detectRawDuplicateKeys(p)).toEqual({ a: 2 });
  });

  it("handles missing file", () => {
    expect(detectRawDuplicateKeys("/no/such/path.json")).toEqual({});
  });

  it("returns empty when clean", () => {
    const p = tmpFile("clean.json", '{"a": 1, "b": 2}');
    expect(detectRawDuplicateKeys(p)).toEqual({});
  });

  it("swallows decode errors", () => {
    const p = tmpFile("broken.json", "{not json");
    expect(detectRawDuplicateKeys(p)).toEqual({});
  });
});

describe("flattenNested", () => {
  it("collapses two levels", () => {
    expect(flattenNested({ cat: { a: "1", b: "2" } })).toEqual({ "cat:a": "1", "cat:b": "2" });
  });

  it("collapses the current three-level format", () => {
    expect(flattenNested({ cat: { "0": { name: "V", desc: "V" } } })).toEqual({
      "cat:0:name": "V",
      "cat:0:desc": "V",
    });
  });

  it("skips non-dict top-level values", () => {
    expect(flattenNested({ cat: { a: "1" }, stray: "scalar" })).toEqual({ "cat:a": "1" });
  });
});

describe("checkLocaleDuplicates", () => {
  it("reports per file for flat and nested", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": { a: "Hi", b: "Hi", c: "Bye" },
        "travel_buffs.json": { cat1: { k1: "V", k2: "V" } },
      },
    });
    const result = checkLocaleDuplicates(project.root, "French");
    const byName = new Map(result.files.map((f) => [f.filename, f]));
    expect(byName.get("translation_strings.json")!.duplicateValues).toEqual([["Hi", ["a", "b"]]]);
    expect(byName.get("travel_buffs.json")!.duplicateValues).toEqual([["V", ["cat1:k1", "cat1:k2"]]]);

    const hasAny = result.files.some(
      (f) => f.duplicateKeys.length > 0 || f.duplicateValues.length > 0,
    );
    const totalValues = result.files.reduce((acc, f) => acc + f.duplicateValues.length, 0);
    expect(hasAny).toBe(true);
    expect(totalValues).toBe(2);
  });

  it("is clean when there are no duplicates", () => {
    project = createTempProject();
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "1", b: "2" } } });
    const result = checkLocaleDuplicates(project.root, "French");

    const hasAny = result.files.some(
      (f) => f.duplicateKeys.length > 0 || f.duplicateValues.length > 0,
    );
    const totalKeys = result.files.reduce((acc, f) => acc + f.duplicateKeys.length, 0);
    const totalValues = result.files.reduce((acc, f) => acc + f.duplicateValues.length, 0);
    expect(hasAny).toBe(false);
    expect(totalKeys).toBe(0);
    expect(totalValues).toBe(0);
  });
});

describe("scanFile", () => {
  it("handles a top-level list (skips value-duplicate detection)", () => {
    const p = tmpFile("list.json", "[1, 2, 3]");
    const fd = scanFile(p, LAYOUT_FLAT);
    expect(fd.duplicateValues).toEqual([]);
    expect(fd.duplicateKeys).toEqual([]);
    expect(fd.missing).toBe(false);
  });
});
