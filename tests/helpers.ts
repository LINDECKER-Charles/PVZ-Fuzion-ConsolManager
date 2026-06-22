import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Mirrors the pytest `conftest.py` fixtures for Vitest. */

export function writeJson(filePath: string, data: unknown, encoding: BufferEncoding = "utf-8"): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding });
}

export interface TempProject {
  /** Absolute path to the `PvZ_Fusion_Translator/` root. */
  root: string;
  /** Drop fixture files into `Localization/<locale>/{Strings,Almanac}/`. */
  makeLocale(
    locale: string,
    files?: { strings?: Record<string, unknown>; almanac?: Record<string, unknown> },
  ): string;
  /** Drop a JSON file into `Dumps/`. */
  makeDump(filename: string, content: unknown): string;
  /** Remove the whole temp tree. Call in `afterEach`. */
  cleanup(): void;
}

/**
 * Create an empty `PvZ_Fusion_Translator/` tree under a fresh temp dir, with
 * `Localization/` and `Dumps/` subfolders. Equivalent to the `project_root`,
 * `make_locale` and `make_dump` pytest fixtures combined.
 */
export function createTempProject(): TempProject {
  const base = mkdtempSync(path.join(tmpdir(), "pvzf-test-"));
  const root = path.join(base, "PvZ_Fusion_Translator");
  mkdirSync(path.join(root, "Localization"), { recursive: true });
  mkdirSync(path.join(root, "Dumps"), { recursive: true });

  return {
    root,
    makeLocale(locale, files = {}) {
      const loc = path.join(root, "Localization", locale);
      mkdirSync(loc, { recursive: true });
      for (const [filename, content] of Object.entries(files.strings ?? {})) {
        writeJson(path.join(loc, "Strings", filename), content);
      }
      for (const [filename, content] of Object.entries(files.almanac ?? {})) {
        writeJson(path.join(loc, "Almanac", filename), content);
      }
      return loc;
    },
    makeDump(filename, content) {
      const p = path.join(root, "Dumps", filename);
      writeJson(p, content);
      return p;
    },
    cleanup() {
      rmSync(base, { recursive: true, force: true });
    },
  };
}
