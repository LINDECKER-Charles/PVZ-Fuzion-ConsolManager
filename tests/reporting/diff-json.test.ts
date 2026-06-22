import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { Plant, StringEntry } from "../../src/core/models";
import {
  buildAbyssBuffsDiff,
  buildAchievementsDiff,
  buildPlantsDiff,
  buildRegexsDiff,
  buildStringsDiff,
  buildTipsDiff,
  buildTravelBuffsDiff,
  buildZombiesDiff,
} from "../../src/reporting/diff-json";

const dirs: string[] = [];

function makeTmp(): string {
  const d = mkdtempSync(path.join(tmpdir(), "pvzf-diff-"));
  dirs.push(d);
  return d;
}

afterEach(() => {
  while (dirs.length > 0) {
    rmSync(dirs.pop()!, { recursive: true, force: true });
  }
});

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, { encoding: "utf-8" }));
}

describe("flat string diffs", () => {
  it("writes flat key/value", () => {
    const tmpPath = makeTmp();
    const entries: StringEntry[] = [
      { key: "a", source: "A", target: null, status: "missing" },
      { key: "b", source: "B", target: "", status: "empty" },
    ];
    const out = buildStringsDiff(entries, "French", tmpPath)!;
    expect(readJson(out)).toEqual({ a: "A", b: "B" });
    expect(path.basename(out)).toBe("strings_diff.json");
    expect(out.split(path.sep)).toContain("French");
  });

  it("returns null when no entries", () => {
    const tmpPath = makeTmp();
    expect(buildStringsDiff([], "French", tmpPath)).toBeNull();
    expect(existsSync(path.join(tmpPath, "French"))).toBe(false);
  });

  it("writes empty string for null source", () => {
    const tmpPath = makeTmp();
    const entries: StringEntry[] = [{ key: "a", source: null, target: null, status: "missing" }];
    const out = buildStringsDiff(entries, "French", tmpPath)!;
    expect(readJson(out)).toEqual({ a: "" });
  });

  it("regex and abyss diff filenames", () => {
    const tmpPath = makeTmp();
    const entries: StringEntry[] = [{ key: "K", source: "V", target: null, status: "missing" }];
    expect(path.basename(buildRegexsDiff(entries, "French", tmpPath)!)).toBe("regexs_diff.json");
    expect(path.basename(buildAbyssBuffsDiff(entries, "French", tmpPath)!)).toBe(
      "abyss_buffs_diff.json",
    );
  });

  it("tips diff filename uses kind", () => {
    const tmpPath = makeTmp();
    const entries: StringEntry[] = [{ key: "K", source: "V", target: null, status: "missing" }];
    const out = buildTipsDiff(entries, "French", tmpPath, "iz")!;
    expect(path.basename(out)).toBe("tips_iz_diff.json");
  });
});

describe("travel buffs diff", () => {
  it("returns null when empty", () => {
    const tmpPath = makeTmp();
    expect(buildTravelBuffsDiff([], "French", tmpPath)).toBeNull();
  });

  it("handles key without category", () => {
    const tmpPath = makeTmp();
    const entries: StringEntry[] = [{ key: "orphan", source: "V", target: null, status: "missing" }];
    const out = buildTravelBuffsDiff(entries, "French", tmpPath)!;
    expect(readJson(out)).toEqual({ "": { orphan: "V" } });
  });

  it("restores two-level nesting", () => {
    const tmpPath = makeTmp();
    const entries: StringEntry[] = [
      { key: "cat1:k1", source: "V1", target: null, status: "missing" },
      { key: "cat1:k2", source: "V2", target: null, status: "missing" },
      { key: "cat2:k1", source: "V3", target: null, status: "missing" },
    ];
    const out = buildTravelBuffsDiff(entries, "French", tmpPath)!;
    expect(readJson(out)).toEqual({ cat1: { k1: "V1", k2: "V2" }, cat2: { k1: "V3" } });
  });
});

describe("almanac diffs", () => {
  it("plants diff wraps in root key", () => {
    const tmpPath = makeTmp();
    const plants: Plant[] = [
      { id: 1, name: "Peashooter", raw: { seedType: 1, name: "Peashooter" } },
    ];
    const out = buildPlantsDiff(plants, "French", tmpPath)!;
    expect(readJson(out)).toEqual({ plants: [{ seedType: 1, name: "Peashooter" }] });
  });

  it("zombies and achievements use their root keys", () => {
    const tmpPath = makeTmp();
    const zOut = buildZombiesDiff(
      [{ id: 1, name: "Z", raw: { theZombieType: 1 } }],
      "French",
      tmpPath,
    )!;
    const aOut = buildAchievementsDiff(
      [{ id: 1, name: "A", raw: { achievement: 1 } }],
      "French",
      tmpPath,
    )!;
    expect(readJson(zOut)).toHaveProperty("zombies");
    expect(readJson(aOut)).toHaveProperty("achievements");
  });
});
