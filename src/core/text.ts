/** String primitives shared across layers — all pure, no IO. */

const BYTE_ORDER_MARK = 0xfeff;

/** Drop the UTF-8-SIG byte order mark `JSON.parse` would choke on. */
export function stripByteOrderMark(text: string): string {
  return text.charCodeAt(0) === BYTE_ORDER_MARK ? text.slice(1) : text;
}

/** Strip trailing whitespace, ASCII and Unicode alike (Python `str.rstrip()`). */
export function stripTrailingWhitespace(text: string): string {
  return text.replace(/\s+$/u, "");
}

/** Human-readable message for anything that lands in a `catch`. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
