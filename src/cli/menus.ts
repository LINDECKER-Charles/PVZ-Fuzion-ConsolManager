/** Interactive TUI primitives — faithful port of `cli/menus.py`.
 *
 * Python used the builtins `input()` / `print()`, which pytest monkeypatched.
 * Node has no synchronous `input()`, so every prompt is routed through an
 * injectable {@link ConsoleIO}. The default implementation is backed by
 * `node:readline/promises` + `process.stdout`; tests pass a fake IO that yields
 * scripted answers and records writes — the ESM equivalent of the pytest seam.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { execSync } from "node:child_process";

import { THEME } from "./theme";
import { listLocalizations } from "../parsers/loaders";

export const HEADER_FILL = "─";
export const ALL_TOKEN = "*";
export const PROMPT_SYMBOL = "❯";

export interface MenuOption {
  key: string;
  label: string;
}

export function menuOption(key: string, label: string): MenuOption {
  return { key, label };
}

/**
 * Injectable IO seam. `question` mirrors `input(prompt)`; `write` mirrors
 * `print(text)` (a trailing newline is appended by `write`).
 */
export interface ConsoleIO {
  question(prompt: string): Promise<string>;
  write(text: string): void;
}

/** Default IO backed by readline/promises + stdout. A fresh readline interface
 * is opened per question and closed immediately so the event loop can exit. */
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
    stdout.write(text + "\n");
  },
};

export function clearConsole(): void {
  try {
    execSync(process.platform === "win32" ? "cls" : "clear", { stdio: "inherit" });
  } catch {
    // `cls`/`clear` is cosmetic; never fail the program over it.
  }
}

export async function pressEnterToContinue(io: ConsoleIO = defaultIO): Promise<void> {
  await io.question("\n  Press Enter to continue... ");
  clearConsole();
}

function parseInt_(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  // Python's `int(str)` accepts an optional sign and digits only.
  if (/^[+-]?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  return fallback;
}

function blankLines(io: ConsoleIO, n = 1): void {
  for (let i = 0; i < THEME.blankLines * n; i++) {
    io.write("");
  }
}

export async function prompt(io: ConsoleIO = defaultIO): Promise<string> {
  return io.question(`  ${THEME.accented(PROMPT_SYMBOL, true)} `);
}

export function section(title: string, io: ConsoleIO = defaultIO): void {
  blankLines(io);
  io.write(`  ${THEME.accented(title.toUpperCase(), true)}`);
  io.write(`  ${THEME.accented(HEADER_FILL.repeat(title.length))}`);
  blankLines(io);
}

export function printMenu(title: string, options: readonly MenuOption[], io: ConsoleIO = defaultIO): void {
  section(title, io);
  const keyWidth = Math.max(...options.map((opt) => opt.key.length));
  for (const opt of options) {
    const keyFmt = opt.key.padStart(keyWidth);
    io.write(`    [${THEME.accented(keyFmt, true)}]  ${THEME.primary(opt.label)}`);
  }
  blankLines(io);
}

export async function askChoice(
  title: string,
  options: readonly MenuOption[],
  defaultValue = -1,
  io: ConsoleIO = defaultIO,
): Promise<number> {
  printMenu(title, options, io);
  return parseInt_(await prompt(io), defaultValue);
}

export function info(message: string, io: ConsoleIO = defaultIO): void {
  io.write(`  ${THEME.primary(message)}`);
}

export function warn(message: string, io: ConsoleIO = defaultIO): void {
  const icon = THEME.emoji("⚠️ ", "[!]");
  io.write(`  ${icon} ${THEME.colorize(message, "yellow")}`);
}

export function success(message: string, io: ConsoleIO = defaultIO): void {
  const icon = THEME.emoji("✅", "[OK]");
  io.write(`  ${icon} ${THEME.colorize(message, "green")}`);
}

export function error(message: string, io: ConsoleIO = defaultIO): void {
  const icon = THEME.emoji("❌", "[X]");
  io.write(`  ${icon} ${THEME.colorize(message, "red")}`);
}

// ---------- localization picker -------------------------------------------------

function renderLocalesGrid(locales: readonly string[], io: ConsoleIO, columns = 3): void {
  const width = locales.reduce((max, loc) => Math.max(max, loc.length), 0);
  const rows = Math.floor((locales.length + columns - 1) / columns);
  for (let row = 0; row < rows; row++) {
    const cells: string[] = [];
    for (let col = 0; col < columns; col++) {
      const idx = row + col * rows;
      if (idx >= locales.length) {
        continue;
      }
      const key = THEME.accented(String(idx).padStart(2), true);
      cells.push(`[${key}]  ${locales[idx].padEnd(width)}`);
    }
    io.write("    " + cells.join("   "));
  }
}

export interface SelectLocalizationOptions {
  allowMulti?: boolean;
  exclude?: readonly string[] | null;
}

/**
 * Prompt for a locale. Returns a single locale name, or the full list when
 * `allowMulti` is true and the user picks `*`.
 */
export async function selectLocalization(
  root: string,
  { allowMulti = true, exclude = null }: SelectLocalizationOptions = {},
  io: ConsoleIO = defaultIO,
): Promise<string | string[]> {
  section("Select a localization", io);
  let localizations = listLocalizations(root);
  if (exclude && exclude.length > 0) {
    localizations = localizations.filter((loc) => !exclude.includes(loc));
  }

  if (allowMulti) {
    io.write(`    [ ${THEME.accented(ALL_TOKEN, true)}]  All locales`);
    blankLines(io);
  }
  renderLocalesGrid(localizations, io);
  const hint = allowMulti ? `(number or '${ALL_TOKEN}' for all)` : "(single locale only)";
  blankLines(io);
  info(hint, io);

  for (;;) {
    const raw = (await prompt(io)).trim();
    if (allowMulti && raw === ALL_TOKEN) {
      return [...localizations];
    }
    const idx = parseInt_(raw, -1);
    if (idx >= 0 && idx < localizations.length) {
      return localizations[idx];
    }
    error(
      "Invalid choice. Please enter a number from the list" +
        (allowMulti ? ` or '${ALL_TOKEN}'.` : "."),
      io,
    );
  }
}

export async function askText(
  label: string,
  defaultValue = "",
  io: ConsoleIO = defaultIO,
): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const raw = await io.question(`  ${THEME.primary(label + suffix + ": ")}`);
  return raw.trim() || defaultValue;
}

/** Show a short list; return the chosen value or the current one on invalid input. */
export async function askChoiceFromList(
  label: string,
  values: readonly string[],
  current: string,
  io: ConsoleIO = defaultIO,
): Promise<string> {
  section(label, io);
  values.forEach((value, idx) => {
    const marker = value === current ? " (current)" : "";
    const key = THEME.accented(String(idx).padStart(2), true);
    io.write(`    [${key}]  ${value}${marker}`);
  });
  blankLines(io);
  const idx = parseInt_(await prompt(io), -1);
  if (idx >= 0 && idx < values.length) {
    return values[idx];
  }
  return current;
}
