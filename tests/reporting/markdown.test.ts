import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { Plant, StringEntry, TravelBuffEntry } from "../../src/core/models";
import type { FileDuplicates, LocaleDuplicates } from "../../src/tools/duplicate-checker";
import {
  buildAbyssBuffsReport,
  buildAchievementReport,
  buildDuplicatesReport,
  buildPlantReport,
  buildRegexsReport,
  buildStringsReport,
  buildTipsReport,
  buildTravelBuffsReport,
  buildZombieReport,
} from "../../src/reporting/markdown";

let tmpPath: string;
const dirs: string[] = [];

function makeTmp(): string {
  const d = mkdtempSync(path.join(tmpdir(), "pvzf-md-"));
  dirs.push(d);
  return d;
}

afterEach(() => {
  while (dirs.length > 0) {
    rmSync(dirs.pop()!, { recursive: true, force: true });
  }
});

function read(p: string): string {
  return readFileSync(p, { encoding: "utf-8" });
}

/** Minimal `FileDuplicates` builder mirroring the Python dataclass defaults. */
function fileDup(partial: Partial<FileDuplicates> & { filename: string }): FileDuplicates {
  return {
    filename: partial.filename,
    duplicateKeys: partial.duplicateKeys ?? [],
    duplicateValues: partial.duplicateValues ?? [],
    missing: partial.missing ?? false,
  };
}

describe("markdown almanac reports", () => {
  it("plant report includes id and raw block", () => {
    tmpPath = makeTmp();
    const plant: Plant = { id: 1, name: "Peashooter", raw: { seedType: 1, name: "Peashooter" } };
    buildPlantReport([plant], "French", tmpPath);
    const body = read(path.join(tmpPath, "French", "missing_plants.md"));
    expect(body).toContain("Peashooter");
    expect(body).toContain("id `1`");
    expect(body).toContain("```json");
  });

  it("almanac reports skip when empty", () => {
    tmpPath = makeTmp();
    buildPlantReport([], "French", tmpPath);
    buildZombieReport([], "French", tmpPath);
    buildAchievementReport([], "French", tmpPath);
    expect(existsSync(path.join(tmpPath, "French"))).toBe(false);
  });
});

describe("markdown flat reports", () => {
  it("strings report separates missing and empty", () => {
    tmpPath = makeTmp();
    const entries: StringEntry[] = [
      { key: "a", source: "A", target: null, status: "missing" },
      { key: "b", source: "B", target: "", status: "empty" },
    ];
    buildStringsReport(entries, "French", tmpPath);
    const body = read(path.join(tmpPath, "French", "missing_strings.md"));
    expect(body).toContain("Missing Keys");
    expect(body).toContain("Empty Values");
  });

  it("tips report filename uses kind", () => {
    tmpPath = makeTmp();
    const entries: StringEntry[] = [{ key: "K", source: "V", target: null, status: "missing" }];
    buildTipsReport(entries, "French", tmpPath, "iz");
    expect(existsSync(path.join(tmpPath, "French", "missing_tips_iz.md"))).toBe(true);
  });

  it("regex and abyss reports create their files", () => {
    tmpPath = makeTmp();
    const entries: StringEntry[] = [{ key: "K", source: "V", target: null, status: "missing" }];
    buildRegexsReport(entries, "French", tmpPath);
    buildAbyssBuffsReport(entries, "French", tmpPath);
    expect(existsSync(path.join(tmpPath, "French", "missing_regexs.md"))).toBe(true);
    expect(existsSync(path.join(tmpPath, "French", "missing_abyss_buffs.md"))).toBe(true);
  });

  it("travel report includes the complete missing buff", () => {
    tmpPath = makeTmp();
    const entries: TravelBuffEntry[] = [{
      key: "advancedBuffs:0",
      category: "advancedBuffs",
      id: "0",
      raw: { name: "Call to Arms", desc: "Buff description" },
      source: "Call to Arms",
      target: null,
      status: "missing",
    }];
    buildTravelBuffsReport(entries, "French", tmpPath);
    const body = read(path.join(tmpPath, "French", "missing_travel_buffs.md"));
    expect(existsSync(path.join(tmpPath, "French", "missing_travel_buffs.md"))).toBe(true);
    expect(body).toContain("Call to Arms");
    expect(body).toContain("Buff description");
    expect(body).toContain("Missing IDs");
  });

  it("strings report with only empty entries omits missing section", () => {
    tmpPath = makeTmp();
    const entries: StringEntry[] = [{ key: "a", source: "A", target: "", status: "empty" }];
    buildStringsReport(entries, "French", tmpPath);
    const body = read(path.join(tmpPath, "French", "missing_strings.md"));
    expect(body).not.toContain("Missing Keys");
    expect(body).toContain("Empty Values");
  });

  it("strings report with only missing entries omits empty section", () => {
    tmpPath = makeTmp();
    const entries: StringEntry[] = [{ key: "a", source: "A", target: null, status: "missing" }];
    buildStringsReport(entries, "French", tmpPath);
    const body = read(path.join(tmpPath, "French", "missing_strings.md"));
    expect(body).toContain("Missing Keys");
    expect(body).not.toContain("Empty Values");
  });
});

describe("duplicates report", () => {
  it("skipped when clean", () => {
    tmpPath = makeTmp();
    const result: LocaleDuplicates = { locale: "French", files: [fileDup({ filename: "x.json" })] };
    expect(buildDuplicatesReport(result, tmpPath)).toBeNull();
  });

  it("renders per-file sections", () => {
    tmpPath = makeTmp();
    const fd = fileDup({
      filename: "translation_strings.json",
      duplicateKeys: [["foo", 2]],
      duplicateValues: [["Hi", ["a", "b"]]],
    });
    const result: LocaleDuplicates = { locale: "French", files: [fd] };
    const out = buildDuplicatesReport(result, tmpPath);
    expect(out).not.toBeNull();
    const body = read(out!);
    expect(body).toContain("translation_strings.json");
    expect(body).toContain("Duplicate keys");
    expect(body).toContain("Repeated values");
    expect(body).toContain("`a`");
    expect(body).toContain("`b`");
  });

  it("keys only omits values section", () => {
    tmpPath = makeTmp();
    const fd = fileDup({ filename: "x.json", duplicateKeys: [["foo", 2]] });
    const result: LocaleDuplicates = { locale: "French", files: [fd] };
    const body = read(buildDuplicatesReport(result, tmpPath)!);
    expect(body).toContain("| Key | Occurrences |");
    expect(body).not.toContain("Keys sharing it");
  });

  it("values only omits keys section", () => {
    tmpPath = makeTmp();
    const fd = fileDup({ filename: "x.json", duplicateValues: [["Hi", ["a", "b"]]] });
    const result: LocaleDuplicates = { locale: "French", files: [fd] };
    const body = read(buildDuplicatesReport(result, tmpPath)!);
    expect(body).toContain("Keys sharing it");
    expect(body).not.toContain("| Key | Occurrences |");
  });

  it("skips files with no duplicates", () => {
    tmpPath = makeTmp();
    const clean = fileDup({ filename: "clean.json" });
    const dirty = fileDup({ filename: "dirty.json", duplicateKeys: [["foo", 2]] });
    const result: LocaleDuplicates = { locale: "French", files: [clean, dirty] };
    const body = read(buildDuplicatesReport(result, tmpPath)!);
    expect(body).not.toContain("clean.json");
    expect(body).toContain("dirty.json");
  });
});
