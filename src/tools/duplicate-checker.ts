import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadJson, stringsDir } from "../parsers/loaders";
import {
  ABYSS_BUFFS_FILE,
  REGEXS_FILE,
  STRINGS_FILE,
  TIPS_FS_FILE,
  TIPS_IZ_FILE,
  TRAVEL_BUFFS_FILE,
} from "../parsers/strings";

export const LAYOUT_FLAT = "flat";
export const LAYOUT_NESTED = "nested";

/** (filename, layout) pairs scanned for each locale. */
export const SCAN_TARGETS: ReadonlyArray<readonly [string, string]> = [
  [STRINGS_FILE, LAYOUT_FLAT],
  [REGEXS_FILE, LAYOUT_FLAT],
  [TIPS_IZ_FILE, LAYOUT_FLAT],
  [TIPS_FS_FILE, LAYOUT_FLAT],
  [ABYSS_BUFFS_FILE, LAYOUT_FLAT],
  [TRAVEL_BUFFS_FILE, LAYOUT_NESTED],
];

/**
 * Pure-data port of the Python `FileDuplicates` dataclass.
 *
 * The Python `@property has_any` is intentionally not ported: consumers compute
 * `duplicateKeys.length > 0 || duplicateValues.length > 0` inline.
 */
export interface FileDuplicates {
  filename: string;
  duplicateKeys: Array<[string, number]>;
  duplicateValues: Array<[string, string[]]>;
  missing: boolean;
}

/**
 * Pure-data port of the Python `LocaleDuplicates` dataclass.
 *
 * Python `@property total_*` / `has_any` are not ported: consumers aggregate
 * over `files` inline.
 */
export interface LocaleDuplicates {
  locale: string;
  files: FileDuplicates[];
}

/**
 * Surface JSON keys that are repeated in the raw text.
 *
 * `JSON.parse` (like `json.load`) silently keeps the last value when a key is
 * duplicated, so it cannot report duplicates by itself. Python routes every
 * object through `object_pairs_hook`, which fires once per JSON object with its
 * full ordered list of `(key, value)` pairs — including duplicates — and counts
 * occurrences per object scope, keeping the highest count seen for any key.
 *
 * We reproduce that semantics with a strict recursive-descent JSON scanner that
 * accepts exactly what `json.load` accepts (no trailing commas, no comments).
 * The "hook" fires each time an object closes; we count local key occurrences
 * and, for keys seen more than once, record `max(existing, localCount)`. On a
 * parse failure mid-stream we return whatever was accumulated from objects that
 * had already closed (matching the Python `except Exception: return counts`
 * branch), and a missing file yields `{}`.
 */
export function detectRawDuplicateKeys(filePath: string): Record<string, number> {
  const counts: Record<string, number> = {};

  let text: string;
  try {
    text = readFileSync(filePath, { encoding: "utf-8" });
  } catch (e) {
    if (isNotFound(e)) return {};
    return counts;
  }

  const scanner = new JsonScanner(stripBom(text), (pairKeys) => {
    const local: Record<string, number> = {};
    for (const k of pairKeys) {
      local[k] = (local[k] ?? 0) + 1;
    }
    for (const [k, c] of Object.entries(local)) {
      if (c > 1) {
        counts[k] = Math.max(counts[k] ?? 0, c);
      }
    }
  });

  try {
    scanner.parseDocument();
  } catch {
    return counts;
  }
  return counts;
}

export function detectValueDuplicates(data: Record<string, string>): Array<[string, string[]]> {
  const grouped = new Map<string, string[]>();
  // Insertion order over `data` mirrors Python dict iteration (preserved order).
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" || value.trim() === "") continue;
    const bucket = grouped.get(value);
    if (bucket) bucket.push(key);
    else grouped.set(value, [key]);
  }

  const out: Array<[string, string[]]> = [];
  for (const [value, keys] of grouped) {
    if (keys.length > 1) out.push([value, keys]);
  }
  // sorted(key=lambda pair: (-len(keys), value)) — stable on (-count, value).
  out.sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  return out;
}

export function flattenNested(data: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [category, entries] of Object.entries(data)) {
    if (!isRecord(entries)) continue;
    for (const [key, value] of Object.entries(entries)) {
      flat[`${category}:${key}`] = typeof value === "string" ? value : "";
    }
  }
  return flat;
}

export function scanFile(filePath: string, layout: string): FileDuplicates {
  const fd: FileDuplicates = {
    filename: path.basename(filePath),
    duplicateKeys: [],
    duplicateValues: [],
    missing: false,
  };

  if (!existsSync(filePath)) {
    fd.missing = true;
    return fd;
  }

  const rawDupes = detectRawDuplicateKeys(filePath);

  const data = loadJson(filePath);
  if (!isRecord(data)) {
    fd.duplicateKeys = sortRawDupes(rawDupes);
    return fd;
  }

  const flat =
    layout === LAYOUT_NESTED
      ? flattenNested(data)
      : flatStringMap(data);

  fd.duplicateKeys = sortRawDupes(rawDupes);
  fd.duplicateValues = detectValueDuplicates(flat);
  return fd;
}

