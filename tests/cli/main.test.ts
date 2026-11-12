import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { main } from "../../src/cli/main";
import { REPO_ROOT } from "../../src/config";
import { fakeDeps } from "./_fakes";
import { type CapturedStreams, captureStreams } from "./headless/_streams";

describe("main", () => {
  let streams: CapturedStreams;

  beforeEach(() => {
    streams = captureStreams();
  });

  afterEach(() => {
    streams.restore();
  });

  it("returns exit code 2 for a bogus subcommand", async () => {
    const { exitCode } = await main(["bogus"], { deps: fakeDeps() });
    expect(exitCode).toBe(2);
    expect(streams.stderr()).toContain("invalid choice");
  });

  it("falls through to the interactive TUI when no command is given", async () => {
    const panels: string[] = [];
    const deps = fakeDeps({
      askChoice: () => Promise.resolve(0), // [0] Exit immediately
      panel: (_lines: readonly string[], title?: string) => panels.push(title ?? ""),
    });
    const { exitCode } = await main([], { deps, isInteractiveTerminal: () => true });
    expect(exitCode).toBe(0);
    expect(panels).toContain("Status");
  });

  it("refuses to start the TUI without a terminal and points to --help", async () => {
    const deps = fakeDeps({ askChoice: () => Promise.reject(new Error("prompted")) });
    const { exitCode } = await main([], { deps, isInteractiveTerminal: () => false });
    expect(exitCode).toBe(2);
    expect(streams.stderr()).toContain("pvzf-console --help");
  });

  it("prints the program help on stdout", async () => {
    const { exitCode } = await main(["--help"]);
    expect(exitCode).toBe(0);
    expect(streams.stdout()).toContain("Commands:");
  });

  it("prints the version of package.json", async () => {
    const manifest = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"));
    const { exitCode } = await main(["--version"]);
    expect(exitCode).toBe(0);
    expect(streams.stdout().trim()).toBe(manifest.version);
  });
});
