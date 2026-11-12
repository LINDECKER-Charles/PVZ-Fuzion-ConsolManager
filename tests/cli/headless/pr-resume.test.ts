import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { main } from "../../../src/cli/main";
import { AppSettings } from "../../../src/settings";
import { fakeDeps } from "../_fakes";
import { type CapturedStreams, captureStreams } from "./_streams";

const RECAP = [
  "2026-04-01..2026-04-07",
  "https://github.com/owner/repo/pull/123",
  "",
  "## 🌱 Newly Added Plants",
  "",
  "@someone :",
  "* **Briseur de Machoir** (`seedType: 1390`)",
].join("\n");

describe("pr-resume", () => {
  let cwd: string;
  let streams: CapturedStreams;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "pvzf-cmd-"));
    streams = captureStreams();
  });

  afterEach(() => {
    streams.restore();
    rmSync(cwd, { recursive: true, force: true });
  });

  const run = (...argv: string[]) =>
    main(["pr-resume", ...argv], { deps: fakeDeps(), settings: new AppSettings(), cwd });

  it("writes the summary from the first recap found and needs no game folder", async () => {
    writeFileSync(path.join(cwd, "recap.md"), RECAP, "utf-8");
    const { exitCode } = await run();
    expect(exitCode).toBe(0);
    expect(existsSync(path.join(cwd, "contribution-summary.md"))).toBe(true);
    expect(streams.stdout()).toContain("PR#123");
  });

  it("returns the contributors as JSON", async () => {
    writeFileSync(path.join(cwd, "recap.md"), RECAP, "utf-8");
    await run("--input", "recap.md", "--json");
    const { result } = streams.json();
    expect(result.prNumber).toBe("123");
    const names = result.contributors.map((contributor: { name: string }) => contributor.name);
    expect(names.join(" ")).toContain("someone");
  });

  it("fails with exit code 1 when the recap cannot be read", async () => {
    const { exitCode } = await run("--input", "does-not-exist.md");
    expect(exitCode).toBe(1);
    expect(streams.stderr()).toContain("error:");
  });

  it("reports a runtime failure as JSON under --json", async () => {
    const { exitCode } = await run("--json");
    expect(exitCode).toBe(1);
    expect(streams.json()).toMatchObject({ ok: false, command: "pr-resume" });
  });
});