export function checkLocaleDuplicates(root: string, locale: string): LocaleDuplicates {
  const result: LocaleDuplicates = { locale, files: [] };
  const base = stringsDir(root, locale);
  for (const [filename, layout] of SCAN_TARGETS) {
    result.files.push(scanFile(path.join(base, filename), layout));
  }
  return result;
}

// --- helpers ---------------------------------------------------------------

/** `{k: (v if isinstance(v, str) else "") for k, v in data.items()}`. */
function flatStringMap(data: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    flat[k] = typeof v === "string" ? v : "";
  }
  return flat;
}

/** `sorted(raw_dupes.items(), key=lambda kv: (-kv[1], kv[0]))`. */
function sortRawDupes(rawDupes: Record<string, number>): Array<[string, number]> {
  const entries = Object.entries(rawDupes) as Array<[string, number]>;
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  return entries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function isNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as NodeJS.ErrnoException).code === "ENOENT";
}

/**
 * Minimal strict JSON scanner that fires `onObject(keys)` for every object once
 * it closes, passing the ordered list of raw key strings (duplicates included).
 *
 * It validates structure tightly enough to match `json.load`'s accept/reject
 * behaviour for the inputs this tool sees; on malformed input it throws after
 * any already-closed objects have been reported via the callback.
 */
class JsonScanner {
  private readonly s: string;
  private i = 0;
  private readonly onObject: (keys: string[]) => void;

  constructor(source: string, onObject: (keys: string[]) => void) {
    this.s = source;
    this.onObject = onObject;
  }

  parseDocument(): void {
    this.skipWs();
    this.parseValue();
    this.skipWs();
    if (this.i !== this.s.length) {
      throw new SyntaxError("trailing data");
    }
  }

  private parseValue(): void {
    this.skipWs();
    const c = this.s[this.i];
    if (c === undefined) throw new SyntaxError("unexpected end");
    if (c === "{") return this.parseObject();
    if (c === "[") return this.parseArray();
    if (c === '"') {
      this.parseString();
      return;
    }
    if (c === "-" || (c >= "0" && c <= "9")) return this.parseNumber();
    if (this.s.startsWith("true", this.i)) {
      this.i += 4;
      return;
    }
    if (this.s.startsWith("false", this.i)) {
      this.i += 5;
      return;
    }
    if (this.s.startsWith("null", this.i)) {
      this.i += 4;
      return;
    }
    throw new SyntaxError(`unexpected token ${c}`);
  }

  private parseObject(): void {
    this.i += 1; // consume {
    const keys: string[] = [];
    this.skipWs();
    if (this.s[this.i] === "}") {
      this.i += 1;
      this.onObject(keys);
      return;
    }
    for (;;) {
      this.skipWs();
      if (this.s[this.i] !== '"') throw new SyntaxError("expected key string");
      keys.push(this.parseString());
      this.skipWs();
      if (this.s[this.i] !== ":") throw new SyntaxError("expected colon");
      this.i += 1;
      this.parseValue();
      this.skipWs();
      const next = this.s[this.i];
      if (next === ",") {
        this.i += 1;
        continue;
      }
      if (next === "}") {
        this.i += 1;
        this.onObject(keys);
        return;
      }
      throw new SyntaxError("expected , or }");
    }
  }

  private parseArray(): void {
    this.i += 1; // consume [
    this.skipWs();
    if (this.s[this.i] === "]") {
      this.i += 1;
      return;
    }
    for (;;) {
      this.parseValue();
      this.skipWs();
      const next = this.s[this.i];
      if (next === ",") {
        this.i += 1;
        continue;
      }
      if (next === "]") {
        this.i += 1;
        return;
      }
      throw new SyntaxError("expected , or ]");
    }
  }

  private parseString(): string {
    // assumes current char is the opening quote
    this.i += 1;
    let out = "";
    for (;;) {
      const c = this.s[this.i];
      if (c === undefined) throw new SyntaxError("unterminated string");
      if (c === '"') {
        this.i += 1;
        return out;
      }
      if (c === "\\") {
        const esc = this.s[this.i + 1];
        if (esc === undefined) throw new SyntaxError("unterminated escape");
        if (esc === "u") {
          const hex = this.s.slice(this.i + 2, this.i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new SyntaxError("bad \\u escape");
          out += String.fromCharCode(parseInt(hex, 16));
          this.i += 6;
          continue;
        }
        const map: Record<string, string> = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        const rep = map[esc];
        if (rep === undefined) throw new SyntaxError("bad escape");
        out += rep;
        this.i += 2;
        continue;
      }
      out += c;
      this.i += 1;
    }
  }

  private parseNumber(): void {
    const re = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    re.lastIndex = this.i;
    const m = re.exec(this.s);
    if (!m || m.index !== this.i || m[0].length === 0) throw new SyntaxError("bad number");
    this.i += m[0].length;
  }

  private skipWs(): void {
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") this.i += 1;
      else break;
    }
  }
}
