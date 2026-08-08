/** Where `settings.json` lives, and how it is read and written. */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "./config";
import { isFile } from "./core/fs";
import { describeError } from "./core/text";
import { AppSettings, expandUser, homeDir } from "./settings";

export const SETTINGS_FILENAME = "settings.json";
/** Absolute path override — pins the settings file (CI, portable installs). */
export const SETTINGS_ENV_VAR = "PVZF_CONSOLE_SETTINGS";
/** Folder created inside the per-user config directory. */
const CONFIG_DIR_NAME = "pvzf-console";
const JSON_INDENT = 2;

/** On-disk representation — snake_case keys, kept for backward compatibility. */
interface SettingsFile {
  project_root: string | null;
  source_locale: string;
  color: string;
  accent_color: string;
  density: string;
  show_emoji: boolean;
  show_banner: boolean;
  trello_label: string;
  docs_lead_name: string;
  docs_lead_aliases: string[];
  docs_output: string;
}

const FILE_KEYS: ReadonlyArray<keyof SettingsFile> = [
  "project_root",
  "source_locale",
  "color",
  "accent_color",
  "density",
  "show_emoji",
  "show_banner",
  "trello_label",
  "docs_lead_name",
  "docs_lead_aliases",
  "docs_output",
];

function toSettingsFile(settings: AppSettings): SettingsFile {
  return {
    project_root: settings.projectRoot,
    source_locale: settings.sourceLocale,
    color: settings.color,
    accent_color: settings.accentColor,
    density: settings.density,
    show_emoji: settings.showEmoji,
    show_banner: settings.showBanner,
    trello_label: settings.trelloLabel,
    docs_lead_name: settings.docsLeadName,
    docs_lead_aliases: settings.docsLeadAliases,
    docs_output: settings.docsOutput,
  };
}

/** A hand-edited file can hold anything; keep only usable alias strings. */
function readAliases(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  return raw.filter((alias): alias is string => typeof alias === "string" && alias.trim() !== "");
}

function fromSettingsFile(data: Partial<SettingsFile>): AppSettings {
  return new AppSettings({
    projectRoot: data.project_root ?? null,
    sourceLocale: data.source_locale,
    color: data.color,
    accentColor: data.accent_color,
    density: data.density,
    showEmoji: data.show_emoji,
    showBanner: data.show_banner,
    trelloLabel: data.trello_label,
    docsLeadName: data.docs_lead_name,
    docsLeadAliases: readAliases(data.docs_lead_aliases),
    docsOutput: data.docs_output,
  });
}

/**
 * Per-user config directory, following each platform's convention:
 *   - Windows: `%APPDATA%\pvzf-console` (then `%LOCALAPPDATA%`, then
 *     `~\AppData\Roaming\pvzf-console`)
 *   - macOS:   `~/Library/Application Support/pvzf-console`
 *   - other:   `$XDG_CONFIG_HOME/pvzf-console`, else `~/.config/pvzf-console`
 *
 * `$XDG_CONFIG_HOME` wins on every POSIX platform (macOS included) when set to
 * an absolute path — the spec says relative values must be ignored.
 * Returns `null` when no home can be resolved (bare containers), so callers
 * fall back to {@link legacySettingsPath}.
 */
export function userConfigDir(): string | null {
  if (process.platform === "win32") {
    return windowsConfigDir();
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && path.isAbsolute(xdg)) return path.join(xdg, CONFIG_DIR_NAME);
  const home = homeDir();
  if (!home) return null;
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", CONFIG_DIR_NAME);
  }
  return path.join(home, ".config", CONFIG_DIR_NAME);
}

function windowsConfigDir(): string | null {
  const base = process.env.APPDATA ?? process.env.LOCALAPPDATA;
  if (base) return path.join(base, CONFIG_DIR_NAME);
  const home = homeDir();
  return home ? path.join(home, "AppData", "Roaming", CONFIG_DIR_NAME) : null;
}

/**
 * Where versions up to 1.4.1 kept the file: inside the package itself.
 *
 * Still read (see {@link loadSettings}) and never deleted, so an older copy of
 * the tool installed alongside keeps working. Not written to anymore: a global
 * install can live in a root-owned prefix (`/usr/local/lib/node_modules`,
 * `C:\Program Files\nodejs`) where a normal user cannot write.
 */
export function legacySettingsPath(): string {
  return path.join(REPO_ROOT, SETTINGS_FILENAME);
}

/**
 * The file settings are written to. Precedence:
 *   1. `$PVZF_CONSOLE_SETTINGS`
 *   2. the per-user config directory
 *   3. the legacy in-package path, when no home directory exists
 */
export function settingsPath(): string {
  const override = process.env[SETTINGS_ENV_VAR];
  if (override) return path.resolve(expandUser(override));
  const dir = userConfigDir();
  return dir === null ? legacySettingsPath() : path.join(dir, SETTINGS_FILENAME);
}

/** Read one settings file. `null` = absent or unusable; unknown keys dropped. */
function readSettingsFile(target: string): Partial<SettingsFile> | null {
  if (!isFile(target)) return null;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(target, { encoding: "utf-8" }));
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const known = data as Record<string, unknown>;
  const filtered: Record<string, unknown> = {};
  for (const key of FILE_KEYS) {
    if (key in known) filtered[key] = known[key];
  }
  return filtered as Partial<SettingsFile>;
}

/**
 * Load from {@link settingsPath}, falling back to {@link legacySettingsPath}.
 *
 * The fallback is what makes upgrades seamless: a 1.4.1 install already has its
 * `settings.json` in the package, so it is picked up on the first run and
 * rewritten to the per-user location on the next save. Once the new file
 * exists it wins, and the legacy one is left alone.
 */
export function loadSettings(): AppSettings {
  const primary = settingsPath();
  const legacy = legacySettingsPath();
  const data =
    readSettingsFile(primary) ?? (primary === legacy ? null : readSettingsFile(legacy));
  return data === null ? new AppSettings() : fromSettingsFile(data);
}

/**
 * Persist settings. Returns `null` on success, or a human-readable reason —
 * a read-only config directory must not take the whole CLI down.
 */
export function saveSettings(settings: AppSettings): string | null {
  const target = settingsPath();
  try {
    mkdirSync(path.dirname(target), { recursive: true });
    const body = JSON.stringify(toSettingsFile(settings), null, JSON_INDENT);
    writeFileSync(target, body, { encoding: "utf-8" });
    return null;
  } catch (error) {
    return `${target}: ${describeError(error)}`;
  }
}
