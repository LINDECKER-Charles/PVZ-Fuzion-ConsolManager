import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { REPO_ROOT, PROJECT_ROOT } from "./config";
import { DUMPS_DIRNAME, isDumpsSource } from "./parsers/loaders";

export const SETTINGS_FILENAME = "settings.json";
/** Absolute path override — pins the settings file (CI, portable installs). */
export const SETTINGS_ENV_VAR = "PVZF_CONSOLE_SETTINGS";
/** Folder created inside the per-user config directory. */
const CONFIG_DIR_NAME = "pvzf-console";

// ---- enumerations accepted by the settings file ----
export const COLORS = [
  "default", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "bright_red", "bright_green", "bright_yellow", "bright_blue",
  "bright_magenta", "bright_cyan", "bright_white",
] as const;
export const DENSITIES = ["compact", "comfortable", "spacious"] as const;

export interface AppSettingsInit {
  projectRoot?: string | null;
  sourceLocale?: string;
  color?: string;
  accentColor?: string;
  density?: string;
  showEmoji?: boolean;
  showBanner?: boolean;
  trelloLabel?: string;
}

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
}

const FILE_KEYS = [
  "project_root",
  "source_locale",
  "color",
  "accent_color",
  "density",
  "show_emoji",
  "show_banner",
  "trello_label",
] as const;

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export class AppSettings {
  projectRoot: string | null; // absolute path to PvZ_Fusion_Translator; null -> default
  sourceLocale: string;
  color: string; // primary text color
  accentColor: string; // section headers / emphasis
  density: string; // compact | comfortable | spacious
  showEmoji: boolean;
  showBanner: boolean;
  trelloLabel: string;

  constructor(init: AppSettingsInit = {}) {
    this.projectRoot = init.projectRoot ?? null;
    this.sourceLocale = init.sourceLocale ?? "English";
    this.color = init.color ?? "default";
    this.accentColor = init.accentColor ?? "cyan";
    this.density = init.density ?? "comfortable";
    this.showEmoji = init.showEmoji ?? true;
    this.showBanner = init.showBanner ?? true;
    this.trelloLabel = init.trelloLabel ?? "To be translated";
  }

  resolvedProjectRoot(): string {
    if (this.projectRoot) {
      return path.resolve(expanduser(this.projectRoot));
    }
    return PROJECT_ROOT;
  }

  validateProjectRoot(): string | null {
    const p = this.resolvedProjectRoot();
    if (!isDir(p)) {
      return `Directory does not exist: ${p}`;
    }
    if (!isDir(path.join(p, "Localization"))) {
      return `Missing 'Localization' subfolder in ${p}`;
    }
    return null;
  }

  usesDumpsSource(): boolean {
    return isDumpsSource(this.sourceLocale);
  }

  /**
   * Verify the configured source exists under the project root.
   *
   * Dumps mode requires a `Dumps/` folder; a locale source requires
   * `Localization/<locale>/`.
   */
  validateSourceLocale(): string | null {
    const p = this.resolvedProjectRoot();
    if (this.usesDumpsSource()) {
      if (!isDir(path.join(p, DUMPS_DIRNAME))) {
        return `Missing '${DUMPS_DIRNAME}' subfolder in ${p}`;
      }
      return null;
    }
    if (!isDir(path.join(p, "Localization", this.sourceLocale))) {
      return `Source locale folder not found: Localization/${this.sourceLocale}`;
    }
    return null;
  }

  toFile(): SettingsFile {
    return {
      project_root: this.projectRoot,
      source_locale: this.sourceLocale,
      color: this.color,
      accent_color: this.accentColor,
      density: this.density,
      show_emoji: this.showEmoji,
      show_banner: this.showBanner,
      trello_label: this.trelloLabel,
    };
  }

  static fromFile(data: Partial<SettingsFile>): AppSettings {
    return new AppSettings({
      projectRoot: data.project_root ?? null,
      sourceLocale: data.source_locale,
      color: data.color,
      accentColor: data.accent_color,
      density: data.density,
      showEmoji: data.show_emoji,
      showBanner: data.show_banner,
      trelloLabel: data.trello_label,
    });
  }
}

/** Expand a leading `~` to the user's home, mirroring `Path.expanduser`. */
function expanduser(p: string): string {
  if (p === "~" || p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(homeDir(), p.slice(1));
  }
  return p;
}

function homeDir(): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? homedir();
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
    const base = process.env.APPDATA ?? process.env.LOCALAPPDATA;
    if (base) return path.join(base, CONFIG_DIR_NAME);
    const home = homeDir();
    return home ? path.join(home, "AppData", "Roaming", CONFIG_DIR_NAME) : null;
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
  if (override) return path.resolve(expanduser(override));
  const dir = userConfigDir();
  return dir === null ? legacySettingsPath() : path.join(dir, SETTINGS_FILENAME);
}

/** Read one settings file. `null` = absent or unusable; unknown keys dropped. */
function readSettingsFile(p: string): Partial<SettingsFile> | null {
  let raw: string;
  try {
    if (!statSync(p).isFile()) return null;
    raw = readFileSync(p, { encoding: "utf-8" });
  } catch {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const filtered: Partial<SettingsFile> = {};
  for (const key of FILE_KEYS) {
    if (key in data) {
      (filtered as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key];
    }
  }
  return filtered;
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
  return data === null ? new AppSettings() : AppSettings.fromFile(data);
}

/**
 * Persist settings. Returns `null` on success, or a human-readable reason —
 * a read-only config directory must not take the whole CLI down.
 */
export function saveSettings(settings: AppSettings): string | null {
  const p = settingsPath();
  try {
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(settings.toFile(), null, 2), { encoding: "utf-8" });
    return null;
  } catch (e) {
    return `${p}: ${e instanceof Error ? e.message : String(e)}`;
  }
}
