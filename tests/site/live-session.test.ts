import { describe, expect, it } from "vitest";

import { RUNS } from "../../site/src/terminal/catalog";
import {
  advanceLiveRun,
  initialLiveState,
  isLiveKey,
  reduceLiveKey,
} from "../../site/src/terminal/live-session";
import type { LiveKey, LiveState } from "../../site/src/terminal/models";

const press = (state: LiveState, ...keys: LiveKey[]): LiveState =>
  keys.reduce((current, key) => reduceLiveKey(current, key).state, state);

describe("isLiveKey", () => {
  it("accepts only the four navigation keys", () => {
    expect(["ArrowUp", "ArrowDown", "Enter", "Escape"].every(isLiveKey)).toBe(true);
    expect(["a", "Tab", " ", "ArrowLeft"].some(isLiveKey)).toBe(false);
  });
});

describe("reduceLiveKey — menus", () => {
  it("wraps the selection in both directions", () => {
    const top = initialLiveState();
    expect(press(top, "ArrowUp").selection).toBe(4);
    expect(press(top, "ArrowUp", "ArrowDown").selection).toBe(0);
    expect(press(top, "ArrowDown", "ArrowDown").selection).toBe(2);
  });

  it("walks missing → locale → category → diff run", () => {
    const category = press(initialLiveState(), "Enter", "Enter");
    expect(category.screen).toBe("category");
    const transition = reduceLiveKey(category, "Enter");
    expect(transition.effect).toBe("start-run");
    expect(transition.state).toMatchObject({ screen: "run", run: "diff", shownRows: 0 });
  });

  it("Escape backs out one level at a time, and never leaves the main menu", () => {
    const category = press(initialLiveState(), "Enter", "Enter");
    expect(press(category, "Escape").screen).toBe("locale");
    expect(press(category, "Escape", "Escape").screen).toBe("main");
    expect(press(category, "Escape", "Escape", "Escape").screen).toBe("main");
  });

  it("returns to the tools menu when the locale picker was opened from it", () => {
    const locale = press(initialLiveState(), "ArrowDown", "Enter", "ArrowDown", "Enter");
    expect(locale).toMatchObject({ screen: "locale", run: "custom", origin: "tools" });
    expect(press(locale, "Escape").screen).toBe("tools");
  });

  it("starts a tool run straight from the locale picker", () => {
    const tools = press(initialLiveState(), "ArrowDown", "Enter");
    const locale = press(tools, "ArrowDown", "ArrowDown", "Enter");
    const transition = reduceLiveKey(locale, "Enter");
    expect(transition.effect).toBe("start-run");
    expect(transition.state.run).toBe("trello");
  });

  it("treats the last tools entry as Back", () => {
    const tools = press(initialLiveState(), "ArrowDown", "Enter");
    expect(press(tools, "ArrowUp", "Enter").screen).toBe("main");
  });

  it("opens settings and leaves it on Enter or Escape", () => {
    const settings = press(initialLiveState(), "ArrowUp", "ArrowUp", "Enter");
    expect(settings.screen).toBe("settings");
    expect(press(settings, "ArrowDown").screen).toBe("settings");
    expect(press(settings, "Enter").screen).toBe("main");
    expect(press(settings, "Escape").screen).toBe("main");
  });

  it("says goodbye on Exit and asks the controller to resume autoplay", () => {
    const transition = reduceLiveKey(press(initialLiveState(), "ArrowUp"), "Enter");
    expect(transition.state.screen).toBe("bye");
    expect(transition.effect).toBe("hold-then-auto");
    expect(reduceLiveKey(transition.state, "Enter").state.screen).toBe("bye");
  });
});

describe("reduceLiveKey — running tools", () => {
  const running = reduceLiveKey(press(initialLiveState(), "Enter", "Enter"), "Enter").state;

  it("ignores everything but Escape while a tool runs", () => {
    expect(reduceLiveKey(running, "Enter").state).toEqual(running);
    expect(reduceLiveKey(running, "ArrowDown").state).toEqual(running);
  });

  it("cancels on Escape and schedules the return to the main menu", () => {
    const transition = reduceLiveKey(running, "Escape");
    expect(transition.state.screen).toBe("cancelled");
    expect(transition.effect).toBe("hold-then-main");
  });

  it("reveals one row per tick, then finishes", () => {
    const rowCount = RUNS.diff.rows.length;
    let state = running;
    for (let tick = 1; tick <= rowCount; tick += 1) {
      state = advanceLiveRun(state);
      expect(state).toMatchObject({ screen: "run", shownRows: tick });
    }
    expect(advanceLiveRun(state).screen).toBe("done");
  });

  it("goes back to the main menu once the run is acknowledged", () => {
    const done: LiveState = { ...running, screen: "done" };
    expect(press(done, "Enter")).toMatchObject({ screen: "main", selection: 0 });
    expect(press(done, "Escape").screen).toBe("main");
  });
});
