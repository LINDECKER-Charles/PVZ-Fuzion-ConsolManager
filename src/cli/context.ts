/**
 * What a screen is allowed to know about the running application.
 *
 * Screens depend on this narrow contract rather than on the `App` class, so
 * they carry no knowledge of how the session is wired and can be driven from a
 * test with a hand-built object.
 */

import type { AppSettings } from "../settings";
import type { AppDeps, LocalizationChoice } from "./deps";
import type { ScanRequest } from "../tools/scan";

export interface AppContext {
  settings: AppSettings;
  /** Root folder receiving the generated reports. */
  reportsRoot: string;
  /** Root folder receiving the Trello exports. */
  exportsRoot: string;
  /** Base directory the documentation tools resolve relative paths against. */
  cwd: string;
  readonly deps: AppDeps;

  /** Absolute path to the configured `PvZ_Fusion_Translator/`. */
  projectRoot(): string;
  /** Reference locale every diff is taken against. */
  sourceLocale(): string;
  /** Push the current settings into the terminal theme. */
  applyTheme(): void;
  /** Persist the settings, warning — never failing — when the file is unwritable. */
  persistSettings(): void;
  /** Guard: reports the problem and returns `false` when the root is unusable. */
  requireValidProjectRoot(): Promise<boolean>;
}

/** Normalise the locale picker's answer to a list. */
export function asLocaleList(choice: LocalizationChoice): string[] {
  return Array.isArray(choice) ? choice : [choice];
}

/** Adapt the session state into the request the scan engine consumes. */
export function toScanRequest(app: AppContext, exportJsonDiff: boolean): ScanRequest {
  return {
    projectRoot: app.projectRoot(),
    sourceLocale: app.sourceLocale(),
    reportsRoot: app.reportsRoot,
    exportJsonDiff,
    warn: (message) => app.deps.warn(message),
  };
}
