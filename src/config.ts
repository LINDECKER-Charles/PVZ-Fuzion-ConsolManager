import path from "node:path";
import { fileURLToPath } from "node:url";

import { isDirectory } from "./core/fs";

export const PROJECT_DIR_NAME = "PvZ_Fusion_Translator";
export const SOURCE_LOCALE = "English";

const PACKAGE_DIR = path.dirname(fileURLToPath(import.meta.url));
/** Package root — parent of `src/` (dev) or `dist/` (built). */
export const REPO_ROOT = path.resolve(PACKAGE_DIR, "..");

/**
 * Look for `PvZ_Fusion_Translator/` in this order:
 *   1. Next to the install (`REPO_ROOT`) — source layout.
 *   2. Its immediate parent — e.g. archive in `ConsolManager/`, data one level up.
 *   3. Next to the current working directory.
 *   4. Its immediate parent.
 *
 * The search is intentionally not recursive: each candidate is checked once.
 * The first directory that exists wins; otherwise the canonical sibling path
 * is returned so error messages stay stable.
 */
function discoverProjectRoot(): string {
  const cwd = process.cwd();
  const canonical = path.resolve(REPO_ROOT, PROJECT_DIR_NAME);
  const candidates = [
    canonical,
    path.resolve(REPO_ROOT, "..", PROJECT_DIR_NAME),
    path.resolve(cwd, PROJECT_DIR_NAME),
    path.resolve(cwd, "..", PROJECT_DIR_NAME),
  ];
  for (const candidate of candidates) {
    if (isDirectory(candidate)) return candidate;
  }
  return canonical;
}

export const DATA_DIR = path.join(REPO_ROOT, "data");
export const PROJECT_ROOT = discoverProjectRoot();

// Defaults for generated artifacts — callers may override.
export const REPORTS_ROOT = "reports";
export const EXPORTS_ROOT = "exports";

export const TITLE_CANDIDATES = [
  path.join(DATA_DIR, "title.md"),
  path.join(process.cwd(), "data", "title.md"),
  path.join(PACKAGE_DIR, "data", "title.md"),
];
