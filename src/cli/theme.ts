/** ANSI theming singleton — faithful port of `cli/theme.py`. */

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

const DENSITY_BLANK_LINES: Record<string, number> = {
  compact: 0,
  comfortable: 1,
  spacious: 2,
};

/**
 * Enable ANSI escape code rendering on Windows consoles.
 *
 * The Python implementation called `kernel32.SetConsoleMode` via ctypes to flip
 * on virtual-terminal processing for pre-Win10 shells. Node 20 already enables
 * VT processing on supported Windows builds, so this is a safe no-op there.
 * We keep the function for parity and as a future extension point.
 */
export function enableAnsiOnWindows(): void {
  if (process.platform !== "win32") {
    return;
  }
  // Node >= 20 enables VT mode automatically on Windows terminals that support
  // it; touching the handle is a best-effort, non-fatal hint.
  try {
    const stream = process.stdout as NodeJS.WriteStream & { isTTY?: boolean };
    // No public stable API to set the console mode; rely on Node's defaults.
    void stream.isTTY;
  } catch {
    // ignore — rendering ANSI is best-effort.
  }
}

export interface ThemeConfigureOptions {
  color?: string;
  accent?: string;
  density?: string;
  showEmoji?: boolean;
  showBanner?: boolean;
}

export class Theme {
  color = "default";
  accent = "cyan";
  density = "comfortable";
  showEmoji = true;
  showBanner = true;

  configure({
    color = "default",
    accent = "cyan",
    density = "comfortable",
    showEmoji = true,
    showBanner = true,
  }: ThemeConfigureOptions = {}): void {
    this.color = color in ANSI_COLORS ? color : "default";
    this.accent = accent in ANSI_COLORS ? accent : "cyan";
    this.density = density in DENSITY_BLANK_LINES ? density : "comfortable";
    this.showEmoji = Boolean(showEmoji);
    this.showBanner = Boolean(showBanner);
  }

  colorize(text: string, color: string, bold = false): string {
    const code = ANSI_COLORS[color] ?? "";
    if (!code && !bold) {
      return text;
    }
    const prefix = (bold ? BOLD : "") + code;
    return `${prefix}${text}${RESET}`;
  }

  primary(text: string, bold = false): string {
    return this.colorize(text, this.color, bold);
  }

  accented(text: string, bold = false): string {
    return this.colorize(text, this.accent, bold);
  }

  emoji(symbol: string, fallback = ""): string {
    return this.showEmoji ? symbol : fallback;
  }

  get blankLines(): number {
    return DENSITY_BLANK_LINES[this.density] ?? 1;
  }
}

/** Module-level singleton — imported by menus and app. */
export const THEME = new Theme();
