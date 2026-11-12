/** Help screens, rendered from the command registry so they never drift from it. */

import { GLOBAL_OPTIONS, type HeadlessCommand, type OptionSpec, PROGRAM_NAME } from "./command";

const INDENT = "  ";
const COLUMN_GAP = 2;
const REQUIRED_MARK = "(required) ";

const PROGRAM_TAGLINE = "translation toolkit for Plants vs Zombies: Fusion";
const EXIT_CODES =
  "Exit codes: 0 success · 1 runtime failure · " +
  "2 bad arguments, unknown locale or invalid project root.";

/** `--lang LOCALE` or `--with-diff`. */
function optionSignature(spec: OptionSpec): string {
  return spec.value === undefined ? spec.name : `${spec.name} ${spec.value}`;
}

/** Two aligned columns: left labels, right descriptions. */
function table(rows: ReadonlyArray<readonly [string, string]>): string[] {
  const width = Math.max(...rows.map(([label]) => label.length)) + COLUMN_GAP;
  return rows.map(([label, text]) => `${INDENT}${label.padEnd(width)}${text}`);
}

function optionRows(specs: readonly OptionSpec[]): string[] {
  return table(
    specs.map((spec) => [
      optionSignature(spec),
      `${spec.required ? REQUIRED_MARK : ""}${spec.description}`,
    ]),
  );
}

/** `pvzf-console diff --lang LOCALE [--out DIR] [--with-diff]`. */
function usageLine(command: HeadlessCommand): string {
  const parts = command.options.map((spec) =>
    spec.required ? optionSignature(spec) : `[${optionSignature(spec)}]`,
  );
  return [PROGRAM_NAME, command.name, ...parts].join(" ");
}

export function renderProgramHelp(commands: readonly HeadlessCommand[]): string {
  return [
    `${PROGRAM_NAME} — ${PROGRAM_TAGLINE}`,
    "",
    "Usage:",
    ...table([
      [PROGRAM_NAME, "interactive console (needs a terminal)"],
      [`${PROGRAM_NAME} <command> [options]`, "run one task and exit"],
      [`${PROGRAM_NAME} <command> --help`, "options of a command"],
      [`${PROGRAM_NAME} --version`, "print the version"],
    ]),
    "",
    "Commands:",
    ...table(commands.map((command) => [command.name, command.summary])),
    "",
    "Options for every command:",
    ...optionRows(GLOBAL_OPTIONS),
    "",
    EXIT_CODES,
    "",
  ].join("\n");
}

export function renderCommandHelp(command: HeadlessCommand): string {
  const own = command.options.length > 0 ? ["Options:", ...optionRows(command.options), ""] : [];
  return [
    `Usage: ${usageLine(command)}`,
    "",
    command.summary,
    "",
    ...own,
    "Options for every command:",
    ...optionRows(GLOBAL_OPTIONS),
    "",
    EXIT_CODES,
    "",
  ].join("\n");
}
