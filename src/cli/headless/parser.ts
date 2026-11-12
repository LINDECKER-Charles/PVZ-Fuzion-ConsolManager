/** argv → what to do: the TUI, a help screen, the version, or one command. */

import {
  type CommandInput,
  GLOBAL_OPTIONS,
  HELP_FLAG,
  type HeadlessCommand,
  type OptionSpec,
  USAGE_EXIT_CODE,
} from "./command";

const SHORT_HELP_FLAG = "-h";
const VERSION_FLAG = "--version";

export type Invocation =
  | { kind: "interactive" }
  | { kind: "version" }
  /** `command` is `null` for the program-level help. */
  | { kind: "help"; command: HeadlessCommand | null }
  | { kind: "run"; command: HeadlessCommand; input: CommandInput };

/** Raised when argv parsing fails — carries the process exit code to apply. */
export class CliArgError extends Error {
  readonly code: number;

  constructor(message: string, code = USAGE_EXIT_CODE) {
    super(message);
    this.name = "CliArgError";
    this.code = code;
  }
}

function isHelpFlag(arg: string): boolean {
  return arg === HELP_FLAG || arg === SHORT_HELP_FLAG;
}

function optionName(arg: string): string {
  const separator = arg.indexOf("=");
  return separator === -1 ? arg : arg.slice(0, separator);
}

function inlineValue(arg: string): string | undefined {
  const separator = arg.indexOf("=");
  return separator === -1 ? undefined : arg.slice(separator + 1);
}

function isBooleanFlag(spec: OptionSpec): boolean {
  return spec.value === undefined;
}

/**
 * Pull `--name value` / `--name=value` pairs and boolean flags out of `argv`.
 *
 * Anything not declared in `specs` is rejected the way argparse would.
 */
export function parseOptions(argv: readonly string[], specs: readonly OptionSpec[]): CommandInput {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const spec = specs.find((candidate) => candidate.name === optionName(arg));
    if (spec === undefined) {
      throw new CliArgError(`error: unrecognized arguments: ${arg}`);
    }
    if (isBooleanFlag(spec)) {
      flags.add(spec.name);
      continue;
    }
    const value = inlineValue(arg) ?? argv[++index];
    if (value === undefined) {
      throw new CliArgError(`error: argument ${spec.name}: expected one argument`);
    }
    values.set(spec.name, value);
  }
  return { values, flags };
}

function requireMandatory(input: CommandInput, specs: readonly OptionSpec[]): void {
  const missing = specs
    .filter((spec) => spec.required && !input.values.has(spec.name))
    .map((spec) => spec.name);
  if (missing.length > 0) {
    throw new CliArgError(`error: the following arguments are required: ${missing.join(", ")}`);
  }
}

function findCommand(name: string, commands: readonly HeadlessCommand[]): HeadlessCommand {
  const command = commands.find((candidate) => candidate.name === name);
  if (command === undefined) {
    const choices = commands.map((candidate) => `'${candidate.name}'`).join(", ");
    throw new CliArgError(`error: invalid choice: '${name}' (choose from ${choices})`);
  }
  return command;
}

/**
 * Resolve argv against the command registry.
 *
 * `--help` anywhere after a command wins over its other arguments, so a
 * half-typed command line still shows the help instead of a usage error.
 */
export function parseInvocation(
  argv: readonly string[],
  commands: readonly HeadlessCommand[],
): Invocation {
  if (argv.length === 0) return { kind: "interactive" };
  const [first, ...rest] = argv;
  if (isHelpFlag(first)) return { kind: "help", command: null };
  if (first === VERSION_FLAG) return { kind: "version" };

  const command = findCommand(first, commands);
  if (rest.some(isHelpFlag)) return { kind: "help", command };

  const specs = [...command.options, ...GLOBAL_OPTIONS];
  const input = parseOptions(rest, specs);
  requireMandatory(input, specs);
  return { kind: "run", command, input };
}
