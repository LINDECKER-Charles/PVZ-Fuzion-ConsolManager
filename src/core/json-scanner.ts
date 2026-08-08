/**
 * Strict JSON scanner that reports every object's raw key list, duplicates
 * included.
 *
 * `JSON.parse` silently keeps the last value when a key is repeated, so it can
 * never report duplicates. Python solves this with `object_pairs_hook`, which
 * fires once per object with its full ordered `(key, value)` list; this scanner
 * is the equivalent seam — {@link JsonScannerOptions.onObject} fires each time
 * an object closes.
 *
 * It accepts exactly what `json.load` accepts: no trailing commas, no comments.
 * On malformed input it throws, but only after every already-closed object has
 * been reported, so callers can keep whatever was accumulated.
 */

const UNICODE_ESCAPE_LENGTH = 4;
const UNICODE_ESCAPE_HEX = /^[0-9a-fA-F]{4}$/;
const LITERALS = ["true", "false", "null"] as const;
const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);

const ESCAPE_REPLACEMENTS: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

// The JSON-number grammar uses disjoint, non-overlapping quantifier groups, so
// it cannot backtrack catastrophically — the rule is a false positive here.
// eslint-disable-next-line security/detect-unsafe-regex
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/** Fired once per JSON object, with its raw keys in source order. */
export type ObjectListener = (keys: string[]) => void;

export class JsonScanner {
  private readonly source: string;
  private readonly onObject: ObjectListener;
  private index = 0;

  constructor(source: string, onObject: ObjectListener) {
    this.source = source;
    this.onObject = onObject;
  }

  /** Scan a whole document; throws `SyntaxError` on anything `json.load` rejects. */
  parseDocument(): void {
    this.skipWhitespace();
    this.parseValue();
    this.skipWhitespace();
    if (this.index !== this.source.length) {
      throw new SyntaxError("trailing data");
    }
  }

  private parseValue(): void {
    this.skipWhitespace();
    const char = this.source[this.index];
    if (char === undefined) throw new SyntaxError("unexpected end");
    if (char === "{") return this.parseObject();
    if (char === "[") return this.parseArray();
    if (char === '"') {
      this.parseString();
      return;
    }
    if (char === "-" || (char >= "0" && char <= "9")) return this.parseNumber();
    this.parseLiteral();
  }

  private parseLiteral(): void {
    for (const literal of LITERALS) {
      if (this.source.startsWith(literal, this.index)) {
        this.index += literal.length;
        return;
      }
    }
    throw new SyntaxError(`unexpected token ${this.source[this.index]}`);
  }

  private parseObject(): void {
    this.index += 1; // consume {
    const keys: string[] = [];
    this.skipWhitespace();
    if (this.source[this.index] === "}") {
      this.index += 1;
    } else {
      this.parseMembers(keys);
    }
    this.onObject(keys);
  }

  /** Consume `"key": value` pairs until the closing brace. */
  private parseMembers(keys: string[]): void {
    for (;;) {
      this.skipWhitespace();
      if (this.source[this.index] !== '"') throw new SyntaxError("expected key string");
      keys.push(this.parseString());
      this.skipWhitespace();
      if (this.source[this.index] !== ":") throw new SyntaxError("expected colon");
      this.index += 1;
      this.parseValue();
      this.skipWhitespace();
      if (this.consumeSeparator("}")) return;
    }
  }

  private parseArray(): void {
    this.index += 1; // consume [
    this.skipWhitespace();
    if (this.source[this.index] === "]") {
      this.index += 1;
      return;
    }
    for (;;) {
      this.parseValue();
      this.skipWhitespace();
      if (this.consumeSeparator("]")) return;
    }
  }

  /** Consume `,` or the closing bracket; `true` means the container just closed. */
  private consumeSeparator(closing: string): boolean {
    const next = this.source[this.index];
    if (next === ",") {
      this.index += 1;
      return false;
    }
    if (next === closing) {
      this.index += 1;
      return true;
    }
    throw new SyntaxError(`expected , or ${closing}`);
  }

  /** Read a string starting at the current opening quote. */
  private parseString(): string {
    this.index += 1;
    let out = "";
    for (;;) {
      const char = this.source[this.index];
      if (char === undefined) throw new SyntaxError("unterminated string");
      if (char === '"') {
        this.index += 1;
        return out;
      }
      if (char === "\\") {
        out += this.readEscape();
        continue;
      }
      out += char;
      this.index += 1;
    }
  }

  private readEscape(): string {
    const marker = this.source[this.index + 1];
    if (marker === undefined) throw new SyntaxError("unterminated escape");
    if (marker === "u") return this.readUnicodeEscape();
    const replacement = ESCAPE_REPLACEMENTS[marker];
    if (replacement === undefined) throw new SyntaxError("bad escape");
    this.index += 2;
    return replacement;
  }

  private readUnicodeEscape(): string {
    const start = this.index + 2;
    const hex = this.source.slice(start, start + UNICODE_ESCAPE_LENGTH);
    if (!UNICODE_ESCAPE_HEX.test(hex)) throw new SyntaxError("bad \\u escape");
    this.index = start + UNICODE_ESCAPE_LENGTH;
    return String.fromCharCode(parseInt(hex, 16));
  }

  private parseNumber(): void {
    NUMBER.lastIndex = this.index;
    const match = NUMBER.exec(this.source);
    if (!match || match.index !== this.index || match[0].length === 0) {
      throw new SyntaxError("bad number");
    }
    this.index += match[0].length;
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length && WHITESPACE.has(this.source[this.index])) {
      this.index += 1;
    }
  }
}
