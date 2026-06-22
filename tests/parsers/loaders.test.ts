import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DUMPS_SOURCE,
  isDumpsSource,
  listLocalizations,
  loadJson,
  sourceAlmanacPath,
  sourceHasFile,
  sourceStringsPath,
  stringsDir,
} from "../../src/parsers/loaders";
import { createTempProject, type TempProject } from "../helpers";

let project: TempProject;

afterEach(() => {
  project?.cleanup();
});

function setupProject(): TempProject {
  project = createTempProject();
  return project;
}

describe("loadJson", () => {
  it("returns empty object when missing", () => {
    expect(loadJson("/no/file/here.json")).toEqual({});
  });

  it("reads utf-8-sig (strips BOM)", () => {
    const base = mkdtempSync(path.join(tmpdir(), "pvzf-loadjson-"));
    try {
      const p = path.join(base, "x.json");
      writeFileSync(p, '﻿{"a": "b"}', { encoding: "utf-8" });
      expect(loadJson(p)).toEqual({ a: "b" });
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it("returns empty object on invalid json and logs a diagnostic", () => {
    const base = mkdtempSync(path.join(tmpdir(), "pvzf-loadjson-"));
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const p = path.join(base, "x.json");
      writeFileSync(p, "not json", { encoding: "utf-8" });
      expect(loadJson(p)).toEqual({});
      expect(spy.mock.calls.map((c) => String(c[0])).join("\n")).toContain("Error reading");
    } finally {
      spy.mockRestore();
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe("filesystem loaders", () => {
  it("list_localizations only returns directories", () => {
    const { root, makeLocale } = setupProject();
    makeLocale("French");
    makeLocale("German");
    writeFileSync(path.join(root, "Localization", "stray.txt"), "ignore me", { encoding: "utf-8" });
    expect(listLocalizations(root)).toEqual(["French", "German"]);
  });

  it("strings_dir path", () => {
    const { root } = setupProject();
    expect(stringsDir(root, "French")).toBe(path.join(root, "Localization", "French", "Strings"));
  });

  it("is_dumps_source", () => {
    expect(isDumpsSource(DUMPS_SOURCE)).toBe(true);
    expect(isDumpsSource("English")).toBe(false);
  });

  it("source_strings_path resolves locale vs dumps", () => {
    const { root } = setupProject();
    const localePath = sourceStringsPath(root, "English", "translation_strings.json");
    expect(localePath.endsWith(path.join("Localization", "English", "Strings", "translation_strings.json"))).toBe(true);
    // translation_strings has no Dumps equivalent — falls back to a non-existent path.
    const dumpsPath = sourceStringsPath(root, DUMPS_SOURCE, "translation_strings.json");
    expect(dumpsPath.endsWith(path.join("Dumps", "translation_strings.json"))).toBe(true);
  });

  it("source_has_file is false when no dumps equivalent", () => {
    const { root } = setupProject();
    expect(sourceHasFile(root, DUMPS_SOURCE, "strings", "translation_strings.json")).toBe(false);
  });

  it("source_has_file is true for existing locale file", () => {
    const { root, makeLocale } = setupProject();
    makeLocale("English", { strings: { "translation_strings.json": { a: "b" } } });
    expect(sourceHasFile(root, "English", "strings", "translation_strings.json")).toBe(true);
  });

  it("source_almanac_path locale mode", () => {
    const { root } = setupProject();
    const p = sourceAlmanacPath(root, "English", "LawnStringsTranslate.json");
    expect(p.endsWith(path.join("Localization", "English", "Almanac", "LawnStringsTranslate.json"))).toBe(true);
  });

  it("source_has_file for dumps-mapped almanac", () => {
    const { root } = setupProject();
    // LawnStringsTranslate.json maps to LawnStrings.json in Dumps/.
    writeFileSync(path.join(root, "Dumps", "LawnStrings.json"), "{}", { encoding: "utf-8" });
    expect(sourceHasFile(root, DUMPS_SOURCE, "almanac", "LawnStringsTranslate.json")).toBe(true);
  });
});
