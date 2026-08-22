/** Span factories — keep screen definitions readable instead of spelling out objects. */

import type { Span, Tone } from "../models.js";

const make = (tone: Tone, text: string, isBold = false): Span =>
  isBold ? { tone, text, isBold } : { tone, text };

export const span = {
  muted: (text: string): Span => make("muted", text),
  text: (text: string): Span => make("text", text),
  bright: (text: string): Span => make("bright", text),
  cyan: (text: string): Span => make("cyan", text),
  green: (text: string): Span => make("green", text),
  lime: (text: string): Span => make("lime", text),
  bold: (tone: Tone, text: string): Span => make(tone, text, true),
};

/** Box-drawing glyphs used by every screen. */
export const GLYPH = {
  barTop: "┌",
  bar: "│",
  barEnd: "└",
  barTee: "├",
  rule: "─",
  cornerTopRight: "╮",
  cornerBottomRight: "╯",
  diamond: "◆",
  diamondHollow: "◇",
  radioOn: "●",
  radioOff: "○",
  check: "✔",
  cursor: "▊",
  ellipsis: "…",
  dash: "—",
  dot: "·",
  arrowRight: "→",
} as const;
