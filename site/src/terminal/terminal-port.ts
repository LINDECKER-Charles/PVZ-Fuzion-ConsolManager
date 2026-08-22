/**
 * The controller's contract with the outside world — no DOM types, so the
 * controller type-checks and runs without a browser (see tests/site).
 */

import type { Line, ScenarioId } from "./models.js";

/** What the controller needs from the DOM — narrow on purpose so tests can fake it. */
export interface TerminalViewPort {
  showLines(lines: readonly Line[]): void;
  setLive(isLive: boolean): void;
  setPlaying(isPlaying: boolean): void;
  setSpeed(speed: number): void;
  setActiveScenario(scenario: ScenarioId | null): void;
  focusScreen(): void;
}

/** The slice of a `KeyboardEvent` the controller reads. */
export interface KeyInput {
  readonly key: string;
  preventDefault(): void;
}

/** The slice of a click event the controller reads (`pointerType` is set on PointerEvents). */
export interface ClickInput {
  readonly pointerType?: string;
}
