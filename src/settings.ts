import { homedir } from "node:os";
import path from "node:path";

import { PROJECT_ROOT, SOURCE_LOCALE } from "./config";
import { isDirectory } from "./core/fs";
import { DEFAULT_TRELLO_LABEL } from "./core/models";
import { DUMPS_DIRNAME, isDumpsSource } from "./parsers/loaders";
import { DEFAULT_SUMMARY_OUTPUT } from "./tools/pr-resume";
import type { LeadIdentity } from "./tools/pr-resume/service";

// ---- enumerations accepted by the settings file ----
export const COLORS = [
  "default", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "bright_red", "bright_green", "bright_yellow", "bright_blue",
  "bright_magenta", "bright_cyan", "bright_white",
] as const;
export const DENSITIES = ["compact", "comfortable", "spacious"] as const;

/** Defaults for the documentation lead — the maintainer who reviews the locale. */
export const DEFAULT_DOCS_LEAD_NAME = "Charles LINDECKER";
export const DEFAULT_DOCS_LEAD_ALIASES = ["@LINDECKER-Charles", "LINDECKER-Charles"] as const;

const LOCALIZATION_DIRNAME = "Localization";

/** Every tunable, in its in-memory form. */
interface SettingsValues {
  /** Absolute path to `PvZ_Fusion_Translator/`; `null` uses the discovered default. */
  projectRoot: string | null;
  sourceLocale: string;
  /** Primary text colour. */
  color: string;
  /** Colour for section headers and emphasis. */
  accentColor: string;
  /** `compact` | `comfortable` | `spacious`. */
  density: string;
  showEmoji: boolean;
  showBanner: boolean;
  trelloLabel: string;
  /** Canonical display name of the locale maintainer, used by the docs tools. */
  docsLeadName: string;
  /** Every other spelling of the lead found in PR recaps (handles, display names). */
  docsLeadAliases: readonly string[];
  /** Default output file for the generated contribution summary. */
  docsOutput: string;
}

export type AppSettingsInit = Partial<SettingsValues>;

const DEFAULT_SETTINGS: SettingsValues = {
  projectRoot: null,
  sourceLocale: SOURCE_LOCALE,
  color: "default",
  accentColor: "cyan",
  density: "comfortable",
  showEmoji: true,
  showBanner: true,
  trelloLabel: DEFAULT_TRELLO_LABEL,
  docsLeadName: DEFAULT_DOCS_LEAD_NAME,
  docsLeadAliases: DEFAULT_DOCS_LEAD_ALIASES,
  docsOutput: DEFAULT_SUMMARY_OUTPUT,
};

/** Overlay `init` on the defaults, ignoring keys explicitly set to `undefined`. */
function withDefaults(init: AppSettingsInit): SettingsValues {
  const values: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const [key, value] of Object.entries(init)) {
    if (value !== undefined) {
      values[key] = value;
    }
  }
  return values as unknown as SettingsValues;
}

export class AppSettings implements SettingsValues {
  projectRoot: string | null;
  sourceLocale: string;
  color: string;
  accentColor: string;
  density: string;
  showEmoji: boolean;
  showBanner: boolean;
  trelloLabel: string;
  docsLeadName: string;
  docsLeadAliases: string[];
  docsOutput: string;

  constructor(init: AppSettingsInit = {}) {
    const values = withDefaults(init);
    this.projectRoot = values.projectRoot;
    this.sourceLocale = values.sourceLocale;
    this.color = values.color;
    this.accentColor = values.accentColor;
    this.density = values.density;
    this.showEmoji = values.showEmoji;
    this.showBanner = values.showBanner;
    this.trelloLabel = values.trelloLabel;
    this.docsLeadName = values.docsLeadName;
    this.docsLeadAliases = [...values.docsLeadAliases];
    this.docsOutput = values.docsOutput;
  }

  /** The lead identity consumed by the PR-recap tool. */
  leadIdentity(): LeadIdentity {
    return { name: this.docsLeadName, aliases: this.docsLeadAliases };
  }

  resolvedProjectRoot(): string {
    return this.projectRoot ? path.resolve(expandUser(this.projectRoot)) : PROJECT_ROOT;
  }

  validateProjectRoot(): string | null {
    const root = this.resolvedProjectRoot();
    if (!isDirectory(root)) {
      return `Directory does not exist: ${root}`;
    }
    if (!isDirectory(path.join(root, LOCALIZATION_DIRNAME))) {
      return `Missing '${LOCALIZATION_DIRNAME}' subfolder in ${root}`;
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
    const root = this.resolvedProjectRoot();
    if (this.usesDumpsSource()) {
      return isDirectory(path.join(root, DUMPS_DIRNAME))
        ? null
        : `Missing '${DUMPS_DIRNAME}' subfolder in ${root}`;
    }
    if (!isDirectory(path.join(root, LOCALIZATION_DIRNAME, this.sourceLocale))) {
      return `Source locale folder not found: ${LOCALIZATION_DIRNAME}/${this.sourceLocale}`;
    }
    return null;
  }
}

/** Expand a leading `~` to the user's home, mirroring `Path.expanduser`. */
export function expandUser(target: string): string {
  if (target === "~" || target.startsWith("~/") || target.startsWith("~\\")) {
    return path.join(homeDir(), target.slice(1));
  }
  return target;
}

export function homeDir(): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? homedir();
}
