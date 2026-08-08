import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { App } from "../../src/cli/app";
import { cmdDiff, cmdPrResume } from "../../src/cli/commands";
import { AppSettings } from "../../src/settings";
import { createTempProject, type TempProject } from "../helpers";
import { fakeDeps } from "./_fakes";

const RECAP = [
  "2026-04-01..2026-04-07",
  "https://github.com/owner/repo/pull/123",
  "",
  "## 🌱 Newly Added Plants",
  "",
  "@someone :",
  "* **Briseur de Machoir** (`seedType: 1390`)",
].join("\n");

describe("cmdDiff", () => {
  let project: TempProject;
  let app: App;
  let reports: string;
  let outSpy: any;
  let errSpy: any;

  beforeEach(() => {
    project = createTempProject();
    reports = path.join(project.root, "..", "reports");
    app = new App({
      settings: new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
      deps: fakeDeps(),
      reportsRoot: reports,
    });
    outSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  });

  afterEach(() => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    project.cleanup();
  });

  const stdoutText = (): string => outSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("");
  const stderrText = (): string => errSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("");

  it("runs end-to-end and returns 0", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A", b: "B" } } });
    project.makeLocale("French", { strings: { "translation_strings.json": { a: "FR-A" } } });
    const code = cmdDiff(app, { lang: "French", out: reports, exportJsonDiff: true });
    expect(code).toBe(0);
    expect(stdoutText()).toContain("1 missing entries");
    expect(existsSync(path.join(reports, "French", "missing_strings.md"))).toBe(true);
    expect(existsSync(path.join(reports, "French", "strings_diff.json"))).toBe(true);
  });

  it("rejects an unknown locale with exit code 2", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A" } } });
    expect(cmdDiff(app, { lang: "Klingon", out: null, exportJsonDiff: false })).toBe(2);
    expect(stderrText()).toContain("not found");
  });

  it("rejects the source locale as a target with exit code 2", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { a: "A" } } });
    expect(cmdDiff(app, { lang: "English", out: null, exportJsonDiff: false })).toBe(2);
    expect(stderrText()).toContain("source locale");
  });

  it("fails with exit code 2 when the root is invalid", () => {
    const broken = new App({
      settings: new AppSettings({ projectRoot: path.join(project.root, "nope") }),
      deps: fakeDeps(),
      reportsRoot: reports,
    });
    expect(cmdDiff(broken, { lang: "French", out: null, exportJsonDiff: false })).toBe(2);
  });

  it("leaves the session reports root untouched", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const before = app.reportsRoot;
    expect(cmdDiff(app, { lang: "French", out: null, exportJsonDiff: false })).toBe(0);
    expect(app.reportsRoot).toBe(before);
  });

  it("writes under --out without changing the session state", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const elsewhere = path.join(project.root, "..", "other-reports");
    expect(cmdDiff(app, { lang: "French", out: elsewhere, exportJsonDiff: false })).toBe(0);
    expect(existsSync(path.join(elsewhere, "French", "missing_strings.md"))).toBe(true);
    expect(app.reportsRoot).toBe(reports);
  });
});

describe("cmdPrResume", () => {
  let cwd: string;
  let outSpy: any;
  let errSpy: any;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "pvzf-cmd-"));
    outSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  });

  afterEach(() => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(cwd, { recursive: true, force: true });
  });

  const makeApp = (): App => new App({ settings: new AppSettings(), deps: fakeDeps(), cwd });

  it("writes the summary and returns 0", () => {
    writeFileSync(path.join(cwd, "recap.md"), RECAP, "utf-8");
    expect(cmdPrResume(makeApp(), { input: "recap.md", output: null })).toBe(0);
    expect(existsSync(path.join(cwd, "contribution-summary.md"))).toBe(true);
  });

  it("returns 1 when the recap cannot be read", () => {
    expect(cmdPrResume(makeApp(), { input: "does-not-exist.md", output: null })).toBe(1);
    expect(errSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("")).toContain("error:");
  });
});
