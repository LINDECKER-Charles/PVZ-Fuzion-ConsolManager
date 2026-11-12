import { describe, expect, it } from "vitest";

import { renderCommandHelp, renderProgramHelp } from "../../../src/cli/headless/help";
import { HEADLESS_COMMANDS } from "../../../src/cli/headless/registry";

describe("help screens", () => {
  it("lists every registered command and the global options", () => {
    const help = renderProgramHelp(HEADLESS_COMMANDS);
    for (const command of HEADLESS_COMMANDS) {
      expect(help).toContain(command.name);
    }
    expect(help).toContain("--project-root DIR");
    expect(help).toContain("--json");
    expect(help).toContain("Exit codes");
  });

  it("documents a command's usage, required and optional options", () => {
    const diff = HEADLESS_COMMANDS.find((command) => command.name === "diff");
    if (diff === undefined) throw new Error("diff is not registered");
    const help = renderCommandHelp(diff);
    expect(help).toContain("Usage: pvzf-console diff --lang LOCALE [--out DIR] [--with-diff]");
    expect(help).toContain("(required)");
  });
});
