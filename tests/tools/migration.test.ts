import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ABYSS_BUFFS_FILE,
  TIPS_FS_FILE,
  TIPS_IZ_FILE,
  TRAVEL_BUFFS_FILE,
} from "../../src/parsers/strings";
import {
  migrateCustomLevels,
  migrateTipsAndBuffs,
  type FileMigrationResult,
  type MigrationResult,
} from "../../src/tools/migration";
import { createTempProject, type TempProject } from "../helpers";

const ABYSS_DUMP_FILE = "AbyssBuffData.json";
const CUSTOMLEVEL_STRINGS_FILE = "customlevel_strings.json";
const CUSTOMLEVEL_REGEXS_FILE = "customlevel_regexs.json";
const CUSTOM_LEVEL_DATA_FILE = "custom_level_data.json";

let project: TempProject;

afterEach(() => {
  project?.cleanup();
});

// ---- helpers ----------------------------------------------------------------

function stringsPath(root: string, locale: string, filename: string): string {
  return path.join(root, "Localization", locale, "Strings", filename);
}

/** Read a generated file: assert BOM + 4-space indent, return the parsed object. */
function readGenerated(root: string, locale: string, filename: string): Record<string, unknown> {
  const raw = readFileSync(stringsPath(root, locale, filename), "utf-8");
  // UTF-8 BOM.
  expect(raw.charCodeAt(0)).toBe(0xfeff);
  const body = raw.slice(1);
  const parsed = JSON.parse(body) as Record<string, unknown>;
  // JSON.stringify(obj, null, 4): re-serialising must round-trip byte-for-byte.
  expect(body).toBe(JSON.stringify(parsed, null, 4));
  return parsed;
}

function fileResult(result: MigrationResult, filename: string): FileMigrationResult {
  const found = result.files.find((f) => f.filename === filename);
  if (!found) throw new Error(`no file result for ${filename}`);
  return found;
}

// ---- migrateTipsAndBuffs ----------------------------------------------------

