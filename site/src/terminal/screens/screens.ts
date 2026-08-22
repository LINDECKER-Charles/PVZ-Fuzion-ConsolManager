/** Screen builders — the fake console's frames as lists of lines, mirroring the real TUI. */

import { DEMO_PROJECT, MAIN_MENU, RUNS } from "../catalog.js";
import {
  INDENT,
  footerLine,
  footerNoteLine,
  headerLines,
  indentedLine,
  spacerLine,
  titleLine,
} from "./lines.js";
import type { Line, MenuItem, RunId } from "../models.js";
import { GLYPH, span } from "./spans.js";

const BOX_INNER_WIDTH = 50;
const STATUS_RULE_WIDTH = 41;
const STATUS_LABEL_WIDTH = 10;
const STATUS_OK_WIDTH = 5;
const RUN_ROW_NAME_WIDTH = 26;

export interface PickScreenOptions {
  readonly title: string;
  readonly items: readonly MenuItem[];
  readonly selection: number;
  readonly hint?: string;
  readonly tail?: string;
}

const visibleWidth = (line: Line): number =>
  line.reduce((width, part) => width + part.text.length, 0);

const statusRow = (label: string, value: string): Line => {
  const okBadge = "[OK]".padEnd(STATUS_OK_WIDTH);
  const body = indentedLine(
    span.green(okBadge),
    span.muted(label.padEnd(STATUS_LABEL_WIDTH)),
    span.bright(value),
  );
  const padding = Math.max(1, BOX_INNER_WIDTH + 1 - visibleWidth(body));
  return [...body, span.muted(" ".repeat(padding) + GLYPH.bar)];
};

export const statusBoxLines = (): Line[] => {
  const blank: Line = [span.muted(GLYPH.bar + " ".repeat(BOX_INNER_WIDTH) + GLYPH.bar)];
  return [
    [
      span.cyan(`${GLYPH.diamondHollow}  `),
      span.bold("bright", "Status "),
      span.muted(GLYPH.rule.repeat(STATUS_RULE_WIDTH) + GLYPH.cornerTopRight),
    ],
    blank,
    statusRow("project", DEMO_PROJECT.path),
    statusRow("source", DEMO_PROJECT.sourceLocale),
    statusRow("reports", DEMO_PROJECT.reportsDir),
    blank,
    [span.muted(GLYPH.barTee + GLYPH.rule.repeat(BOX_INNER_WIDTH) + GLYPH.cornerBottomRight)],
  ];
};

const menuItemLine = (entry: MenuItem, isSelected: boolean): Line => {
  const line = indentedLine(
    isSelected ? span.green(`${GLYPH.radioOn} `) : span.muted(`${GLYPH.radioOff} `),
    isSelected ? span.bright(entry.label) : span.text(entry.label),
  );
  return isSelected && entry.hint ? [...line, span.muted(`   ${entry.hint}`)] : line;
};

export const menuLines = (options: PickScreenOptions): Line[] => {
  const lines = [
    titleLine(options.title, options.hint),
    ...options.items.map((entry, index) => menuItemLine(entry, index === options.selection)),
  ];
  return options.tail ? [...lines, indentedLine(span.muted(options.tail))] : lines;
};

export const mainScreen = (selection: number): Line[] => [
  ...headerLines(),
  ...statusBoxLines(),
  spacerLine(),
  ...menuLines({ title: "Main menu", items: MAIN_MENU, selection }),
  footerLine(),
];

export const pickScreen = (options: PickScreenOptions): Line[] => [
  ...headerLines(),
  ...menuLines(options),
  footerLine(),
];

const runRowLine = (name: string, detail: Line): Line =>
  indentedLine(
    span.green(`${GLYPH.check}  `),
    span.bright(name.padEnd(RUN_ROW_NAME_WIDTH)),
    ...detail,
  );

const runHeadLines = (run: RunId): Line[] => {
  const spec = RUNS[run];
  const head = [...headerLines(), titleLine(spec.title)];
  return spec.preamble ? [...head, indentedLine(...spec.preamble)] : head;
};

/** A tool mid-run: `shownRows` rows have printed, the rest is still pending. */
export const runProgressScreen = (run: RunId, shownRows: number): Line[] => [
  ...runHeadLines(run),
  ...RUNS[run].rows.slice(0, shownRows).map((row) => runRowLine(row.name, row.detail)),
  [span.muted(`${INDENT}${GLYPH.ellipsis}`)],
];

export const runDoneScreen = (run: RunId): Line[] => {
  const spec = RUNS[run];
  return [
    ...runHeadLines(run),
    ...spec.rows.map((row) => runRowLine(row.name, row.detail)),
    spacerLine(),
    titleLine(spec.summaryTitle),
    indentedLine(span.text(spec.summaryNote)),
    footerNoteLine(span.green("Done in 1.4s")),
    [],
    [span.muted(`   Enter ${GLYPH.dash} back to menu ${GLYPH.dot} Esc ${GLYPH.dash} main menu`)],
  ];
};
