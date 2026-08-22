/** Autoplay scripts — one frame list per scenario, looped until the visitor takes over. */

import { DOCS_ENTRY, LOCALE_ENTRY, MAIN_ENTRY, RUNS, TOOL_RUNS } from "./catalog.js";
import type { Frame, Line, RunId, ScenarioId } from "./models.js";
import { categoryPicker, docsPicker, localePicker, toolsPicker } from "./screens/pickers.js";
import { mainScreen, runDoneScreen, runProgressScreen } from "./screens/screens.js";
import { GLYPH, span } from "./screens/spans.js";

export const INSTALL_COMMAND = "npx @charles_lindecker/pvzf-console";

const HOLD = {
  promptIdle: 700,
  keystroke: 45,
  commandTyped: 650,
  mainFirst: 1200,
  mainOpen: 900,
  mainGlance: 450,
  mainBack: 850,
  menuStep: 700,
  menuQuick: 420,
  menuShort: 400,
  menuLong: 650,
  localeHover: 750,
  localePick: 900,
  localeTool: 950,
  categoryPick: 1100,
  docsPick: 1000,
  diffRow: 190,
  toolRow: 260,
  docRow: 340,
  done: 3600,
} as const;

const TYPED_CHARS_PER_FRAME = 2;

const frame = (lines: Line[], holdMs: number): Frame => ({ lines, holdMs });

const runFrames = (run: RunId, rowHoldMs: number): Frame[] => {
  const rowCount = RUNS[run].rows.length;
  const progress = Array.from({ length: rowCount }, (_, index) =>
    frame(runProgressScreen(run, index + 1), rowHoldMs),
  );
  return [...progress, frame(runDoneScreen(run), HOLD.done)];
};

const typingFrames = (): Frame[] => {
  const prompt: Line = [span.green(`${GLYPH.ellipsis}/pvzf-workspace`), span.muted(" $ ")];
  const cursor = span.cyan(GLYPH.cursor);
  const frames = [frame([[...prompt, cursor]], HOLD.promptIdle)];
  const step = TYPED_CHARS_PER_FRAME;
  for (let typed = step; typed <= INSTALL_COMMAND.length; typed += step) {
    const partial = span.bright(INSTALL_COMMAND.slice(0, typed));
    frames.push(frame([[...prompt, partial, cursor]], HOLD.keystroke));
  }
  frames.push(frame([[...prompt, span.bright(INSTALL_COMMAND)]], HOLD.commandTyped));
  return frames;
};

const diffScenario = (): Frame[] => [
  ...typingFrames(),
  frame(mainScreen(MAIN_ENTRY.missing), HOLD.mainFirst),
  frame(mainScreen(MAIN_ENTRY.tools), HOLD.mainGlance),
  frame(mainScreen(MAIN_ENTRY.missing), HOLD.mainBack),
  frame(localePicker(LOCALE_ENTRY.german), HOLD.localeHover),
  frame(localePicker(LOCALE_ENTRY.french), HOLD.localePick),
  frame(categoryPicker(0), HOLD.categoryPick),
  ...runFrames("diff", HOLD.diffRow),
];

/** Opens the tools menu, then walks down to `run`, lingering on the entry about to be picked. */
const toolsMenuFrames = (run: RunId): Frame[] => {
  const target = TOOL_RUNS.indexOf(run);
  const walk = Array.from({ length: target }, (_, offset) => {
    const index = offset + 1;
    return frame(toolsPicker(index), index === target ? HOLD.menuLong : HOLD.menuShort);
  });
  return [frame(toolsPicker(0), HOLD.menuStep), ...walk];
};

const toolScenario = (run: "migrate" | "trello"): Frame[] => [
  frame(mainScreen(MAIN_ENTRY.missing), HOLD.mainOpen),
  frame(mainScreen(MAIN_ENTRY.tools), HOLD.menuStep),
  ...toolsMenuFrames(run),
  frame(localePicker(LOCALE_ENTRY.french), HOLD.localeTool),
  ...runFrames(run, HOLD.toolRow),
];

const prScenario = (): Frame[] => [
  frame(mainScreen(MAIN_ENTRY.missing), HOLD.mainOpen),
  frame(mainScreen(MAIN_ENTRY.tools), HOLD.menuQuick),
  frame(mainScreen(MAIN_ENTRY.docs), HOLD.menuStep),
  frame(docsPicker(DOCS_ENTRY.prRecap), HOLD.docsPick),
  ...runFrames("pr", HOLD.docRow),
];

export const buildScenario = (scenario: ScenarioId): Frame[] => {
  if (scenario === "diff") return diffScenario();
  if (scenario === "pr") return prScenario();
  return toolScenario(scenario);
};
