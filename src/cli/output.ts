/** Terminal output primitives, built on `@clack/prompts`' log helpers.
 *
 * Everything here writes; nothing here asks. The prompts live in `menus.ts`.
 * Both take a {@link ConsoleIO} so tests can bind them to in-memory streams
 * instead of a raw-mode terminal.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { Readable, Writable } from "node:stream";

import { S_BAR, S_BAR_END, intro, log, note, outro } from "@clack/prompts";
import pc from "picocolors";

import { THEME } from "./theme";

/** ANSI erase: screen + scrollback + cursor home. */
const CLEAR_VIEWPORT = "\x1b[2J\x1b[3J\x1b[H";

/**
 * Injectable IO seam. `write` renders inside clack's `│` gutter so ad-hoc
 * lines stay aligned with the prompts around them; `question` backs the one
 * prompt clack has no primitive for.
 */
export interface ConsoleIO {
  question(prompt: string): Promise<string>;
  write(text: string): void;
  /** Overrides the streams clack binds to. Unset outside tests, where the
   * process streams apply. */
  streams?: { input?: Readable; output?: Writable };
}

/** Default IO — readline for questions, clack's log gutter for writes. */
export const defaultIO: ConsoleIO = {
  async question(promptText: string): Promise<string> {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      return await rl.question(promptText);
    } finally {
      rl.close();
    }
  },
  write(text: string): void {
    log.message(text, { symbol: pc.gray(S_BAR) });
  },
};

/** Clack's stream options, derived from a {@link ConsoleIO}. */
export function streams(io: ConsoleIO): { input?: Readable; output?: Writable } {
  return { input: io.streams?.input, output: io.streams?.output };
}

/**
 * Clear the viewport with the ANSI erase sequence.
 *
 * Cheaper and flicker-free compared to shelling out to `cls`/`clear`, and
 * Node >= 20 — the package's floor — enables VT processing on Windows consoles.
 * Skipped when stdout is not a TTY so piped output stays clean.
 */
export function clearConsole(): void {
  if (stdout.isTTY) {
    stdout.write(CLEAR_VIEWPORT);
  }
}

/** Open a screen: clear, then a clack `intro` bar carrying the title. */
export function header(title: string, subtitle?: string, io: ConsoleIO = defaultIO): void {
  clearConsole();
  intro(THEME.heading(` ${title.toUpperCase()} `), streams(io));
  if (subtitle) {
    log.message(pc.dim(subtitle), { symbol: pc.gray(S_BAR), ...streams(io) });
  }
}

/** Close the session. */
export function farewell(message: string, io: ConsoleIO = defaultIO): void {
  outro(THEME.accented(message), streams(io));
}

/** Group heading inside a screen. */
export function section(title: string, io: ConsoleIO = defaultIO): void {
  log.step(THEME.heading(title.toUpperCase()), streams(io));
}

/** Boxed panel — used for the startup status and result recaps. */
export function panel(
  lines: readonly string[],
  title?: string,
  io: ConsoleIO = defaultIO,
): void {
  note(lines.join("\n"), title === undefined ? undefined : THEME.heading(title), streams(io));
}

export function info(message: string, io: ConsoleIO = defaultIO): void {
  log.info(THEME.primary(message), streams(io));
}

export function warn(message: string, io: ConsoleIO = defaultIO): void {
  log.warn(message, streams(io));
}

export function success(message: string, io: ConsoleIO = defaultIO): void {
  log.success(message, streams(io));
}

export function error(message: string, io: ConsoleIO = defaultIO): void {
  log.error(message, streams(io));
}

/** Terminate the current screen with a footer bar, then wait for Enter. */
export async function pressEnterToContinue(io: ConsoleIO = defaultIO): Promise<void> {
  await io.question(
    `${pc.gray(S_BAR)}\n${pc.gray(S_BAR_END)}  ${pc.dim("Press Enter to continue…")} `,
  );
}
