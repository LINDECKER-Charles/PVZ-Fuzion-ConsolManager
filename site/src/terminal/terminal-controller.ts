/**
 * Terminal demo controller — autoplay by default, hands the keyboard to the
 * visitor on click, and returns to autoplay when they leave.
 */

import { Autoplay } from "./autoplay.js";
import { liveLines } from "./screens/live-screens.js";
import {
  advanceLiveRun,
  initialLiveState,
  isLiveKey,
  reduceLiveKey,
  returnToMain,
} from "./live-session.js";
import type { LiveEffect, LiveState, ScenarioId } from "./models.js";
import { buildScenario } from "./scenarios.js";
import type { ClickInput, KeyInput, TerminalViewPort } from "./terminal-port.js";

const SPEEDS: readonly number[] = [1, 1.5, 2, 0.5];
const RUN_TICK_MS = 300;
const MIN_RUN_TICK_MS = 80;
const CANCELLED_HOLD_MS = 1400;
const BYE_HOLD_MS = 1700;
const DEFAULT_SCENARIO: ScenarioId = "diff";
/** Touch has no arrow keys: a tap must not trap the visitor in live mode. */
const TOUCH_POINTER = "touch";

export interface TerminalControllerOptions {
  /** Start the demo paused on its first frame (e.g. when the OS asks for reduced motion). */
  readonly shouldAutoplay: boolean;
}

export class TerminalController {
  private scenario: ScenarioId = DEFAULT_SCENARIO;
  private live: LiveState | null = null;
  private shouldAutoplay: boolean;
  private speedIndex = 0;
  private runTimer: ReturnType<typeof setInterval> | undefined;
  private holdTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly autoplay: Autoplay;

  constructor(
    private readonly view: TerminalViewPort,
    options: TerminalControllerOptions = { shouldAutoplay: true },
  ) {
    this.shouldAutoplay = options.shouldAutoplay;
    this.autoplay = new Autoplay((frame) => view.showLines(frame.lines));
  }

  start(): void {
    this.view.setSpeed(this.speed);
    this.selectScenario(this.scenario);
  }

  private get speed(): number {
    return SPEEDS[this.speedIndex] ?? 1;
  }

  selectScenario(scenario: ScenarioId): void {
    this.clearTimers();
    this.live = null;
    this.scenario = scenario;
    this.autoplay.load(buildScenario(scenario));
    if (this.shouldAutoplay) this.autoplay.play();
    this.syncView();
  }

  enterLive(): void {
    if (this.live) return;
    this.autoplay.pause();
    this.live = initialLiveState();
    this.view.showLines(liveLines(this.live));
    this.syncView();
    this.view.focusScreen();
  }

  resumeAuto(): void {
    this.selectScenario(this.scenario);
    this.view.focusScreen();
  }

  /** Flips the autoplay intent; while live it only takes effect once autoplay resumes. */
  togglePlay(): void {
    this.shouldAutoplay = !this.shouldAutoplay;
    if (!this.live) {
      if (this.shouldAutoplay) this.autoplay.play();
      else this.autoplay.pause();
    }
    this.syncView();
  }

  cycleSpeed(): void {
    this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
    this.autoplay.setSpeed(this.speed);
    this.view.setSpeed(this.speed);
  }

  onScreenClick(event: ClickInput): void {
    if (this.live) {
      this.view.focusScreen();
      return;
    }
    if (event.pointerType !== TOUCH_POINTER) this.enterLive();
  }

  onScreenKey(event: KeyInput): void {
    if (!isLiveKey(event.key)) return;
    event.preventDefault();
    if (!this.live) {
      this.enterLive();
      return;
    }
    const transition = reduceLiveKey(this.live, event.key);
    this.live = transition.state;
    this.view.showLines(liveLines(this.live));
    this.runEffect(transition.effect);
  }

  private runEffect(effect: LiveEffect): void {
    if (effect === "start-run") this.startRunTicker();
    else if (effect === "hold-then-main") {
      clearInterval(this.runTimer);
      this.holdThen(CANCELLED_HOLD_MS, () => this.backToMain());
    } else if (effect === "hold-then-auto") {
      this.holdThen(BYE_HOLD_MS, () => this.resumeAuto());
    }
  }

  private startRunTicker(): void {
    clearInterval(this.runTimer);
    const tickMs = Math.max(MIN_RUN_TICK_MS, RUN_TICK_MS / this.speed);
    this.runTimer = setInterval(() => this.tickRun(), tickMs);
  }

  private tickRun(): void {
    if (!this.live || this.live.screen !== "run") {
      clearInterval(this.runTimer);
      return;
    }
    this.live = advanceLiveRun(this.live);
    if (this.live.screen !== "run") clearInterval(this.runTimer);
    this.view.showLines(liveLines(this.live));
  }

  private holdThen(delayMs: number, action: () => void): void {
    clearTimeout(this.holdTimer);
    this.holdTimer = setTimeout(action, delayMs);
  }

  private backToMain(): void {
    if (!this.live) return;
    this.live = returnToMain(this.live);
    this.view.showLines(liveLines(this.live));
  }

  private clearTimers(): void {
    clearInterval(this.runTimer);
    clearTimeout(this.holdTimer);
  }

  private syncView(): void {
    const isLive = this.live !== null;
    this.view.setLive(isLive);
    this.view.setPlaying(this.shouldAutoplay);
    this.view.setActiveScenario(isLive ? null : this.scenario);
  }
}
