/** The interactive prompts, built on `@clack/prompts`.
 *
 * ## Testability seam
 *
 * Clack puts the terminal in raw mode, so the screen-level tests never reach
 * this module: they inject an `AppDeps` bundle of stubs instead (see
 * `cli/deps.ts`). What is exercised here directly is the translation layer we
 * own — cancellation mapping, the "all locales" sentinel, the picker's
 * thresholds — by handing {@link ConsoleIO} a pair of in-memory streams.
 *
 * ## Cancellation
 *
 * `Esc` / `Ctrl+C` resolve clack prompts with a cancel symbol rather than
 * killing the process. Each wrapper maps that to the least destructive
 * outcome — {@link MENU_CANCELLED}, the current value, `null` for the locale
 * picker — so every screen is escapable and the main menu's *Exit* is the only
 * way out. Nothing is ever written on a cancelled prompt.
 */

import { autocomplete, confirm, isCancel, select, text } from "@clack/prompts";

import { type ConsoleIO, defaultIO, error, streams } from "./output";
import { THEME } from "./theme";
import { listLocalizations } from "../parsers/loaders";

/** Sentinel value of the "All locales" entry in the localization picker. */
export const ALL_TOKEN = "*";
/**
 * Returned by {@link askChoice} when the user escapes the menu.
 *
 * A dedicated value rather than the menu's *Back* key: a menu is free to give
 * `0` a meaning of its own (`Show what's missing` uses it for *All types*), and
 * escaping must never trigger an action.
 */
export const MENU_CANCELLED = -1;
/** Above this many locales the picker becomes a type-to-filter autocomplete. */
const AUTOCOMPLETE_THRESHOLD = 10;
/** Rows shown before a list starts scrolling. */
const MAX_VISIBLE_ITEMS = 12;

export interface MenuOption {
  key: string;
  label: string;
  /** Short annotation shown next to the highlighted row. */
  hint?: string;
}

function optionValue(option: MenuOption, index: number): number {
  const parsed = Number.parseInt(option.key, 10);
  return Number.isNaN(parsed) ? index : parsed;
}

/** Where a menu starts, and which streams it talks to. */
export interface ChoicePrompt {
  initialValue?: number;
  io?: ConsoleIO;
}

/** Pick a menu entry; returns its numeric key, or {@link MENU_CANCELLED}. */
export async function askChoice(
  title: string,
  options: readonly MenuOption[],
  prompt: ChoicePrompt = {},
): Promise<number> {
  const io = prompt.io ?? defaultIO;
  const choice = await select<number>({
    message: THEME.heading(title),
    options: options.map((option, index) => ({
      value: optionValue(option, index),
      label: THEME.primary(option.label),
      hint: option.hint,
    })),
    initialValue: prompt.initialValue,
    maxItems: MAX_VISIBLE_ITEMS,
    ...streams(io),
  });
  return isCancel(choice) ? MENU_CANCELLED : choice;
}

/** The value a list prompt starts on, and which streams it talks to. */
export interface ListPrompt {
  current: string;
  io?: ConsoleIO;
}

/** Pick from a short list of values; cancelling keeps `current`. */
export async function askChoiceFromList(
  label: string,
  values: readonly string[],
  prompt: ListPrompt,
): Promise<string> {
  const io = prompt.io ?? defaultIO;
  const choice = await select<string>({
    message: THEME.heading(label),
    options: values.map((value) => ({
      value,
      label: value,
      hint: value === prompt.current ? "current" : undefined,
    })),
    initialValue: prompt.current,
    maxItems: MAX_VISIBLE_ITEMS,
    ...streams(io),
  });
  return isCancel(choice) ? prompt.current : choice;
}

export async function askText(
  label: string,
  defaultValue = "",
  io: ConsoleIO = defaultIO,
): Promise<string> {
  const answer = await text({
    message: THEME.heading(label),
    placeholder: defaultValue || undefined,
    defaultValue,
    ...streams(io),
  });
  if (isCancel(answer)) {
    return defaultValue;
  }
  return answer.trim() || defaultValue;
}

export async function askConfirm(
  label: string,
  defaultValue = false,
  io: ConsoleIO = defaultIO,
): Promise<boolean> {
  const answer = await confirm({
    message: THEME.heading(label),
    initialValue: defaultValue,
    ...streams(io),
  });
  return isCancel(answer) ? defaultValue : answer;
}

// ---------- localization picker -------------------------------------------------

export interface SelectLocalizationOptions {
  allowMulti?: boolean;
  exclude?: readonly string[] | null;
}

interface PickerOption {
  value: string;
  label: string;
  hint?: string;
}

function pickerOptions(locales: readonly string[], allowMulti: boolean): PickerOption[] {
  const all = { value: ALL_TOKEN, label: "All locales", hint: `${locales.length} folders` };
  return [
    ...(allowMulti ? [all] : []),
    ...locales.map((locale) => ({ value: locale, label: locale })),
  ];
}

/** Long lists get a type-to-filter prompt: two dozen locales are slow to arrow through. */
function promptForLocale(
  options: PickerOption[],
  localeCount: number,
  io: ConsoleIO,
): Promise<string | symbol> {
  const message = THEME.heading("Select a localization");
  const shared = { message, options, maxItems: MAX_VISIBLE_ITEMS, ...streams(io) };
  return localeCount > AUTOCOMPLETE_THRESHOLD
    ? autocomplete<string>({ ...shared, placeholder: "type to filter…" })
    : select<string>(shared);
}

/**
 * Prompt for a locale: a single name, the full list when the user picks
 * *All locales*, or `null` when the picker is cancelled or has nothing to show.
 */
export async function selectLocalization(
  root: string,
  { allowMulti = true, exclude = null }: SelectLocalizationOptions = {},
  io: ConsoleIO = defaultIO,
): Promise<string | string[] | null> {
  const excluded = new Set(exclude ?? []);
  const locales = listLocalizations(root).filter((locale) => !excluded.has(locale));

  if (locales.length === 0) {
    error("No localization folder found under the configured project root.", io);
    return null;
  }

  const choice = await promptForLocale(
    pickerOptions(locales, allowMulti),
    locales.length,
    io,
  );

  if (isCancel(choice)) {
    return null;
  }
  return choice === ALL_TOKEN ? [...locales] : choice;
}
