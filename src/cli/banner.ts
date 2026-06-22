/** ASCII title banner — faithful port of `cli/banner.py`. */

import { readFileSync } from "node:fs";

const FALLBACK = "PVZ FUZION CONSOLE MANAGER";

/**
 * Render the ASCII title banner.
 *
 * Order:
 *   1. Filesystem candidates (`TITLE_CANDIDATES`) — covers both source runs and
 *      the package-bundled `data/title.md` resource (importlib.resources in the
 *      Python original is replaced by a plain filesystem read of the bundled
 *      path, which is the last entry in `TITLE_CANDIDATES`).
 *   2. Plain text fallback.
 *
 * `write` defaults to stdout but is injectable so tests can capture output.
 */
export function renderTitle(
  candidates: readonly string[],
  write: (text: string) => void = (text) => process.stdout.write(text + "\n"),
): void {
  const lines = readFromFilesystem(candidates);
  if (lines === null) {
    write(FALLBACK);
    return;
  }
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      continue;
    }
    write(rstrip(line));
  }
}

function readFromFilesystem(candidates: readonly string[]): string[] | null {
  for (const candidate of candidates) {
    try {
      const text = readFileSync(candidate, { encoding: "utf-8" });
      return splitKeepLines(text);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Split like Python's `file.readlines()` would feed `render_title`: keep the
 * lines, drop the need for trailing newlines (each is `rstrip`-ed on print).
 */
function splitKeepLines(text: string): string[] {
  const parts = text.split(/\r\n|\r|\n/);
  // A trailing newline yields a spurious empty final element; Python's
  // `readlines()` would not produce a line there.
  if (parts.length > 0 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  return parts;
}

function rstrip(text: string): string {
  return text.replace(/\s+$/, "");
}
