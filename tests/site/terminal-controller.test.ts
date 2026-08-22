import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RUNS } from "../../site/src/terminal/catalog";
import type { Line, ScenarioId } from "../../site/src/terminal/models";
import { TerminalController } from "../../site/src/terminal/terminal-controller";
import type { TerminalViewPort } from "../../site/src/terminal/terminal-port";
import { screenText } from "./_lines";

/** Records what the controller asked the DOM to show, without any DOM. */
class FakeView implements TerminalViewPort {
  screen = "";
  isLive = false;
  isPlaying = false;
  speed = 0;
  activeScenario: ScenarioId | null = null;
  focusCount = 0;

  showLines(lines: readonly Line[]): void {
    this.screen = screenText(lines);
  }
  setLive(isLive: boolean): void {
    this.isLive = isLive;
  }
  setPlaying(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
  }
  setSpeed(speed: number): void {
    this.speed = speed;
  }
  setActiveScenario(scenario: ScenarioId | null): void {
    this.activeScenario = scenario;
  }
  focusScreen(): void {
    this.focusCount += 1;
  }
}

const RUN_TICK_MS = 300;
const CANCELLED_HOLD_MS = 1400;
const BYE_HOLD_MS = 1700;

const keyEvent = (key: string) => ({ key, preventDefault: vi.fn() });
const clickEvent = (pointerType = "mouse") => ({ pointerType });

const setup = (shouldAutoplay = true) => {
  const view = new FakeView();
  const controller = new TerminalController(view, { shouldAutoplay });
  controller.start();
  return { view, controller };
};

const press = (controller: TerminalController, ...keys: string[]): void => {
  for (const key of keys) controller.onScreenKey(keyEvent(key));
};

describe("TerminalController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts the diff scenario in autoplay", () => {
    const { view } = setup();
    expect(view.activeScenario).toBe("diff");
    expect(view.isLive).toBe(false);
    expect(view.isPlaying).toBe(true);
    expect(view.speed).toBe(1);
    expect(view.screen).toContain("pvzf-workspace");
  });

  it("stays on the first frame when autoplay is off, until play is pressed", () => {
    const { view, controller } = setup(false);
    const first = view.screen;
    vi.advanceTimersByTime(5000);
    expect(view.screen).toBe(first);
    expect(view.isPlaying).toBe(false);
    controller.togglePlay();
    vi.advanceTimersByTime(5000);
    expect(view.screen).not.toBe(first);
  });

  it("hands over the keyboard on a mouse click but not on a tap", () => {
    const { view, controller } = setup();
    controller.onScreenClick(clickEvent("touch"));
    expect(view.isLive).toBe(false);
    controller.onScreenClick(clickEvent("mouse"));
    expect(view.isLive).toBe(true);
    expect(view.activeScenario).toBeNull();
    expect(view.focusCount).toBe(1);
    expect(view.screen).toContain("● Show what's missing");
  });

  it("keeps the play label on its intent while live", () => {
    const { view, controller } = setup();
    controller.enterLive();
    expect(view.isPlaying).toBe(true);
    controller.togglePlay();
    expect(view.isPlaying).toBe(false);
    controller.resumeAuto();
    const paused = view.screen;
    vi.advanceTimersByTime(5000);
    expect(view.screen).toBe(paused);
  });

  it("runs a tool row by row, then shows the summary", () => {
    const { view, controller } = setup();
    controller.enterLive();
    press(controller, "Enter", "Enter", "Enter");
    expect(view.screen).toContain("Diffing French");
    vi.advanceTimersByTime(RUN_TICK_MS);
    expect(view.screen).toContain("✔  Plants");
    vi.advanceTimersByTime(RUN_TICK_MS * (RUNS.diff.rows.length + 1));
    expect(view.screen).toContain(RUNS.diff.summaryTitle);
  });

  it("cancels a run on Escape and returns to the main menu after a pause", () => {
    const { view, controller } = setup();
    controller.enterLive();
    press(controller, "Enter", "Enter", "Enter", "Escape");
    expect(view.screen).toContain("Cancelled");
    vi.advanceTimersByTime(CANCELLED_HOLD_MS);
    expect(view.screen).toContain("Main menu");
    expect(view.isLive).toBe(true);
  });

  it("says goodbye on Exit and hands back to autoplay", () => {
    const { view, controller } = setup();
    controller.enterLive();
    press(controller, "ArrowUp", "Enter");
    expect(view.screen).toContain("See you.");
    vi.advanceTimersByTime(BYE_HOLD_MS);
    expect(view.isLive).toBe(false);
    expect(view.activeScenario).toBe("diff");
    expect(view.screen).toContain("pvzf-workspace");
  });

  it("switches scenario and leaves live mode when a chip is picked", () => {
    const { view, controller } = setup();
    controller.enterLive();
    controller.selectScenario("pr");
    expect(view.isLive).toBe(false);
    expect(view.activeScenario).toBe("pr");
  });

  it("cycles the speed through 1, 1.5, 2 and 0.5", () => {
    const { view, controller } = setup();
    const seen = [view.speed];
    for (let step = 0; step < 4; step += 1) {
      controller.cycleSpeed();
      seen.push(view.speed);
    }
    expect(seen).toEqual([1, 1.5, 2, 0.5, 1]);
  });

  it("ignores keys the console does not use", () => {
    const { view, controller } = setup();
    const event = keyEvent("Tab");
    controller.onScreenKey(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(view.isLive).toBe(false);
  });
});