describe("migrateTipsAndBuffs", () => {
  it("tips_iz: writes only entries present in translation_strings (partial migration)", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": {
          "你好": "Bonjour",
          "再见": "Au revoir",
        },
      },
    });
    project.makeDump(TIPS_IZ_FILE, {
      tip1: "你好",
      tip2: "再见",
      tip3: "未翻译", // absent from translation_strings → omitted
    });
    // Other targets have absent dumps → keep them sourceMissing, focus on tips_iz.

    const result = migrateTipsAndBuffs(project.root, "French");
    expect(result.locale).toBe("French");

    const fr = fileResult(result, TIPS_IZ_FILE);
    expect(fr.status).toBe("created");
    expect(fr.migrated).toBe(2);
    expect(fr.available).toBe(3);

    const written = readGenerated(project.root, "French", TIPS_IZ_FILE);
    expect(written).toEqual({ tip1: "Bonjour", tip2: "Au revoir" });
  });

  it("tips_fs: same keyed-pair behaviour on the second flat target", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: { "translation_strings.json": { "甲": "A" } },
    });
    project.makeDump(TIPS_FS_FILE, { fs1: "甲", fs2: "乙" });

    const result = migrateTipsAndBuffs(project.root, "French");
    const fr = fileResult(result, TIPS_FS_FILE);
    expect(fr.status).toBe("created");
    expect(fr.migrated).toBe(1);
    expect(fr.available).toBe(2);
    expect(readGenerated(project.root, "French", TIPS_FS_FILE)).toEqual({ fs1: "A" });
  });

  it("abyss: flattens name/introduce keyed by the Chinese text; numeric value ignored", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": {
          "炼狱": "Enfer",
          "炼狱描述": "Description enfer",
          "深渊": "Abysse",
        },
      },
    });
    project.makeDump(ABYSS_DUMP_FILE, {
      infos: {
        "0": { name: "炼狱", introduce: "炼狱描述", value: 42 },
        "1": { name: "深渊", introduce: "", value: 7 }, // empty introduce skipped
      },
    });

    const result = migrateTipsAndBuffs(project.root, "French");
    const fr = fileResult(result, ABYSS_BUFFS_FILE);
    expect(fr.status).toBe("created");
    // available = name(0) + introduce(0) + name(1) = 3 (empty introduce excluded)
    expect(fr.available).toBe(3);
    expect(fr.migrated).toBe(3);

    const written = readGenerated(project.root, "French", ABYSS_BUFFS_FILE);
    expect(written).toEqual({
      "炼狱": "Enfer",
      "炼狱描述": "Description enfer",
      "深渊": "Abysse",
    });
    // value never leaks into the dest.
    expect(Object.values(written)).not.toContain(42);
  });

  it("abyss: handles `infos` serialised as a JSON array (real dump shape)", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": { "炼狱": "Enfer", "炼狱描述": "Description enfer" },
      },
    });
    // The real AbyssBuffData.json stores `infos` as an array, not an object.
    project.makeDump(ABYSS_DUMP_FILE, {
      infos: [{ name: "炼狱", introduce: "炼狱描述", value: 42 }],
    });

    const result = migrateTipsAndBuffs(project.root, "French");
    const fr = fileResult(result, ABYSS_BUFFS_FILE);
    expect(fr.available).toBe(2);
    expect(fr.migrated).toBe(2);
    expect(readGenerated(project.root, "French", ABYSS_BUFFS_FILE)).toEqual({
      "炼狱": "Enfer",
      "炼狱描述": "Description enfer",
    });
  });

  it("abyss: untranslated source text is omitted, file still created", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: { "translation_strings.json": { "炼狱": "Enfer" } },
    });
    project.makeDump(ABYSS_DUMP_FILE, {
      infos: { "0": { name: "炼狱", introduce: "未翻译", value: 1 } },
    });

    const result = migrateTipsAndBuffs(project.root, "French");
    const fr = fileResult(result, ABYSS_BUFFS_FILE);
    expect(fr.available).toBe(2);
    expect(fr.migrated).toBe(1);
    expect(readGenerated(project.root, "French", ABYSS_BUFFS_FILE)).toEqual({ "炼狱": "Enfer" });
  });

  it("travel: preserves nesting, omits missing leaves and fully-empty categories", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": {
          "树木": "Arbre",
          "河流": "Riviere",
          // "山脉" deliberately untranslated
        },
      },
    });
    project.makeDump(TRAVEL_BUFFS_FILE, {
      nature: {
        "0": "树木", // translated
        "1": "山脉", // untranslated → omitted leaf
      },
      water: {
        "0": "河流", // translated
      },
      empty: {
        "0": "缺失", // untranslated → whole category never materialises
      },
    });

    const result = migrateTipsAndBuffs(project.root, "French");
    const fr = fileResult(result, TRAVEL_BUFFS_FILE);
    expect(fr.status).toBe("created");
    expect(fr.available).toBe(4); // 4 leaves offered
    expect(fr.migrated).toBe(2);

    const written = readGenerated(project.root, "French", TRAVEL_BUFFS_FILE);
    expect(written).toEqual({
      nature: { "0": "Arbre" },
      water: { "0": "Riviere" },
    });
    expect(written).not.toHaveProperty("empty");
  });

  it("travel: migrates name and desc in the current format", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": {
          "Chinese name": "Nom",
          "Chinese description": "Description",
        },
      },
    });
    project.makeDump(TRAVEL_BUFFS_FILE, {
      advancedBuffs: {
        "0": { name: "Chinese name", desc: "Chinese description" },
        "1": { name: "Untranslated name", desc: "" },
      },
    });

    const result = migrateTipsAndBuffs(project.root, "French");
    const fr = fileResult(result, TRAVEL_BUFFS_FILE);
    expect(fr.available).toBe(3);
    expect(fr.migrated).toBe(2);
    expect(readGenerated(project.root, "French", TRAVEL_BUFFS_FILE)).toEqual({
      advancedBuffs: { "0": { name: "Nom", desc: "Description" } },
    });
  });

  it("creates an empty {} file when nothing is translated (migrated 0, status created)", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: { "translation_strings.json": {} }, // no translations at all
    });
    project.makeDump(TIPS_IZ_FILE, { tip1: "你好", tip2: "再见" });

    const result = migrateTipsAndBuffs(project.root, "French");
    const fr = fileResult(result, TIPS_IZ_FILE);
    expect(fr.status).toBe("created");
    expect(fr.migrated).toBe(0);
    expect(fr.available).toBe(2);

    expect(existsSync(stringsPath(project.root, "French", TIPS_IZ_FILE))).toBe(true);
    expect(readGenerated(project.root, "French", TIPS_IZ_FILE)).toEqual({});
  });

  it("skips an existing destination without overwriting it (skippedExists)", () => {
    project = createTempProject();
    const existingContent = '{"preserved": "do not touch"}';
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": { "你好": "Bonjour" },
        [TIPS_IZ_FILE]: { preserved: "do not touch" },
      },
    });
    // Overwrite helper-written file with a known raw payload to assert byte equality.
    const dest = stringsPath(project.root, "French", TIPS_IZ_FILE);
    writeFileSync(dest, existingContent, { encoding: "utf-8" });
    project.makeDump(TIPS_IZ_FILE, { tip1: "你好" });

    const result = migrateTipsAndBuffs(project.root, "French");
    const fr = fileResult(result, TIPS_IZ_FILE);
    expect(fr.status).toBe("skippedExists");
    expect(fr.migrated).toBe(0);
    expect(fr.available).toBe(0);

    // Existing content is left byte-for-byte intact.
    expect(readFileSync(dest, "utf-8")).toBe(existingContent);
  });

  it("reports sourceMissing and creates no file when the dump is absent", () => {
    project = createTempProject();
    project.makeLocale("French", {
      strings: { "translation_strings.json": { "你好": "Bonjour" } },
    });
    // No dumps written at all.

    const result = migrateTipsAndBuffs(project.root, "French");
    for (const filename of [TIPS_IZ_FILE, TIPS_FS_FILE, ABYSS_BUFFS_FILE, TRAVEL_BUFFS_FILE]) {
      const fr = fileResult(result, filename);
      expect(fr.status).toBe("sourceMissing");
      expect(fr.migrated).toBe(0);
      expect(fr.available).toBe(0);
      expect(existsSync(stringsPath(project.root, "French", filename))).toBe(false);
    }
  });

  it("returns the four targets in order", () => {
    project = createTempProject();
    project.makeLocale("French", { strings: { "translation_strings.json": {} } });
    const result = migrateTipsAndBuffs(project.root, "French");
    expect(result.files.map((f) => f.filename)).toEqual([
      TIPS_IZ_FILE,
      TIPS_FS_FILE,
      ABYSS_BUFFS_FILE,
      TRAVEL_BUFFS_FILE,
    ]);
  });
});

