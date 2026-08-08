/** Weekly-PR-recap markdown parser.
 *
 * Expected shape (first two non-empty lines are the header):
 *
 * ```markdown
 * 2026-04-01..2026-04-07
 * https://github.com/owner/repo/pull/123
 *
 * ## 🌱 Newly Added Plants
 *
 * @handle :
 * * **Item** (`seedType: 1390`)
 * ```
 */

import { readFileSync } from "node:fs";

export interface PrRecapDocument {
  /** Raw period line, as written by the recap author. */
  period: string;
  /** Raw PR URL line. */
  prUrl: string;
  /** Everything after the header — sections, contributors and bullets. */
  bodyLines: string[];
}

/** Thrown when the recap does not carry the two mandatory header lines. */
export class PrRecapParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrRecapParseError";
  }
}

const HEADER_LINES = 2;
const PR_NUMBER = /\/pull\/(\d+)/;
const GITHUB_HANDLE = /^@[A-Za-z0-9_.-]+$/;
const MARKDOWN_LINK = /^\[([^\]]+)\]\([^)]*\)\s*:$/;
const TRAILING_COLON = /\s*:$/;
const BULLET = /^[*-]\s+/;

/** Split the recap into its header (period + PR URL) and body. */
export function parseRecap(raw: string): PrRecapDocument {
  const lines = raw.split(/\r?\n/);

  const header: string[] = [];
  let bodyStart = 0;
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    header.push(trimmed);
    if (header.length === HEADER_LINES) {
      bodyStart = index + 1;
      break;
    }
  }

  if (header.length < HEADER_LINES) {
    throw new PrRecapParseError(
      "The recap needs at least two non-empty lines: the period, then the PR link.",
    );
  }

  const [period, prUrl] = header;
  return { period, prUrl, bodyLines: lines.slice(bodyStart) };
}

export function readRecapFile(inputPath: string): PrRecapDocument {
  return parseRecap(readFileSync(inputPath, { encoding: "utf-8" }));
}

/** `https://…/pull/123` → `"123"`; `"?"` when the URL carries no PR number. */
export function extractPrNumber(prUrl: string): string {
  return PR_NUMBER.exec(prUrl)?.[1] ?? "?";
}

/** Strip heading markers, bold markers and redundant whitespace from a `##` line. */
export function normalizeSectionTitle(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recognise a contributor marker — either `@handle :` or `[Display name](url) :`.
 * Returns the handle/name, or `null` when the line is something else.
 *
 * The trailing colon is optional on a bare handle (recaps are inconsistent
 * about it) but required on the link form, where it is the only thing telling
 * a contributor marker apart from an ordinary inline link.
 */
export function extractContributor(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  const handle = trimmed.replace(TRAILING_COLON, "");
  if (GITHUB_HANDLE.test(handle)) {
    return handle;
  }
  const link = MARKDOWN_LINK.exec(trimmed);
  return link ? link[1].trim() : null;
}

/** Strip the `* ` / `- ` marker from a bullet line, or `null` if not a bullet. */
export function extractBullet(line: string): string | null {
  const trimmed = line.trim();
  return BULLET.test(trimmed) ? trimmed.replace(BULLET, "").trim() : null;
}
