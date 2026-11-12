/** `--version`: read from the shipped `package.json`, the single source of truth. */

import { readFileSync } from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "../../config";

const UNKNOWN_VERSION = "unknown";

export function packageVersion(): string {
  try {
    const manifest: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"),
    );
    const version = (manifest as { version?: unknown }).version;
    return typeof version === "string" ? version : UNKNOWN_VERSION;
  } catch {
    return UNKNOWN_VERSION;
  }
}
