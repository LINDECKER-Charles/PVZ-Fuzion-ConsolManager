import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { migrateCustomLevels } from "../../src/tools/migration";
import { createTempProject, type TempProject } from "../helpers";
import {
  CUSTOMLEVEL_REGEXS_FILE,
  CUSTOMLEVEL_STRINGS_FILE,
  CUSTOM_LEVEL_DATA_FILE,
  fileResult,
  readGenerated,
  stringsPath,
} from "./_migration-fixtures";

let project: TempProject;

afterEach(() => {
  project?.cleanup();
});

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
