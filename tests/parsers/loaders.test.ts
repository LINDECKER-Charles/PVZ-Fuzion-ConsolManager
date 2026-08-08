import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resetNoticeSink, setNoticeSink } from "../../src/core/notices";
import {
  DUMPS_SOURCE,
  isDumpsSource,
  listLocalizations,
  loadJson,
  sourceAlmanacFileExists,
  sourceAlmanacPath,
  sourceStringsFileExists,
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

  it("returns empty object on invalid json and reports a notice", () => {
    const base = mkdtempSync(path.join(tmpdir(), "pvzf-loadjson-"));
    const notices: string[] = [];
    setNoticeSink((message) => notices.push(message));
    try {
      const p = path.join(base, "x.json");
      writeFileSync(p, "not json", { encoding: "utf-8" });
      expect(loadJson(p)).toEqual({});
      expect(notices.join("\n")).toContain("Error reading");
    } finally {
      resetNoticeSink();
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
    const expected = path.join("Localization", "English", "Strings", "translation_strings.json");
    expect(localePath.endsWith(expected)).toBe(true);
    // translation_strings has no Dumps equivalent — falls back to a non-existent path.
    const dumpsPath = sourceStringsPath(root, DUMPS_SOURCE, "translation_strings.json");
    expect(dumpsPath.endsWith(path.join("Dumps", "translation_strings.json"))).toBe(true);
  });

  it("strings source file is absent when there is no dumps equivalent", () => {
    const { root } = setupProject();
    expect(sourceStringsFileExists(root, DUMPS_SOURCE, "translation_strings.json")).toBe(false);
  });

  it("strings source file is present for an existing locale file", () => {
    const { root, makeLocale } = setupProject();
    makeLocale("English", { strings: { "translation_strings.json": { a: "b" } } });
    expect(sourceStringsFileExists(root, "English", "translation_strings.json")).toBe(true);
  });

  it("source_almanac_path locale mode", () => {
    const { root } = setupProject();
    const p = sourceAlmanacPath(root, "English", "LawnStringsTranslate.json");
    const expected = path.join("Localization", "English", "Almanac", "LawnStringsTranslate.json");
    expect(p.endsWith(expected)).toBe(true);
  });

  it("almanac source file follows the dumps filename mapping", () => {
    const { root } = setupProject();
    // LawnStringsTranslate.json maps to LawnStrings.json in Dumps/.
    writeFileSync(path.join(root, "Dumps", "LawnStrings.json"), "{}", { encoding: "utf-8" });
    expect(sourceAlmanacFileExists(root, DUMPS_SOURCE, "LawnStringsTranslate.json")).toBe(true);
  });
});
