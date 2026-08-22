/** Terminal demo models — pure data shapes shared by the screens, scenarios and renderer. */

/** Colour role of a span; the CSS `tone-*` classes map each one to a palette token. */
export const TONES = ["muted", "text", "bright", "cyan", "green", "lime"] as const;
export type Tone = (typeof TONES)[number];

export interface Span {
  readonly tone: Tone;
  readonly text: string;
  readonly isBold?: boolean;
}

export type Line = readonly Span[];

/** One autoplay step: the lines to show and how long to hold them at 1× speed. */
export interface Frame {
  readonly lines: readonly Line[];
  readonly holdMs: number;
}

/** The four scripted sessions selectable from the chips and the tool cards. */
export const SCENARIO_IDS = ["diff", "migrate", "trello", "pr"] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

/** Every tool the fake console can "run"; the live mode reaches all six. */
export type RunId = "diff" | "migrate" | "custom" | "trello" | "dups" | "pr";

export interface MenuItem {
  readonly label: string;
  readonly hint: string;
}

export interface RunRow {
  readonly name: string;
  readonly detail: Line;
}

export interface RunSpec {
  readonly title: string;
  readonly preamble?: Line;
  readonly rows: readonly RunRow[];
  readonly summaryTitle: string;
  readonly summaryNote: string;
}

export type LiveScreen =
  | "main"
  | "locale"
  | "category"
  | "tools"
  | "docs"
  | "settings"
  | "run"
  | "done"
  | "cancelled"
  | "bye";

/** Where the locale picker was opened from — decides where Escape returns. */
export type LiveOrigin = "main" | "tools";

export interface LiveState {
  readonly screen: LiveScreen;
  readonly selection: number;
  readonly run: RunId;
  readonly shownRows: number;
  readonly origin: LiveOrigin;
}

/** Side effect the controller must perform after a live transition. */
export type LiveEffect = "start-run" | "hold-then-main" | "hold-then-auto" | null;

export interface LiveTransition {
  readonly state: LiveState;
  readonly effect: LiveEffect;
}

/** The keys the live mode reacts to — everything else is left to the browser. */
export const LIVE_KEYS = ["ArrowUp", "ArrowDown", "Enter", "Escape"] as const;
export type LiveKey = (typeof LIVE_KEYS)[number];
