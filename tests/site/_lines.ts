import type { Line } from "../../site/src/terminal/models";

/** Lines the demo viewport shows: 378px tall, 20px top padding, 21px per line. */
export const VIEWPORT_LINES = 17;

export const lineText = (line: Line | undefined): string =>
  (line ?? []).map((part) => part.text).join("");

export const screenText = (lines: readonly Line[]): string => lines.map(lineText).join("\n");
