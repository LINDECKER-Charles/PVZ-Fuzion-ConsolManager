import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { StringEntry, TravelBuffEntry } from "../../src/core/models";
import {
  buildAbyssBuffsReport,
  buildRegexsReport,
  buildStringsReport,
  buildTipsFsReport,
  buildTipsIzReport,
  buildTravelBuffsReport,
} from "../../src/reporting/strings-report";

const dirs: string[] = [];

function makeTmp(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pvzf-strings-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length > 0) {
    rmSync(dirs.pop()!, { recursive: true, force: true });
  }
});

const missing = (key: string, source: string): StringEntry => ({
  key,
  source,
  target: null,
  status: "missing",
});
const empty = (key: string, source: string): StringEntry => ({
  key,
  source,
  target: "",
  status: "empty",
});

describe("flat reports", () => {
  it("separates missing keys from empty values", () => {
    const reports = makeTmp();
    const out = buildStringsReport([missing("a", "A"), empty("b", "B")], "French", reports);
    const body = readFileSync(out!, "utf-8");
    expect(body).toContain("Missing Keys");
    expect(body).toContain("Empty Values");
  });

  it("omits the empty section when nothing is empty", () => {
    const reports = makeTmp();
    const body = readFileSync(buildStringsReport([missing("a", "A")], "French", reports)!, "utf-8");
    expect(body).toContain("Missing Keys");
    expect(body).not.toContain("Empty Values");
  });

  it("omits the missing section when nothing is missing", () => {
    const reports = makeTmp();
    const body = readFileSync(buildStringsReport([empty("a", "A")], "French", reports)!, "utf-8");
    expect(body).not.toContain("Missing Keys");
    expect(body).toContain("Empty Values");
  });

  it("escapes pipes and newlines inside table cells", () => {
    const reports = makeTmp();
    const body = readFileSync(
      buildStringsReport([empty("a|b", "line1\nline2")], "French", reports)!,
      "utf-8",
    );
    expect(body).toContain("a\\|b");
    expect(body).toContain("line1 ⏎ line2");
  });

  it("escapes backslashes so a literal \\| cannot split the row", () => {
    const reports = makeTmp();
    const body = readFileSync(
      buildStringsReport([empty(String.raw`a\|b`, String.raw`c\d`)], "French", reports)!,
      "utf-8",
    );
    // Escaped backslash, then escaped pipe — the cell stays one cell.
    expect(body).toContain(String.raw`a\\\|b`);
    expect(body).toContain(String.raw`c\\d`);
  });

  it("gives each category its own file", () => {
    const reports = makeTmp();
    const entries = [missing("K", "V")];
    const basename = (target: string | null): string => path.basename(target!);
    expect(basename(buildRegexsReport(entries, "French", reports))).toBe("missing_regexs.md");
    expect(basename(buildAbyssBuffsReport(entries, "French", reports))).toBe(
      "missing_abyss_buffs.md",
    );
    expect(basename(buildTipsIzReport(entries, "French", reports))).toBe("missing_tips_iz.md");
    expect(basename(buildTipsFsReport(entries, "French", reports))).toBe("missing_tips_fs.md");
  });

  it("names the tips variants in their titles", () => {
    const reports = makeTmp();
    const entries = [missing("K", "V")];
    expect(readFileSync(buildTipsIzReport(entries, "French", reports)!, "utf-8")).toContain(
      "I, Zombie",
    );
    expect(readFileSync(buildTipsFsReport(entries, "French", reports)!, "utf-8")).toContain(
      "Fusion Showcase",
    );
  });

  it("returns null and writes nothing when there is nothing to fix", () => {
    const reports = makeTmp();
    expect(buildStringsReport([], "French", reports)).toBeNull();
    expect(existsSync(path.join(reports, "French"))).toBe(false);
  });
});

describe("travel buffs report", () => {
  it("includes the complete missing buff", () => {
    const reports = makeTmp();
    const entries: TravelBuffEntry[] = [
      {
        key: "advancedBuffs:0",
        category: "advancedBuffs",
        id: "0",
        raw: { name: "Call to Arms", desc: "Buff description" },
        source: "Call to Arms",
        target: null,
        status: "missing",
      },
    ];
    const body = readFileSync(buildTravelBuffsReport(entries, "French", reports)!, "utf-8");
    expect(body).toContain("Call to Arms");
    expect(body).toContain("Buff description");
    expect(body).toContain("Missing IDs");
  });

  it("returns null when nothing is missing", () => {
    expect(buildTravelBuffsReport([], "French", makeTmp())).toBeNull();
  });
});
