import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { Plant } from "../../src/core/models";
import {
  buildAchievementReport,
  buildPlantReport,
  buildZombieReport,
} from "../../src/reporting/almanac-report";

const dirs: string[] = [];

function makeTmp(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pvzf-almanac-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length > 0) {
    rmSync(dirs.pop()!, { recursive: true, force: true });
  }
});

describe("almanac reports", () => {
  it("plant report includes id and raw block", () => {
    const reports = makeTmp();
    const plant: Plant = { id: 1, name: "Peashooter", raw: { seedType: 1, name: "Peashooter" } };
    const out = buildPlantReport([plant], "French", reports);
    expect(out).toBe(path.join(reports, "French", "missing_plants.md"));
    const body = readFileSync(out!, "utf-8");
    expect(body).toContain("Peashooter");
    expect(body).toContain("id `1`");
    expect(body).toContain("```json");
  });

  it("falls back to a placeholder when the entry has no name", () => {
    const reports = makeTmp();
    const out = buildZombieReport([{ id: 7, name: null, raw: {} }], "French", reports);
    expect(readFileSync(out!, "utf-8")).toContain("Name missing");
  });

  it("returns null and writes nothing when there is nothing missing", () => {
    const reports = makeTmp();
    expect(buildPlantReport([], "French", reports)).toBeNull();
    expect(buildZombieReport([], "French", reports)).toBeNull();
    expect(buildAchievementReport([], "French", reports)).toBeNull();
    expect(existsSync(path.join(reports, "French"))).toBe(false);
  });

  it("uses one filename per entity", () => {
    const reports = makeTmp();
    const entry = { id: 1, name: "X", raw: {} };
    expect(path.basename(buildZombieReport([entry], "French", reports)!)).toBe(
      "missing_zombies.md",
    );
    expect(path.basename(buildAchievementReport([entry], "French", reports)!)).toBe(
      "missing_achievements.md",
    );
  });
});
