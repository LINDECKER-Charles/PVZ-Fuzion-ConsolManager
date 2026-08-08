import { describe, expect, it } from "vitest";

import { CliArgError, parseCliArgs } from "../../src/cli/args";

describe("parseCliArgs", () => {
  it("recognizes the diff subcommand", () => {
    const args = parseCliArgs(["diff", "--lang", "French", "--with-diff"]);
    expect(args).toEqual({ command: "diff", lang: "French", out: null, exportJsonDiff: true });
  });

  it("accepts --lang=value and --out", () => {
    const args = parseCliArgs(["diff", "--lang=German", "--out", "build"]);
    expect(args).toEqual({ command: "diff", lang: "German", out: "build", exportJsonDiff: false });
  });

  it("recognizes the pr-resume subcommand", () => {
    expect(parseCliArgs(["pr-resume"])).toEqual({
      command: "pr-resume",
      input: null,
      output: null,
    });
    expect(parseCliArgs(["pr-resume", "--input=recap.md", "--output", "out.md"])).toEqual({
      command: "pr-resume",
      input: "recap.md",
      output: "out.md",
    });
  });

  it("returns a null command for empty argv", () => {
    expect(parseCliArgs([]).command).toBeNull();
  });

  it("raises CliArgError (exit 2) for an unknown command", () => {
    try {
      parseCliArgs(["bogus"]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CliArgError);
      expect((error as CliArgError).code).toBe(2);
    }
  });

  it("raises CliArgError when --lang is missing", () => {
    expect(() => parseCliArgs(["diff", "--with-diff"])).toThrow(CliArgError);
  });

  it("raises CliArgError on an unknown flag or a value-less option", () => {
    expect(() => parseCliArgs(["diff", "--lang", "French", "--nope"])).toThrow(CliArgError);
    expect(() => parseCliArgs(["diff", "--lang"])).toThrow(CliArgError);
    expect(() => parseCliArgs(["pr-resume", "--with-diff"])).toThrow(CliArgError);
  });
});
