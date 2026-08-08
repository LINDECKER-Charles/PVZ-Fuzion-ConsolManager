/** Filesystem probes shared by the configuration and settings layers. */

import { statSync } from "node:fs";

/**
 * Whether `target` exists and is a directory.
 *
 * Any error — missing path, permission denied, broken symlink — answers `false`:
 * callers only ever ask so they can fall back to another candidate.
 */
export function isDirectory(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/** Whether `target` exists and is a regular file. Same error policy as {@link isDirectory}. */
export function isFile(target: string): boolean {
  try {
    return statSync(target).isFile();
  } catch {
    return false;
  }
}
