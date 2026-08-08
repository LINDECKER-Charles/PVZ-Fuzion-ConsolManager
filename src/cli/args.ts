/** Minimal argparse-equivalent for the headless subcommands. */

/** Exit code argparse uses for a usage error. */
export const USAGE_EXIT_CODE = 2;

const COMMANDS = ["diff", "pr-resume"] as const;

export type ParsedCliArgs =
  | { command: null }
  | { command: "diff"; lang: string; out: string | null; exportJsonDiff: boolean }
  | { command: "pr-resume"; input: string | null; output: string | null };

/** Raised when argv parsing fails — carries the process exit code to apply. */
export class CliArgError extends Error {
  readonly code: number;

  constructor(message: string, code = USAGE_EXIT_CODE) {
    super(message);
    this.name = "CliArgError";
    this.code = code;
  }
}

/** What a switch scan found: `--name value` pairs and the bare flags present. */
interface ParsedFlags {
  values: Map<string, string>;
  flags: Set<string>;
}

/** Which switches a subcommand accepts. */
interface FlagSpec {
  /** Switches taking a value, as `--name value` or `--name=value`. */
  options: readonly string[];
  /** Switches taking no value. */
  flags: readonly string[];
}

function optionName(arg: string): string {
  const separator = arg.indexOf("=");
  return separator === -1 ? arg : arg.slice(0, separator);
}

function inlineValue(arg: string): string | undefined {
  const separator = arg.indexOf("=");
  return separator === -1 ? undefined : arg.slice(separator + 1);
}

/**
 * Pull `--name value` / `--name=value` pairs and boolean flags out of `argv`.
 *
 * Anything not declared in `spec` is rejected the way argparse would, with
 * exit code 2.
 */
function parseFlags(argv: readonly string[], spec: FlagSpec): ParsedFlags {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (spec.flags.includes(arg)) {
      flags.add(arg);
      continue;
    }
    const name = optionName(arg);
    if (!spec.options.includes(name)) {
      throw new CliArgError(`error: unrecognized arguments: ${arg}`);
    }
    const value = inlineValue(arg) ?? argv[++index];
    if (value === undefined) {
      throw new CliArgError(`error: argument ${name}: expected one argument`);
    }
    values.set(name, value);
  }

  return { values, flags };
}

function parseDiffArgs(rest: readonly string[]): ParsedCliArgs {
  const { values, flags } = parseFlags(rest, {
    options: ["--lang", "--out"],
    flags: ["--with-diff"],
  });
  const lang = values.get("--lang");
  if (lang === undefined) {
    throw new CliArgError("error: the following arguments are required: --lang");
  }
  return {
    command: "diff",
    lang,
    out: values.get("--out") ?? null,
    exportJsonDiff: flags.has("--with-diff"),
  };
}

function parsePrResumeArgs(rest: readonly string[]): ParsedCliArgs {
  const { values } = parseFlags(rest, { options: ["--input", "--output"], flags: [] });
  return {
    command: "pr-resume",
    input: values.get("--input") ?? null,
    output: values.get("--output") ?? null,
  };
}

/**
 * Parse the supported command lines:
 *   `diff --lang <LOCALE> [--out DIR] [--with-diff]`
 *   `pr-resume [--input FILE] [--output FILE]`
 *
 * Unknown commands and missing required options raise {@link CliArgError}.
 */
export function parseCliArgs(argv: readonly string[] = []): ParsedCliArgs {
  if (argv.length === 0) {
    return { command: null };
  }
  const [command, ...rest] = argv;

  if (command === "diff") return parseDiffArgs(rest);
  if (command === "pr-resume") return parsePrResumeArgs(rest);

  const choices = COMMANDS.map((name) => `'${name}'`).join(", ");
  throw new CliArgError(`error: invalid choice: '${command}' (choose from ${choices})`);
}
