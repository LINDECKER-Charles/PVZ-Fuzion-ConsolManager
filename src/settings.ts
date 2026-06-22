import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { REPO_ROOT, PROJECT_ROOT } from "./config";
import { DUMPS_DIRNAME, isDumpsSource } from "./parsers/loaders";

export const SETTINGS_FILENAME = "settings.json";

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
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    return path.join(home, p.slice(1));
  }
  return p;
}

export function settingsPath(): string {
  return path.join(REPO_ROOT, SETTINGS_FILENAME);
}

export function loadSettings(): AppSettings {
  const p = settingsPath();
  let raw: string;
  try {
    if (!statSync(p).isFile()) return new AppSettings();
    raw = readFileSync(p, { encoding: "utf-8" });
  } catch {
    return new AppSettings();
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return new AppSettings();
  }
  if (typeof data !== "object" || data === null) {
    return new AppSettings();
  }
  const filtered: Partial<SettingsFile> = {};
  for (const key of FILE_KEYS) {
    if (key in data) {
      (filtered as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key];
    }
  }
  return AppSettings.fromFile(filtered);
}

export function saveSettings(settings: AppSettings): void {
  const p = settingsPath();
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(settings.toFile(), null, 2), { encoding: "utf-8" });
}
