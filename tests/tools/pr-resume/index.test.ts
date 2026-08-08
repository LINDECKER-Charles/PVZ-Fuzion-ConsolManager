import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  type LeadIdentity,
  DEFAULT_SUMMARY_OUTPUT,
  RecapNotFoundError,
  generateContributionSummary,
  resolveRecapInput,
  resolveSummaryOutput,
  writeContributionSummary,
} from "../../../src/tools/pr-resume";

const LEAD: LeadIdentity = {
  name: "Charles LINDECKER",
  aliases: ["@LINDECKER-Charles"],
};

const RECAP = [
  "2026-04-01..2026-04-07",
  "https://github.com/owner/repo/pull/123",
  "",
  "## 🌱 Newly Added Plants",
  "",
  "@lafourmiedugaming-collab :",
  "* **Briseur de Machoir** (`seedType: 1390`)",
  "",
  "## 🔧 Modified Achievements",
  "",
  "@Kurodatenshi :",
  "* **D'où est-ce que je viens ?** (`achievement: 7`)",
  "",
  "@LINDECKER-Charles :",
  "* **Domination** (`achievement: 52`)",
  "",
].join("\n");

describe("pr-resume orchestration", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "pvzf-prresume-"));
  });
  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  const writeRecap = (name = "recap.md"): string => {
    const p = path.join(cwd, name);
    writeFileSync(p, RECAP, "utf-8");
    return p;
  };

  it("renders one block per contributor and writes the file", () => {
    const inputPath = writeRecap();
    const outputPath = path.join(cwd, "out", "summary.md");
    const result = generateContributionSummary({ inputPath, outputPath, lead: LEAD });

    expect(result.prNumber).toBe("123");
    expect(result.period).toBe("01/04/26 → 07/04/26");
    expect(result.contributors.map((c) => c.name)).toEqual([
      "@Kurodatenshi",
      "@lafourmiedugaming-collab",
      "Charles LINDECKER",
    ]);
    expect(result.contributors.find((c) => c.name === "Charles LINDECKER")).toMatchObject({
      newCount: 0,
      modifiedCount: 1,
      reviewCount: 2,
    });

    const written = readFileSync(outputPath, "utf-8");
    expect(written).toBe(result.markdown);
    expect(written).toContain("## 👤 @Kurodatenshi");
    expect(written).toContain("### 📅 Semaine — `01/04/26 → 07/04/26`");
    expect(written).toContain("> [PR#123](https://github.com/owner/repo/pull/123)");
    expect(written).toContain("## 🌿 **Reviews**");
  });

  it("dryRun renders without touching the disk, and the write can be deferred", () => {
    const inputPath = writeRecap();
    const outputPath = path.join(cwd, "summary.md");
    const result = generateContributionSummary({
      inputPath,
      outputPath,
      lead: LEAD,
      dryRun: true,
    });
    expect(existsSync(outputPath)).toBe(false);

    writeContributionSummary(result);
    expect(readFileSync(outputPath, "utf-8")).toBe(result.markdown);
  });

  it("renders an explicit message when nothing was detected", () => {
    const inputPath = path.join(cwd, "empty.md");
    writeFileSync(inputPath, "2026-04-01..2026-04-07\nhttps://x/pull/1\n\n## Section\n", "utf-8");
    const result = generateContributionSummary({
      inputPath,
      outputPath: path.join(cwd, "out.md"),
      lead: LEAD,
      dryRun: true,
    });
    expect(result.contributors).toEqual([]);
    expect(result.markdown).toContain("Aucune contribution détectée");
  });
});

describe("input/output resolution", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "pvzf-prresume-io-"));
  });
  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("resolves an explicit path against the working directory", () => {
    expect(resolveRecapInput("sub/recap.md", cwd)).toBe(path.resolve(cwd, "sub", "recap.md"));
  });

  it("auto-detects the first .md, skipping boilerplate, folders and the output", () => {
    mkdirSync(path.join(cwd, "NOTES.md"));
    for (const name of ["README.md", "LICENSE.md", "contribution-summary.md", "b-recap.md"]) {
      writeFileSync(path.join(cwd, name), "x", "utf-8");
    }
    expect(resolveRecapInput(null, cwd, DEFAULT_SUMMARY_OUTPUT)).toBe(
      path.join(cwd, "b-recap.md"),
    );
  });

  it("throws when the working directory holds no candidate", () => {
    writeFileSync(path.join(cwd, "README.md"), "x", "utf-8");
    expect(() => resolveRecapInput(null, cwd)).toThrow(RecapNotFoundError);
  });

  it("defaults the output to contribution-summary.md", () => {
    expect(resolveSummaryOutput(null, cwd)).toBe(path.join(cwd, DEFAULT_SUMMARY_OUTPUT));
    expect(resolveSummaryOutput("docs/x.md", cwd)).toBe(path.join(cwd, "docs", "x.md"));
  });
});
