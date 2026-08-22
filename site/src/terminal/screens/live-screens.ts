/** Maps a live-session state to the lines the terminal should show. */

import { DEMO_PROJECT } from "../catalog.js";
import {
  footerLine,
  footerNoteLine,
  headerLines,
  indentedLine,
  spacerLine,
  titleLine,
} from "./lines.js";
import type { Line, LiveScreen, LiveState } from "../models.js";
import { categoryPicker, docsPicker, localePicker, toolsPicker } from "./pickers.js";
import { mainScreen, runDoneScreen, runProgressScreen } from "./screens.js";
import { GLYPH, span } from "./spans.js";

const SETTINGS_KEY_WIDTH = 16;

const SETTINGS_ROWS: ReadonlyArray<readonly [string, string]> = [
  ["project", DEMO_PROJECT.path],
  ["source locale", DEMO_PROJECT.sourceLocale],
  ["accent colour", "cyan"],
  ["density", "comfortable"],
  ["emoji", "off"],
  ["banner", "on"],
  ["Trello label", "Translation"],
  ["doc lead", `configurable ${GLYPH.dash} any locale`],
];

const settingsRow = ([key, value]: readonly [string, string]): Line =>
  indentedLine(span.muted(key.padEnd(SETTINGS_KEY_WIDTH)), span.bright(value));

const settingsScreen = (): Line[] => [
  ...headerLines(),
  titleLine("Settings", `${GLYPH.dash} remembered across runs`),
  ...SETTINGS_ROWS.map(settingsRow),
  spacerLine(),
  footerNoteLine(span.muted(`Esc ${GLYPH.dash} back`)),
];

const cancelledScreen = (): Line[] => [
  ...headerLines(),
  titleLine("Cancelled"),
  indentedLine(span.text(`Nothing was written ${GLYPH.dash} cancelling never acts.`)),
  footerLine(),
];

const byeScreen = (): Line[] => [
  ...headerLines(),
  indentedLine(span.text("Settings, reports and diffs stay where they are.")),
  footerNoteLine(span.green("See you.")),
];

const SCREEN_BUILDERS: Record<LiveScreen, (state: LiveState) => Line[]> = {
  main: (state) => mainScreen(state.selection),
  locale: (state) => localePicker(state.selection),
  category: (state) => categoryPicker(state.selection),
  tools: (state) => toolsPicker(state.selection),
  docs: (state) => docsPicker(state.selection),
  settings: settingsScreen,
  run: (state) => runProgressScreen(state.run, state.shownRows),
  done: (state) => runDoneScreen(state.run),
  cancelled: cancelledScreen,
  bye: byeScreen,
};

export const liveLines = (state: LiveState): Line[] => SCREEN_BUILDERS[state.screen](state);
