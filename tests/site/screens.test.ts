import { describe, expect, it } from "vitest";

import { MAIN_MENU, RUNS } from "../../site/src/terminal/catalog";
import type { RunId } from "../../site/src/terminal/models";
import {
  mainScreen,
  menuLines,
  runDoneScreen,
  statusBoxLines,
} from "../../site/src/terminal/screens/screens";
import { VIEWPORT_LINES, lineText } from "./_lines";

describe("statusBoxLines", () => {
  it("draws a box whose every line is the same width", () => {
    const widths = statusBoxLines().map((line) => lineText(line).length);
    expect(new Set(widths).size).toBe(1);
  });
});

describe("menuLines", () => {
  it("marks the selected entry and shows its hint only there", () => {
    const lines = menuLines({ title: "Main menu", items: MAIN_MENU, selection: 1 });
    const [, first, second] = lines.map(lineText);
    expect(first).toContain("○ Show what's missing");
    expect(first).not.toContain("diff locales");
    expect(second).toContain("● Translator tools");
    expect(second).toContain("migrate");
  });

  it("renders the hint beside the title and the tail after the entries", () => {
    const lines = menuLines({
      title: "Pick",
      hint: "(filter)",
      items: MAIN_MENU,
      selection: 0,
      tail: "… more",
    });
    expect(lineText(lines[0])).toBe("◆  Pick  (filter)");
    expect(lineText(lines[lines.length - 1])).toContain("… more");
  });
});

describe("screen height", () => {
  it("main menu fits the demo viewport", () => {
    expect(mainScreen(0).length).toBeLessThanOrEqual(VIEWPORT_LINES);
  });

  it.each(Object.keys(RUNS) as RunId[])("%s completed run fits the demo viewport", (run) => {
    expect(runDoneScreen(run).length).toBeLessThanOrEqual(VIEWPORT_LINES);
  });
});
