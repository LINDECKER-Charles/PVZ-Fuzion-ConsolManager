import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { main } from "../../src/cli/main";
import { AppSettings } from "../../src/settings";
import { createTempProject, type TempProject } from "../helpers";
import { fakeDeps } from "./_fakes";

describe("main", () => {
  let project: TempProject;
  let outSpy: any;
  let errSpy: any;

  beforeEach(() => {
    project = createTempProject();
    outSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  });

  afterEach(() => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    project.cleanup();
  });

  it("runs the diff command and returns exit code 0", async () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "V" } } });
    project.makeLocale("French");
    const { exitCode } = await main(["diff", "--lang", "French"], {
      deps: fakeDeps(),
      settings: new AppSettings({ projectRoot: project.root, sourceLocale: "English" }),
      reportsRoot: path.join(project.root, "..", "reports"),
    });
    expect(exitCode).toBe(0);
  });

  it("returns exit code 2 for a bogus subcommand", async () => {
    const { exitCode } = await main(["bogus"], { deps: fakeDeps() });
    expect(exitCode).toBe(2);
  });

  it("falls through to the interactive TUI when no command is given", async () => {
    const panels: string[] = [];
    const deps = fakeDeps({
      askChoice: () => Promise.resolve(0), // [0] Exit immediately
      panel: (_lines: readonly string[], title?: string) => panels.push(title ?? ""),
    });
    const { exitCode } = await main([], { deps });
    expect(exitCode).toBe(0);
    expect(panels).toContain("Status");
  });

  it("runs the pr-resume command and returns exit code 0", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "pvzf-docs-"));
    try {
      writeFileSync(
        path.join(cwd, "recap.md"),
        [
          "2026-04-01..2026-04-07",
          "https://github.com/owner/repo/pull/123",
          "",
          "## 🌱 Newly Added Plants",
          "",
          "@someone :",
          "* **Briseur de Machoir** (`seedType: 1390`)",
        ].join("\n"),
        "utf-8",
      );
      const { exitCode } = await main(["pr-resume", "--input", "recap.md"], {
        deps: fakeDeps(),
        cwd,
      });
      expect(exitCode).toBe(0);
      expect(existsSync(path.join(cwd, "contribution-summary.md"))).toBe(true);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("returns exit code 1 when the recap cannot be read", async () => {
    const { exitCode } = await main(["pr-resume", "--input", "does-not-exist.md"], {
      deps: fakeDeps(),
    });
    expect(exitCode).toBe(1);
  });
});
