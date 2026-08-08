import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildDuplicatesReport } from "../../src/reporting/duplicates-report";
import type { FileDuplicates, LocaleDuplicates } from "../../src/tools/duplicate-checker";

const dirs: string[] = [];

function makeTmp(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pvzf-dupreport-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length > 0) {
    rmSync(dirs.pop()!, { recursive: true, force: true });
  }
});

function fileDup(partial: Partial<FileDuplicates> & { filename: string }): FileDuplicates {
  return {
    filename: partial.filename,
    duplicateKeys: partial.duplicateKeys ?? [],
    duplicateValues: partial.duplicateValues ?? [],
    isMissing: partial.isMissing ?? false,
  };
}

const localeWith = (...files: FileDuplicates[]): LocaleDuplicates => ({
  locale: "French",
  files,
});

describe("duplicates report", () => {
  it("is skipped when the locale is clean", () => {
    const clean = localeWith(fileDup({ filename: "x.json" }));
    expect(buildDuplicatesReport(clean, makeTmp())).toBeNull();
  });

  it("renders per-file sections", () => {
    const result = localeWith(
      fileDup({
        filename: "translation_strings.json",
        duplicateKeys: [["foo", 2]],
        duplicateValues: [["Hi", ["a", "b"]]],
      }),
    );
    const out = buildDuplicatesReport(result, makeTmp());
    expect(out).not.toBeNull();
    const body = readFileSync(out!, "utf-8");
    expect(body).toContain("translation_strings.json");
    expect(body).toContain("Duplicate keys");
    expect(body).toContain("Repeated values");
    expect(body).toContain("`a`");
    expect(body).toContain("`b`");
  });

  it("keys only omits the values section", () => {
    const result = localeWith(fileDup({ filename: "x.json", duplicateKeys: [["foo", 2]] }));
    const body = readFileSync(buildDuplicatesReport(result, makeTmp())!, "utf-8");
    expect(body).toContain("| Key | Occurrences |");
    expect(body).not.toContain("Keys sharing it");
  });

  it("values only omits the keys section", () => {
    const result = localeWith(
      fileDup({ filename: "x.json", duplicateValues: [["Hi", ["a", "b"]]] }),
    );
    const body = readFileSync(buildDuplicatesReport(result, makeTmp())!, "utf-8");
    expect(body).toContain("Keys sharing it");
    expect(body).not.toContain("| Key | Occurrences |");
  });

  it("skips files with no duplicates", () => {
    const result = localeWith(
      fileDup({ filename: "clean.json" }),
      fileDup({ filename: "dirty.json", duplicateKeys: [["foo", 2]] }),
    );
    const body = readFileSync(buildDuplicatesReport(result, makeTmp())!, "utf-8");
    expect(body).not.toContain("clean.json");
    expect(body).toContain("dirty.json");
  });
});
