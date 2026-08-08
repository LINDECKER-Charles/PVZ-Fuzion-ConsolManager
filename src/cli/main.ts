/** Program entry point: parse argv, then either run a command or the TUI. */

import { stderr } from "node:process";

import { setNoticeSink } from "../core/notices";
import type { AppSettings } from "../settings";
import { App } from "./app";
import { CliArgError, type ParsedCliArgs, parseCliArgs } from "./args";
import { cmdDiff, cmdPrResume } from "./commands";
import type { AppDeps } from "./deps";

const SUCCESS = 0;

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
}

/**
 * Run the CLI.
 *
 * Non-interactive commands return their own exit code; the interactive TUI
 * returns 0 when the user leaves. `argv` defaults to `process.argv.slice(2)`
 * and `options` is injectable so tests can drive the whole program.
 */
/** Parse argv, or report the usage error and return the exit code to apply. */
function parseOrReport(argv: readonly string[]): ParsedCliArgs | number {
  try {
    return parseCliArgs(argv);
  } catch (error) {
    if (error instanceof CliArgError) {
      stderr.write(`${error.message}\n`);
      return error.code;
    }
    throw error;
  }
}

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  options: MainOptions = {},
): Promise<MainResult> {
  const app = new App(options);
  app.applyTheme();
  // Parser diagnostics belong in the app's own UI, not on a raw stream that
  // would tear through clack's gutter mid-prompt.
  setNoticeSink((message) => app.deps.warn(message));

  const args = parseOrReport(argv);
  if (typeof args === "number") {
    return { exitCode: args };
  }

  switch (args.command) {
    case "diff":
      return { exitCode: cmdDiff(app, args) };
    case "pr-resume":
      return { exitCode: cmdPrResume(app, args) };
    default:
      await app.runInteractive();
      return { exitCode: SUCCESS };
  }
}
