import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Autoplay } from "../../site/src/terminal/autoplay";
import type { Frame } from "../../site/src/terminal/models";
import { span } from "../../site/src/terminal/screens/spans";

const frame = (label: string, holdMs: number): Frame => ({
  lines: [[span.text(label)]],
  holdMs,
});

const SCRIPT = [frame("a", 100), frame("b", 200), frame("c", 300)];

const recorder = () => {
  const shown: string[] = [];
  const autoplay = new Autoplay((current) => shown.push(current.lines[0]?.[0]?.text ?? ""));
  return { shown, autoplay };
};

describe("Autoplay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows the first frame on load, even while paused", () => {
    const { shown, autoplay } = recorder();
    autoplay.load(SCRIPT);
    expect(shown).toEqual(["a"]);
    vi.advanceTimersByTime(1000);
    expect(shown).toEqual(["a"]);
  });

  it("advances after each frame's hold and loops back to the start", () => {
    const { shown, autoplay } = recorder();
    autoplay.load(SCRIPT);
    autoplay.play();
    vi.advanceTimersByTime(100);
    expect(shown.at(-1)).toBe("b");
    vi.advanceTimersByTime(200);
    expect(shown.at(-1)).toBe("c");
    vi.advanceTimersByTime(300);
    expect(shown.at(-1)).toBe("a");
  });

  it("freezes on the current frame when paused and continues from it on play", () => {
    const { shown, autoplay } = recorder();
    autoplay.load(SCRIPT);
    autoplay.play();
    vi.advanceTimersByTime(100);
    autoplay.pause();
    vi.advanceTimersByTime(5000);
    expect(shown.at(-1)).toBe("b");
    autoplay.play();
    vi.advanceTimersByTime(200);
    expect(shown.at(-1)).toBe("c");
  });

  it("divides the hold by the playback speed", () => {
    const { shown, autoplay } = recorder();
    autoplay.load(SCRIPT);
    autoplay.setSpeed(2);
    autoplay.play();
    vi.advanceTimersByTime(50);
    expect(shown.at(-1)).toBe("b");
  });

  it("rewinds to the first frame when a new script is loaded mid-play", () => {
    const { shown, autoplay } = recorder();
    autoplay.load(SCRIPT);
    autoplay.play();
    vi.advanceTimersByTime(100);
    autoplay.load([frame("x", 100), frame("y", 100)]);
    expect(shown.at(-1)).toBe("x");
    vi.advanceTimersByTime(100);
    expect(shown.at(-1)).toBe("y");
  });
});
