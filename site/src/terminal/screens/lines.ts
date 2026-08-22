/** Line primitives shared by every screen builder: indentation, titles, spacers, footers. */

import type { Line, Span } from "../models.js";
import { GLYPH, span } from "./spans.js";

export const INDENT = `${GLYPH.bar}  `;

export const headerLines = (): Line[] => [
  [span.muted(`${GLYPH.barTop}  `), span.bold("cyan", "PVZF CONSOLE")],
  spacerLine(),
];

/** `◆  Title  hint` — the line that opens a menu, a picker or a run. */
export const titleLine = (title: string, hint = ""): Line => {
  const base: Line = [span.cyan(`${GLYPH.diamond}  `), span.bold("bright", title)];
  return hint ? [...base, span.muted(`  ${hint}`)] : base;
};

export const indentedLine = (...parts: Span[]): Line => [span.muted(INDENT), ...parts];

export const spacerLine = (): Line => [span.muted(GLYPH.bar)];

export const footerLine = (): Line => [span.muted(GLYPH.barEnd)];

/** `└  note` — closes a screen with a trailing remark. */
export const footerNoteLine = (...parts: Span[]): Line => [
  span.muted(`${GLYPH.barEnd}  `),
  ...parts,
];
