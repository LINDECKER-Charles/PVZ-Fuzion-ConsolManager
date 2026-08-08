/** ANSI theming singleton shared by the banner, the menus and the app. */

const ANSI_COLORS: Record<string, string> = {
  default: "",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bright_red: "\x1b[91m",
  bright_green: "\x1b[92m",
  bright_yellow: "\x1b[93m",
  bright_blue: "\x1b[94m",
  bright_magenta: "\x1b[95m",
  bright_cyan: "\x1b[96m",
  bright_white: "\x1b[97m",
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const DEFAULT_COLOR = "default";
const DEFAULT_ACCENT = "cyan";
const DEFAULT_DENSITY = "comfortable";

const DENSITY_BLANK_LINES: Record<string, number> = {
  compact: 0,
  comfortable: 1,
  spacious: 2,
};

export interface ThemeConfigureOptions {
  color?: string;
  accent?: string;
  density?: string;
  showEmoji?: boolean;
  showBanner?: boolean;
}

export class Theme {
  color = DEFAULT_COLOR;
  accent = DEFAULT_ACCENT;
  density = DEFAULT_DENSITY;
  showEmoji = true;
  showBanner = true;

  configure({
    color = DEFAULT_COLOR,
    accent = DEFAULT_ACCENT,
    density = DEFAULT_DENSITY,
    showEmoji = true,
    showBanner = true,
  }: ThemeConfigureOptions = {}): void {
    this.color = color in ANSI_COLORS ? color : DEFAULT_COLOR;
    this.accent = accent in ANSI_COLORS ? accent : DEFAULT_ACCENT;
    this.density = density in DENSITY_BLANK_LINES ? density : DEFAULT_DENSITY;
    this.showEmoji = showEmoji;
    this.showBanner = showBanner;
  }

  /** Body text, in the configured primary colour. */
  primary(text: string): string {
    return colorize(text, this.color);
  }

  /** Emphasised text, in the configured accent colour. */
  accented(text: string): string {
    return colorize(text, this.accent);
  }

  /** A title: accent colour, bold. */
  heading(text: string): string {
    return colorize(text, this.accent, BOLD);
  }

  /** `symbol` when emoji are enabled, `fallback` otherwise. */
  emoji(symbol: string, fallback = ""): string {
    return this.showEmoji ? symbol : fallback;
  }

  /** Marker for a check that passed. */
  get okBadge(): string {
    return this.emoji("✅", "[OK]");
  }

  /** Marker for a check that failed. */
  get koBadge(): string {
    return this.emoji("❌", "[X]");
  }

  get blankLines(): number {
    return DENSITY_BLANK_LINES[this.density] ?? DENSITY_BLANK_LINES[DEFAULT_DENSITY];
  }
}

function colorize(text: string, color: string, weight = ""): string {
  const code = ANSI_COLORS[color] ?? "";
  if (!code && !weight) {
    return text;
  }
  return `${weight}${code}${text}${RESET}`;
}

/** Module-level singleton — imported by the banner, the menus and the app. */
export const THEME = new Theme();