// ---- migrateCustomLevels ----------------------------------------------------

describe("migrateCustomLevels", () => {
  it("takes keys from sourceLocale, values from target's translation_strings", () => {
    project = createTempProject();
    // Reference locale supplies the key set (keyed by Chinese text).
    project.makeLocale("English", {
      strings: {
        [CUSTOMLEVEL_STRINGS_FILE]: { "关卡一": "Level One (en)", "关卡二": "Level Two (en)" },
        [CUSTOMLEVEL_REGEXS_FILE]: { "正则": "Regex (en)" },
        [CUSTOM_LEVEL_DATA_FILE]: {
          lvl1: { name: "关卡一", startTip: "开始一" },
          lvl2: { name: "关卡二", startTip: "" },
          lvl3: { name: "未知", startTip: "未知提示" }, // nothing translated → omitted level
        },
      },
    });
    // Target locale supplies the translations.
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": {
          "关卡一": "Niveau un",
          "正则": "Regex fr",
          "开始一": "Debut un",
          // "关卡二" untranslated
        },
      },
    });

    const result = migrateCustomLevels(project.root, "French", "English");
    expect(result.locale).toBe("French");
    expect(result.files.map((f) => f.filename)).toEqual([
      CUSTOMLEVEL_STRINGS_FILE,
      CUSTOMLEVEL_REGEXS_FILE,
      CUSTOM_LEVEL_DATA_FILE,
    ]);

    const strings = fileResult(result, CUSTOMLEVEL_STRINGS_FILE);
    expect(strings.status).toBe("created");
    expect(strings.available).toBe(2);
    expect(strings.migrated).toBe(1);
    expect(readGenerated(project.root, "French", CUSTOMLEVEL_STRINGS_FILE)).toEqual({
      "关卡一": "Niveau un",
    });

    const regexs = fileResult(result, CUSTOMLEVEL_REGEXS_FILE);
    expect(regexs.status).toBe("created");
    expect(regexs.migrated).toBe(1);
    expect(readGenerated(project.root, "French", CUSTOMLEVEL_REGEXS_FILE)).toEqual({
      "正则": "Regex fr",
    });

    const data = fileResult(result, CUSTOM_LEVEL_DATA_FILE);
    expect(data.status).toBe("created");
    // available: lvl1.name + lvl1.startTip + lvl2.name + lvl3.name + lvl3.startTip = 5
    // (lvl2.startTip empty → not offered)
    expect(data.available).toBe(5);
    // migrated: 关卡一(name) + 开始一(startTip) = 2
    expect(data.migrated).toBe(2);
    expect(readGenerated(project.root, "French", CUSTOM_LEVEL_DATA_FILE)).toEqual({
      lvl1: { name: "Niveau un", startTip: "Debut un" },
    });
  });

  it("custom_level_data: partial level keeps only translated fields", () => {
    project = createTempProject();
    project.makeLocale("English", {
      strings: {
        [CUSTOM_LEVEL_DATA_FILE]: { lvl1: { name: "名字", startTip: "提示" } },
      },
    });
    project.makeLocale("French", {
      strings: { "translation_strings.json": { "名字": "Nom" } }, // only name translated
    });

    const result = migrateCustomLevels(project.root, "French", "English");
    const data = fileResult(result, CUSTOM_LEVEL_DATA_FILE);
    expect(data.available).toBe(2);
    expect(data.migrated).toBe(1);
    expect(readGenerated(project.root, "French", CUSTOM_LEVEL_DATA_FILE)).toEqual({
      lvl1: { name: "Nom" },
    });
  });

  it("reports sourceMissing for all three files when the reference locale lacks them", () => {
    project = createTempProject();
    // sourceLocale exists but has no custom-level files.
    project.makeLocale("English", { strings: { "translation_strings.json": {} } });
    project.makeLocale("French", {
      strings: { "translation_strings.json": { "x": "y" } },
    });

    const result = migrateCustomLevels(project.root, "French", "English");
    for (const filename of [
      CUSTOMLEVEL_STRINGS_FILE,
      CUSTOMLEVEL_REGEXS_FILE,
      CUSTOM_LEVEL_DATA_FILE,
    ]) {
      const fr = fileResult(result, filename);
      expect(fr.status).toBe("sourceMissing");
      expect(fr.migrated).toBe(0);
      expect(fr.available).toBe(0);
      expect(existsSync(stringsPath(project.root, "French", filename))).toBe(false);
    }
  });

  it("creates an empty {} file when the source has keys but none are translated", () => {
    project = createTempProject();
    project.makeLocale("English", {
      strings: { [CUSTOMLEVEL_STRINGS_FILE]: { "甲": "A", "乙": "B" } },
    });
    project.makeLocale("French", {
      strings: { "translation_strings.json": {} },
    });

    const result = migrateCustomLevels(project.root, "French", "English");
    const fr = fileResult(result, CUSTOMLEVEL_STRINGS_FILE);
    expect(fr.status).toBe("created");
    expect(fr.migrated).toBe(0);
    expect(fr.available).toBe(2);
    expect(readGenerated(project.root, "French", CUSTOMLEVEL_STRINGS_FILE)).toEqual({});
  });

  it("skips an existing custom-level destination without overwriting", () => {
    project = createTempProject();
    project.makeLocale("English", {
      strings: { [CUSTOMLEVEL_STRINGS_FILE]: { "甲": "A" } },
    });
    project.makeLocale("French", {
      strings: {
        "translation_strings.json": { "甲": "Alpha" },
        [CUSTOMLEVEL_STRINGS_FILE]: { already: "there" },
      },
    });
    const dest = stringsPath(project.root, "French", CUSTOMLEVEL_STRINGS_FILE);
    const existingContent = '{"already": "there"}';
    writeFileSync(dest, existingContent, { encoding: "utf-8" });

    const result = migrateCustomLevels(project.root, "French", "English");
    const fr = fileResult(result, CUSTOMLEVEL_STRINGS_FILE);
    expect(fr.status).toBe("skippedExists");
    expect(readFileSync(dest, "utf-8")).toBe(existingContent);
  });
});
