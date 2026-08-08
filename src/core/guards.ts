/** Runtime type guards shared by the parsers, tools and settings layers. */

/** A plain JSON object — arrays and `null` excluded. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Like {@link isRecord} but also accepts arrays: some game dumps key their
 * containers as `[...]` where a locale file uses `{...}`.
 */
export function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Whether a caught value is the "file does not exist" errno. */
export function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
