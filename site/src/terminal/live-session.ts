/**
 * Live mode reducer — the visitor drives the fake console with the keyboard.
 *
 * Pure: every key press maps (state, key) → (next state, effect). Timers and
 * focus are the controller's business, signalled back through `LiveEffect`.
 */

import {
  CATEGORY_MENU,
  DOCS_ENTRY,
  DOCS_MENU,
  LOCALE_MENU,
  MAIN_ENTRY,
  MAIN_MENU,
  RUNS,
  TOOLS_MENU,
  TOOL_RUNS,
} from "./catalog.js";
import {
  LIVE_KEYS,
  type LiveKey,
  type LiveScreen,
  type LiveState,
  type LiveTransition,
  type RunId,
} from "./models.js";

const MENU_LENGTHS: Partial<Record<LiveScreen, number>> = {
  main: MAIN_MENU.length,
  locale: LOCALE_MENU.length,
  category: CATEGORY_MENU.length,
  tools: TOOLS_MENU.length,
  docs: DOCS_MENU.length,
};

export const isLiveKey = (key: string): key is LiveKey =>
  (LIVE_KEYS as readonly string[]).includes(key);

export const initialLiveState = (): LiveState => ({
  screen: "main",
  selection: 0,
  run: "diff",
  shownRows: 0,
  origin: "main",
});

/** Back to the top of the main menu — after a run, a cancellation or an Escape. */
export const returnToMain = (state: LiveState): LiveState => ({
  ...state,
  screen: "main",
  selection: 0,
});

const settle = (state: LiveState): LiveTransition => ({ state, effect: null });

const goTo = (state: LiveState, screen: LiveScreen, patch: Partial<LiveState> = {}) =>
  settle({ ...state, ...patch, screen, selection: 0 });

const startRun = (state: LiveState, run: RunId): LiveTransition => ({
  state: { ...state, screen: "run", run, shownRows: 0 },
  effect: "start-run",
});

const move = (state: LiveState, delta: number): LiveTransition => {
  const length = MENU_LENGTHS[state.screen];
  if (!length) return settle(state);
  return settle({ ...state, selection: (state.selection + delta + length) % length });
};

const escapeFrom = (state: LiveState): LiveTransition => {
  if (state.screen === "main") return settle(state);
  if (state.screen === "category") return goTo(state, "locale");
  if (state.screen === "locale") return goTo(state, state.origin);
  return settle(returnToMain(state));
};

const confirmMain = (state: LiveState): LiveTransition => {
  const { selection } = state;
  if (selection === MAIN_ENTRY.missing) {
    return goTo(state, "locale", { run: "diff", origin: "main" });
  }
  if (selection === MAIN_ENTRY.tools) return goTo(state, "tools");
  if (selection === MAIN_ENTRY.docs) return goTo(state, "docs");
  if (selection === MAIN_ENTRY.settings) return goTo(state, "settings");
  return { state: { ...state, screen: "bye" }, effect: "hold-then-auto" };
};

const confirmLocale = (state: LiveState): LiveTransition =>
  state.run === "diff" ? goTo(state, "category") : startRun(state, state.run);

const confirmTools = (state: LiveState): LiveTransition => {
  const run = TOOL_RUNS[state.selection];
  return run ? goTo(state, "locale", { run, origin: "tools" }) : settle(returnToMain(state));
};

const confirmDocs = (state: LiveState): LiveTransition =>
  state.selection === DOCS_ENTRY.prRecap ? startRun(state, "pr") : settle(returnToMain(state));

const CONFIRM_BY_SCREEN: Partial<Record<LiveScreen, (state: LiveState) => LiveTransition>> = {
  main: confirmMain,
  locale: confirmLocale,
  category: (state) => startRun(state, "diff"),
  tools: confirmTools,
  docs: confirmDocs,
};

/** Screens that only wait for an acknowledgement (Enter or Escape) before returning. */
const ACKNOWLEDGE_SCREENS: readonly LiveScreen[] = ["done", "settings"];

const reduceRunning = (state: LiveState, key: LiveKey): LiveTransition => {
  if (key !== "Escape") return settle(state);
  return { state: { ...state, screen: "cancelled" }, effect: "hold-then-main" };
};

const reduceMenu = (state: LiveState, key: LiveKey): LiveTransition => {
  if (key === "ArrowUp") return move(state, -1);
  if (key === "ArrowDown") return move(state, 1);
  if (key === "Escape") return escapeFrom(state);
  const confirm = CONFIRM_BY_SCREEN[state.screen];
  return confirm ? confirm(state) : settle(state);
};

export const reduceLiveKey = (state: LiveState, key: LiveKey): LiveTransition => {
  const { screen } = state;
  if (screen === "run") return reduceRunning(state, key);
  if (screen === "cancelled" || screen === "bye") return settle(state);
  if (ACKNOWLEDGE_SCREENS.includes(screen)) {
    return key === "Enter" || key === "Escape" ? settle(returnToMain(state)) : settle(state);
  }
  return reduceMenu(state, key);
};

/** One tick of a running tool: reveal the next row, or finish once every row printed. */
export const advanceLiveRun = (state: LiveState): LiveState => {
  if (state.screen !== "run") return state;
  const rowCount = RUNS[state.run].rows.length;
  if (state.shownRows >= rowCount) return { ...state, screen: "done" };
  return { ...state, shownRows: state.shownRows + 1 };
};
