/**
 * Contract of a headless subcommand.
 *
 * A command is data plus one `run` function: the parser, the help screen and
 * the dispatcher are all driven by the same {@link HeadlessCommand} records, so
 * adding a command never touches them.
 */

import type { AppContext } from "../context";

/** Name of the executable, as published in `package.json#bin`. */
export const PROGRAM_NAME = "pvzf-console";

/** Exit code for a usage error — the value argparse uses. */
export const USAGE_EXIT_CODE = 2;
/** Exit code for a runtime failure. */
export const FAILURE_EXIT_CODE = 1;

export const HELP_FLAG = "--help";
export const JSON_FLAG = "--json";
export const PROJECT_ROOT_OPTION = "--project-root";

/** One `--name` switch a command accepts. */
export interface OptionSpec {
  readonly name: string;
  /** Placeholder shown in the help (`LOCALE`, `DIR`); absent for a boolean flag. */
  readonly value?: string;
  readonly required?: boolean;
  readonly description: string;
}

/** Switches accepted by every command. */
export const GLOBAL_OPTIONS: readonly OptionSpec[] = [
  {
    name: PROJECT_ROOT_OPTION,
    value: "DIR",
    description: "PvZ_Fusion_Translator folder for this run (not saved to the settings).",
  },
  { name: JSON_FLAG, description: "Print one JSON document on stdout instead of text." },
  { name: HELP_FLAG, description: "Show the help of the command." },
];

/** What the parser extracted from argv for one command. */
export interface CommandInput {
  /** `--name value` pairs. */
  readonly values: ReadonlyMap<string, string>;
  /** Boolean flags present. */
  readonly flags: ReadonlySet<string>;
}

export interface CommandSuccess {
  readonly ok: true;
  /** Human-readable summary, one line each. */
  readonly lines: readonly string[];
  /** Machine-readable outcome, emitted as-is under `--json`. */
  readonly data: Readonly<Record<string, unknown>>;
}

export interface CommandFailure {
  readonly ok: false;
  readonly exitCode: number;
  readonly message: string;
}

export type CommandResult = CommandSuccess | CommandFailure;

export interface HeadlessCommand {
  readonly name: string;
  /** One line, shown in the command list. */
  readonly summary: string;
  readonly options: readonly OptionSpec[];
  /** Reads the game files: the project root is validated before `run`. */
  readonly needsProjectRoot: boolean;
  run(app: AppContext, input: CommandInput): CommandResult;
}

/**
 * Value of an option the parser already enforced as required.
 *
 * Throws only on a registry bug (option read but not declared `required`).
 */
export function requiredValue(input: CommandInput, name: string): string {
  const value = input.values.get(name);
  if (value === undefined) {
    throw new Error(`option ${name} is not declared as required`);
  }
  return value;
}

export function succeed(
  lines: readonly string[],
  data: Readonly<Record<string, unknown>>,
): CommandSuccess {
  return { ok: true, lines, data };
}

/** A failure caused by the arguments (unknown locale, invalid root…): exit 2. */
export function rejectUsage(message: string): CommandFailure {
  return { ok: false, exitCode: USAGE_EXIT_CODE, message };
}

/** A failure while doing the work (unreadable file…): exit 1. */
export function failRun(message: string): CommandFailure {
  return { ok: false, exitCode: FAILURE_EXIT_CODE, message };
}

/** Write a non-fatal diagnostic on stderr, keeping stdout clean for `--json`. */
export function warnOnStderr(message: string): void {
  process.stderr.write(`warning: ${message}\n`);
}
