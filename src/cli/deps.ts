/** The injectable UI bundle every screen talks to.
 *
 * ESM bindings cannot be reassigned, so the terminal layer is passed around as
 * data instead of imported directly: tests build an {@link AppDeps} of stubs
 * that return scripted answers and capture writes. It is also the only way to
 * drive the UI in a test, since the real implementation (`cli/menus.ts`) puts
 * the terminal in raw mode.
 */

import { stdout } from "node:process";

import { renderTitle } from "./banner";
import {
  type MenuOption,
  askChoice,
  askChoiceFromList,
  askConfirm,
  askText,
  selectLocalization,
} from "./menus";
import {
  type ConsoleIO,
  clearConsole,
  defaultIO,
  error,
  farewell,
  header,
  info,
  panel,
  pressEnterToContinue,
  section,
  success,
  warn,
} from "./output";
import { THEME } from "./theme";
import type { AppSettings } from "../settings";
import { saveSettings } from "../settings-storage";

/** One locale, or the whole list when the user picks *All locales*. */
export type LocalizationChoice = string | string[];

export interface AppDeps {
  io: ConsoleIO;
  /** Persist settings; returns `null` on success or a reason on failure.
   * Injectable so tests can intercept disk writes. */
  saveSettings(settings: AppSettings): string | null;
  renderTitle(candidates: readonly string[]): void;
  /** Open a screen: clear the viewport, then draw the title bar. */
  header(title: string, subtitle?: string): void;
  /** Boxed panel of pre-formatted lines. */
  panel(lines: readonly string[], title?: string): void;
  /** Sign off at the end of the session. */
  farewell(message: string): void;
  askChoice(title: string, options: readonly MenuOption[], initialValue?: number): Promise<number>;
  askChoiceFromList(label: string, values: readonly string[], current: string): Promise<string>;
  askText(label: string, defaultValue?: string): Promise<string>;
  askConfirm(label: string, defaultValue?: boolean): Promise<boolean>;
  /** `null` when the picker is cancelled — the caller must leave the screen. */
  selectLocalization(
    root: string,
    opts?: { allowMulti?: boolean; exclude?: readonly string[] | null },
  ): Promise<LocalizationChoice | null>;
  clearConsole(): void;
  pressEnterToContinue(): Promise<void>;
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  section(title: string): void;
}

/** Build the real dependency bundle from a {@link ConsoleIO}. */
export function realDeps(io: ConsoleIO = defaultIO): AppDeps {
  return {
    io,
    saveSettings,
    // The banner is full-bleed ASCII art: written straight to stdout so it is
    // not indented into clack's `│` gutter like ordinary log lines.
    renderTitle: (candidates) =>
      renderTitle(candidates, (text) => stdout.write(`${THEME.accented(text)}\n`)),
    header: (title, subtitle) => header(title, subtitle, io),
    panel: (lines, title) => panel(lines, title, io),
    farewell: (message) => farewell(message, io),
    askChoice: (title, options, initialValue) =>
      askChoice(title, options, { initialValue, io }),
    askChoiceFromList: (label, values, current) =>
      askChoiceFromList(label, values, { current, io }),
    askText: (label, defaultValue = "") => askText(label, defaultValue, io),
    askConfirm: (label, defaultValue = false) => askConfirm(label, defaultValue, io),
    selectLocalization: (root, opts) => selectLocalization(root, opts, io),
    clearConsole,
    pressEnterToContinue: () => pressEnterToContinue(io),
    info: (message) => info(message, io),
    success: (message) => success(message, io),
    warn: (message) => warn(message, io),
    error: (message) => error(message, io),
    section: (title) => section(title, io),
  };
}
