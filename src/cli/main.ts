/** Program entry point: parse argv, then run a command, print help, or start the TUI. */

import { stderr, stdin, stdout } from "node:process";

import { setNoticeSink } from "../core/notices";
import type { AppSettings } from "../settings";
import { App } from "./app";
import type { AppDeps } from "./deps";
import { PROGRAM_NAME, USAGE_EXIT_CODE, warnOnStderr } from "./headless/command";
import { renderCommandHelp, renderProgramHelp } from "./headless/help";
import { CliArgError, type Invocation, parseInvocation } from "./headless/parser";
import { HEADLESS_COMMANDS } from "./headless/registry";
import { runCommand } from "./headless/runner";
import { packageVersion } from "./headless/version";

const SUCCESS = 0;
const NO_TERMINAL_MESSAGE =
  "error: the interactive console needs a terminal (stdin and stdout must be a TTY).\n" +
  `Run \`${PROGRAM_NAME} --help\` for the commands that work without one.\n`;

/** Process exit signal carried out of {@link main}. `cli.ts` applies the code. */
export interface MainResult {
  exitCode: number;
}

export interface MainOptions {
  deps?: AppDeps;
  /** Override the loaded settings (tests). */
  settings?: AppSettings;
  /** Override the reports root (tests). */
  reportsRoot?: string;
  /** Override the working directory used by the documentation tools (tests). */
  cwd?: string;
  /** Whether the TUI can run here; defaults to "stdin and stdout are TTYs". */
  isInteractiveTerminal?: () => boolean;
}

function hasInteractiveTerminal(): boolean {
  return Boolean(stdin.isTTY && stdout.isTTY);
}

/** Parse argv, or report the usage error and return the exit code to apply. */
function parseOrReport(argv: readonly string[]): Invocation | number {
  try {
    return parseInvocation(argv, HEADLESS_COMMANDS);
  } catch (error) {
    if (error instanceof CliArgError) {
      stderr.write(`${error.message}\n`);
      return error.code;
    }
    throw error;
  }
}

/**
 * Start the TUI — refused without a terminal, where clack's raw-mode prompts
 * would hang or crash (an AI agent's shell, a CI step, a pipe).
 */
async function runInteractive(app: App, options: MainOptions): Promise<number> {
  const isTerminal = options.isInteractiveTerminal ?? hasInteractiveTerminal;
  if (!isTerminal()) {
    stderr.write(NO_TERMINAL_MESSAGE);
    return USAGE_EXIT_CODE;
  }
  app.applyTheme();
  // Parser diagnostics belong in the app's own UI, not on a raw stream that
  // would tear through clack's gutter mid-prompt.
  setNoticeSink((message) => app.deps.warn(message));
  await app.runInteractive();
  return SUCCESS;
}

async function dispatch(invocation: Invocation, options: MainOptions): Promise<number> {
  switch (invocation.kind) {
    case "help":
      stdout.write(
        invocation.command === null
          ? renderProgramHelp(HEADLESS_COMMANDS)
          : renderCommandHelp(invocation.command),
      );
      return SUCCESS;
    case "version":
      stdout.write(`${packageVersion()}\n`);
      return SUCCESS;
    case "run":
      setNoticeSink(warnOnStderr);
      return runCommand(new App(options), invocation.command, invocation.input);
    case "interactive":
      return runInteractive(new App(options), options);
  }
}

/**
 * Run the CLI.
 *
 * `argv` defaults to `process.argv.slice(2)` and `options` is injectable so
 * tests can drive the whole program.
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  options: MainOptions = {},
): Promise<MainResult> {
  const invocation = parseOrReport(argv);
  if (typeof invocation === "number") {
    return { exitCode: invocation };
  }
  return { exitCode: await dispatch(invocation, options) };
}
