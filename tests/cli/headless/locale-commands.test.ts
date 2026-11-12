import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { main } from "../../../src/cli/main";
import { TIPS_IZ_FILE } from "../../../src/parsers/strings";
import { AppSettings } from "../../../src/settings";
import { createTempProject, type TempProject } from "../../helpers";
import { fakeDeps } from "../_fakes";
import { type CapturedStreams, captureStreams } from "./_streams";

let project: TempProject;
let streams: CapturedStreams;
let reports: string;

/** Run the CLI against the temp project, as configured in the settings file. */
function run(...argv: string[]) {
  return main(argv, {
    deps: fakeDeps(),
    settings: new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
    reportsRoot: reports,
  });
}

function makeEnglishAndFrench(french: Record<string, string> = {}): void {
  project.makeLocale("English", { strings: { "translation_strings.json": { a: "A", b: "B" } } });
  project.makeLocale("French", { strings: { "translation_strings.json": french } });
}

beforeEach(() => {
  project = createTempProject();
  reports = path.join(project.root, "..", "reports");
  streams = captureStreams();
});

afterEach(() => {
  streams.restore();
  project.cleanup();
});

describe("diff", () => {
  it("writes the reports and prints a text summary", async () => {
    makeEnglishAndFrench({ a: "FR-A" });
    const { exitCode } = await run("diff", "--lang", "French", "--with-diff");
    expect(exitCode).toBe(0);
    expect(streams.stdout()).toContain("pvzf-console: 1 missing entries");
    expect(existsSync(path.join(reports, "French", "missing_strings.md"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "strings_diff.json"))).toBe(true);
  });

  it("prints one JSON document with the count of each category", async () => {
    makeEnglishAndFrench({ a: "FR-A" });
    const { exitCode } = await run("diff", "--lang", "French", "--json");
    const document = streams.json();
    expect(exitCode).toBe(0);
    expect(document.ok).toBe(true);
    expect(document.command).toBe("diff");
    expect(document.result.totalMissing).toBe(1);
    expect(document.result.categories).toContainEqual({ category: "Strings (UI)", missing: 1 });
  });

  it("writes under --out", async () => {
    makeEnglishAndFrench();
    const elsewhere = path.join(project.root, "..", "other-reports");
    await run("diff", "--lang", "French", "--out", elsewhere);
    expect(existsSync(path.join(elsewhere, "French", "missing_strings.md"))).toBe(true);
  });

  it("rejects an unknown locale with exit code 2, listing the valid ones", async () => {
    makeEnglishAndFrench();
    const { exitCode } = await run("diff", "--lang", "Klingon");
    expect(exitCode).toBe(2);
    expect(streams.stderr()).toContain("not found");
    expect(streams.stderr()).toContain("French");
  });

  it("reports a rejection as JSON on stdout under --json", async () => {
    makeEnglishAndFrench();
    const { exitCode } = await run("diff", "--lang", "English", "--json");
    expect(exitCode).toBe(2);
    expect(streams.json()).toMatchObject({ ok: false, error: { exitCode: 2 } });
    expect(streams.json().error.message).toContain("source locale");
  });
});

describe("--project-root", () => {
  it("points the run at another game folder without a configured root", async () => {
    makeEnglishAndFrench();
    const { exitCode } = await main(
      ["diff", "--lang", "French", "--project-root", project.root],
      {
        deps: fakeDeps(),
        settings: new AppSettings({ projectRoot: path.join(project.root, "nope") }),
        reportsRoot: reports,
      },
    );
    expect(exitCode).toBe(0);
  });

  it("fails with exit code 2 when the folder has no Localization/", async () => {
    const { exitCode } = await run("duplicates", "--lang", "French", "--project-root", reports);
    expect(exitCode).toBe(2);
    expect(streams.stderr()).toContain("error:");
  });
});

describe("duplicates", () => {
  it("counts repeated values and writes the report", async () => {
    project.makeLocale("French", {
      strings: { "translation_strings.json": { a: "Same", b: "Same", c: "Other" } },
    });
    const { exitCode } = await run("duplicates", "--lang", "French", "--json");
    const { result } = streams.json();
    expect(exitCode).toBe(0);
    expect(result.repeatedValues).toBe(1);
    expect(result.files[0].duplicateValues).toEqual([["Same", ["a", "b"]]]);
    expect(existsSync(result.report)).toBe(true);
  });
});

describe("trello", () => {
  it("exports the missing entries under --out", async () => {
    makeEnglishAndFrench({ a: "FR-A" });
    const exports = path.join(project.root, "..", "exports");
    const { exitCode } = await run("trello", "--lang", "French", "--out", exports, "--json");
    const { result } = streams.json();
    expect(exitCode).toBe(0);
    expect(result.totalCards).toBe(1);
    expect(result.outputDir).toBe(path.join(exports, "French"));
  });
});

describe("migrate-tips", () => {
  it("creates the missing tips file from the dumps", async () => {
    makeEnglishAndFrench({ "你好": "Bonjour" });
    project.makeDump(TIPS_IZ_FILE, { tip1: "你好", tip2: "再见" });
    const { exitCode } = await run("migrate-tips", "--lang", "French");
    expect(exitCode).toBe(0);
    expect(streams.stdout()).toContain(`created ${TIPS_IZ_FILE} (1/2 translated)`);
  });
});

describe("migrate-levels", () => {
  it("refuses the source locale as a target", async () => {
    makeEnglishAndFrench();
    const { exitCode } = await run("migrate-levels", "--lang", "English");
    expect(exitCode).toBe(2);
  });
});
