/** The interactive session: mutable state, the main menu, and its dispatch. */

import { EXPORTS_ROOT, REPORTS_ROOT, TITLE_CANDIDATES } from "../config";
import { AppSettings } from "../settings";
import { loadSettings } from "../settings-storage";
import type { AppContext } from "./context";
import { type AppDeps, realDeps } from "./deps";
import { MENU_CANCELLED, type MenuOption } from "./menus";
import { THEME } from "./theme";
import { documentation } from "./screens/documentation";
import { type MenuAction } from "./screens/menu-loop";
import { showMissing } from "./screens/missing";
import { settingsMenu } from "./screens/settings";
import { translatorTools } from "./screens/tools-menu";

const EXIT_KEY = 0;
const APP_TITLE = "PVZF Console";
const APP_SUBTITLE = "Translation toolkit for Plants vs Zombies: Fusion.";
const FIX_ROOT_HINT = "Fix it via Settings → Change PvZ_Fusion_Translator folder.";

const MAIN_MENU_OPTIONS: readonly MenuOption[] = [
  { key: "1", label: "Show what's missing", hint: "diff locales · write reports" },
  { key: "2", label: "Translator tools", hint: "migrate · trello · duplicates" },
  { key: "3", label: "Documentation", hint: "PR recap → contributor docs" },
  { key: "4", label: "Settings" },
  { key: String(EXIT_KEY), label: "Exit" },
];

/** Menu key → screen. Exported so the dispatch can be asserted in isolation. */
export const MAIN_MENU_ACTIONS: ReadonlyMap<number, MenuAction> = new Map([
  [1, showMissing],
  [2, translatorTools],
  [3, documentation],
  [4, settingsMenu],
]);

export interface AppOptions {
  settings?: AppSettings;
  deps?: AppDeps;
  /** Reports root override (tests). */
  reportsRoot?: string;
  /** Working directory the documentation tools resolve against (tests). */
  cwd?: string;
}

export class App implements AppContext {
  settings: AppSettings;
  reportsRoot: string;
  exportsRoot: string;
  cwd: string;
  readonly deps: AppDeps;

  constructor(options: AppOptions = {}) {
    this.settings = options.settings ?? loadSettings();
    this.reportsRoot = options.reportsRoot ?? REPORTS_ROOT;
    this.exportsRoot = EXPORTS_ROOT;
    this.cwd = options.cwd ?? process.cwd();
    this.deps = options.deps ?? realDeps();
  }

  projectRoot(): string {
    return this.settings.resolvedProjectRoot();
  }

  sourceLocale(): string {
    return this.settings.sourceLocale;
  }

  applyTheme(): void {
    THEME.configure({
      color: this.settings.color,
      accent: this.settings.accentColor,
      density: this.settings.density,
      showEmoji: this.settings.showEmoji,
      showBanner: this.settings.showBanner,
    });
  }

  /**
   * Write the settings file, reporting a failure as a warning.
   *
   * The in-memory change stays applied either way: an unwritable config
   * directory should cost the user persistence, not the running session.
   */
  persistSettings(): void {
    const error = this.deps.saveSettings(this.settings);
    if (error) {
      this.deps.warn(`Settings could not be saved — ${error}`);
    }
  }

  async requireValidProjectRoot(): Promise<boolean> {
    const error = this.settings.validateProjectRoot();
    if (error === null) {
      return true;
    }
    this.deps.error(error);
    this.deps.info(FIX_ROOT_HINT);
    await this.deps.pressEnterToContinue();
    return false;
  }

  mainMenu(): Promise<number> {
    return this.deps.askChoice("Main menu", MAIN_MENU_OPTIONS);
  }

  /** Startup panel: is the toolkit pointed at something usable? */
  private printStatus(): void {
    const rootError = this.settings.validateProjectRoot();
    const sourceError = rootError === null ? this.settings.validateSourceLocale() : null;
    const badge = (failed: boolean): string => (failed ? THEME.koBadge : THEME.okBadge);
    this.deps.panel(
      [
        `${badge(rootError !== null)}  project   ${this.projectRoot()}`,
        `${badge(sourceError !== null)}  source    ${this.sourceLocale()}`,
        `${THEME.okBadge}  reports   ${this.reportsRoot}/`,
      ],
      "Status",
    );
    if (rootError !== null) {
      this.deps.warn(rootError);
      this.deps.info(FIX_ROOT_HINT);
    } else if (sourceError !== null) {
      this.deps.warn(sourceError);
      this.deps.info("Fix it via Settings → Change source locale.");
    }
  }

  private openingScreen(): void {
    this.deps.clearConsole();
    if (this.settings.showBanner) {
      this.deps.renderTitle(TITLE_CANDIDATES);
    }
    this.deps.header(APP_TITLE, APP_SUBTITLE);
    this.printStatus();
  }

  async runInteractive(): Promise<void> {
    this.openingScreen();

    for (;;) {
      const choice = await this.mainMenu();
      if (choice === EXIT_KEY || choice === MENU_CANCELLED) {
        this.deps.farewell("Goodbye!");
        return;
      }
      const action = MAIN_MENU_ACTIONS.get(choice);
      if (action === undefined) {
        this.deps.error("Invalid choice.");
        await this.deps.pressEnterToContinue();
      } else {
        await action(this);
      }
      this.deps.header(APP_TITLE);
    }
  }
}
