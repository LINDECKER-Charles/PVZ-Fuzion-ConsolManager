/**
 * Run one headless command and print its outcome.
 *
 * Output contract: text mode prints `pvzf-console: …` lines on stdout and
 * `error: …` on stderr; `--json` prints exactly one JSON document on stdout,
 * success or failure. Warnings always go to stderr, so stdout stays parseable.
 */

import { describeError } from "../../core/text";
import type { AppContext } from "../context";
import {
  type CommandInput,
  type CommandResult,
  type HeadlessCommand,
  JSON_FLAG,
  PROGRAM_NAME,
  PROJECT_ROOT_OPTION,
  failRun,
  rejectUsage,
} from "./command";

const SUCCESS = 0;
const JSON_INDENT = 2;

/**
 * Point the session at `--project-root` when given, then check the root.
 *
 * The override lives in memory only: headless runs never persist settings.
 */
function applyProjectRoot(
  app: AppContext,
  command: HeadlessCommand,
  input: CommandInput,
): string | null {
  const override = input.values.get(PROJECT_ROOT_OPTION);
  if (override !== undefined) {
    app.settings.projectRoot = override;
  }
  return command.needsProjectRoot ? app.settings.validateProjectRoot() : null;
}

function execute(app: AppContext, command: HeadlessCommand, input: CommandInput): CommandResult {
  const rootError = applyProjectRoot(app, command, input);
  if (rootError !== null) {
    return rejectUsage(rootError);
  }
  try {
    return command.run(app, input);
  } catch (error) {
    return failRun(describeError(error));
  }
}

function writeText(result: CommandResult): void {
  if (!result.ok) {
    process.stderr.write(`error: ${result.message}\n`);
    return;
  }
  for (const line of result.lines) {
    process.stdout.write(`${PROGRAM_NAME}: ${line}\n`);
  }
}

function writeJson(command: HeadlessCommand, result: CommandResult): void {
  const document = result.ok
    ? { ok: true, command: command.name, result: result.data }
    : {
        ok: false,
        command: command.name,
        error: { message: result.message, exitCode: result.exitCode },
      };
  process.stdout.write(`${JSON.stringify(document, null, JSON_INDENT)}\n`);
}

/** Execute `command` and print its outcome; returns the process exit code. */
export function runCommand(app: AppContext, command: HeadlessCommand, input: CommandInput): number {
  const result = execute(app, command, input);
  if (input.flags.has(JSON_FLAG)) {
    writeJson(command, result);
  } else {
    writeText(result);
  }
  return result.ok ? SUCCESS : result.exitCode;
}
