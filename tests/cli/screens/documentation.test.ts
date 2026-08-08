import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { App } from "../../../src/cli/app";
import { MENU_CANCELLED } from "../../../src/cli/menus";
import { documentation, prResumeScreen } from "../../../src/cli/screens/documentation";
import { AppSettings } from "../../../src/settings";
import { fakeDeps, seq } from "../_fakes";

const RECAP = [
  "2026-04-01..2026-04-07",
  "https://github.com/owner/repo/pull/123",
  "",
  "## 🌱 Newly Added Plants",
  "",
  "@someone :",
  "* **Briseur de Machoir** (`seedType: 1390`)",
  "",
  "@LINDECKER-Charles :",
  "* **Domination** (`achievement: 52`)",
  "",
].join("\n");

describe("Documentation tab", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "pvzf-doc-"));
  });
  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  function makeApp(
    overrides: Parameters<typeof fakeDeps>[0] = {},
    settings = new AppSettings(),
  ): App {
    return new App({ settings, deps: fakeDeps(overrides), cwd });
  }

  const writeRecap = (name = "recap.md"): string => {
    writeFileSync(path.join(cwd, name), RECAP, "utf-8");
    return name;
  };

  it("generates the summary from the recap after confirmation", async () => {
    writeRecap();
    const answers = seq("recap.md", "summary.md");
    const messages: string[] = [];
    const app = makeApp({
      askText: () => Promise.resolve(answers()),
      askConfirm: () => Promise.resolve(true),
      success: (m) => messages.push(m),
    });

    await prResumeScreen(app);

    const written = readFileSync(path.join(cwd, "summary.md"), "utf-8");
    expect(written).toContain("## 👤 @someone");
    expect(written).toContain("## 👤 Charles LINDECKER");
    expect(messages.join("\n")).toContain("Summary written");
  });

  it("writes nothing when the confirmation is declined", async () => {
    writeRecap();
    const answers = seq("recap.md", "summary.md");
    const app = makeApp({
      askText: () => Promise.resolve(answers()),
      askConfirm: () => Promise.resolve(false),
    });
    await prResumeScreen(app);
    expect(existsSync(path.join(cwd, "summary.md"))).toBe(false);
  });

  it("auto-detects the recap and falls back to the configured output", async () => {
    writeRecap("weekly.md");
    // The empty answers make each prompt return its own default, which is
    // exactly what the auto-detection and the settings provide.
    const app = makeApp(
      { askConfirm: () => Promise.resolve(true) },
      new AppSettings({ docsOutput: "docs/summary.md" }),
    );
    await prResumeScreen(app);
    expect(existsSync(path.join(cwd, "docs", "summary.md"))).toBe(true);
  });

  it("uses the configured lead to fold aliases and credit reviews", async () => {
    writeFileSync(
      path.join(cwd, "recap.md"),
      ["2026-04-01..2026-04-07", "https://x/pull/9", "", "## New Plants", "@ada :", "* A"].join(
        "\n",
      ),
      "utf-8",
    );
    const answers = seq("recap.md", "summary.md");
    const app = makeApp(
      {
        askText: () => Promise.resolve(answers()),
        askConfirm: () => Promise.resolve(true),
      },
      new AppSettings({ docsLeadName: "Ada Lovelace", docsLeadAliases: ["@ada"] }),
    );

    await prResumeScreen(app);
    const written = readFileSync(path.join(cwd, "summary.md"), "utf-8");
    expect(written).toContain("## 👤 Ada Lovelace");
    expect(written).not.toContain("@ada");
  });

  it("reports a missing recap without writing anything", async () => {
    const answers = seq("nope.md", "summary.md");
    const errors: string[] = [];
    const app = makeApp({
      askText: () => Promise.resolve(answers()),
      error: (m) => errors.push(m),
    });
    await prResumeScreen(app);
    expect(errors).toHaveLength(1);
    expect(existsSync(path.join(cwd, "summary.md"))).toBe(false);
  });

  it("refuses to run without a recap path", async () => {
    const errors: string[] = [];
    const app = makeApp({
      askText: () => Promise.resolve(""),
      error: (m) => errors.push(m),
    });
    await prResumeScreen(app);
    expect(errors.join()).toContain("No recap file");
  });

  it("warns instead of writing when no contributor is detected", async () => {
    writeFileSync(path.join(cwd, "recap.md"), "period\nhttps://x/pull/1\n\n## Section\n", "utf-8");
    const answers = seq("recap.md", "summary.md");
    const warnings: string[] = [];
    const app = makeApp({
      askText: () => Promise.resolve(answers()),
      warn: (m) => warnings.push(m),
    });
    await prResumeScreen(app);
    expect(warnings.join()).toContain("No contributor detected");
    expect(existsSync(path.join(cwd, "summary.md"))).toBe(false);
  });

  it("renders the stats panel", async () => {
    writeRecap();
    const answers = seq("recap.md", "summary.md");
    const panels: string[][] = [];
    const app = makeApp({
      askText: () => Promise.resolve(answers()),
      askConfirm: () => Promise.resolve(false),
      panel: (lines) => panels.push([...lines]),
    });
    await prResumeScreen(app);
    const rendered = panels.flat().join("\n");
    expect(rendered).toContain("PR       #123");
    expect(rendered).toContain("Contributor");
    expect(rendered).toContain("Charles LINDECKER");
  });

  it("menu dispatches to the tool and exits on Back or Escape", async () => {
    writeRecap();
    const choices = seq(1, 99, 0);
    const answers = seq("recap.md", "summary.md");
    const app = makeApp({
      askChoice: () => Promise.resolve(choices()),
      askText: () => Promise.resolve(answers()),
      askConfirm: () => Promise.resolve(true),
    });
    await expect(documentation(app)).resolves.toBeUndefined();
    expect(existsSync(path.join(cwd, "summary.md"))).toBe(true);

    const cancelling = makeApp({ askChoice: () => Promise.resolve(MENU_CANCELLED) });
    await expect(documentation(cancelling)).resolves.toBeUndefined();
  });
});
