import { describe, expect, it } from "vitest";

import { CliArgError, parseInvocation } from "../../../src/cli/headless/parser";
import { HEADLESS_COMMANDS } from "../../../src/cli/headless/registry";

const parse = (argv: string[]) => parseInvocation(argv, HEADLESS_COMMANDS);

function usageError(argv: string[]): CliArgError {
  try {
    parse(argv);
  } catch (error) {
    if (error instanceof CliArgError) return error;
    throw error;
  }
  throw new Error(`expected a usage error for ${argv.join(" ")}`);
}

describe("parseInvocation", () => {
  it("starts the interactive console when argv is empty", () => {
    expect(parse([])).toEqual({ kind: "interactive" });
  });

  it("reads `--name value`, `--name=value` and boolean flags", () => {
    const invocation = parse(["diff", "--lang=French", "--out", "build", "--with-diff"]);
    expect(invocation.kind).toBe("run");
    if (invocation.kind !== "run") return;
    expect(invocation.command.name).toBe("diff");
    expect(invocation.input.values.get("--lang")).toBe("French");
    expect(invocation.input.values.get("--out")).toBe("build");
    expect(invocation.input.flags.has("--with-diff")).toBe(true);
  });

  it("accepts the global options on every command", () => {
    const invocation = parse(["pr-resume", "--json", "--project-root", "/game"]);
    expect(invocation.kind).toBe("run");
    if (invocation.kind !== "run") return;
    expect(invocation.input.flags.has("--json")).toBe(true);
    expect(invocation.input.values.get("--project-root")).toBe("/game");
  });

  it("resolves --help, -h and --version", () => {
    expect(parse(["--help"])).toEqual({ kind: "help", command: null });
    expect(parse(["-h"])).toEqual({ kind: "help", command: null });
    expect(parse(["--version"])).toEqual({ kind: "version" });
  });

  it("shows a command's help even when its other arguments are incomplete", () => {
    const invocation = parse(["diff", "--nope", "--help"]);
    expect(invocation.kind).toBe("help");
    expect(invocation.kind === "help" && invocation.command?.name).toBe("diff");
  });

  it("rejects an unknown command with exit code 2 and lists the valid ones", () => {
    const error = usageError(["bogus"]);
    expect(error.code).toBe(2);
    expect(error.message).toContain("'duplicates'");
  });

  it("rejects a missing required option", () => {
    expect(usageError(["trello"]).message).toContain("required: --lang");
  });

  it("rejects an unknown flag and an option without its value", () => {
    expect(usageError(["diff", "--lang", "French", "--nope"]).code).toBe(2);
    expect(usageError(["diff", "--lang"]).message).toContain("expected one argument");
    expect(usageError(["pr-resume", "--with-diff"]).code).toBe(2);
  });
});
