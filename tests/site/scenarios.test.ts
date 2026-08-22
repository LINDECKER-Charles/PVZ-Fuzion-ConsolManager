import { describe, expect, it } from "vitest";

import { RUNS } from "../../site/src/terminal/catalog";
import { SCENARIO_IDS, type Frame } from "../../site/src/terminal/models";
import { INSTALL_COMMAND, buildScenario } from "../../site/src/terminal/scenarios";
import { runDoneScreen } from "../../site/src/terminal/screens/screens";
import { lineText, screenText } from "./_lines";

const firstLine = (frame: Frame | undefined): string => lineText(frame?.lines[0]);
const lastFrame = (frames: Frame[]): Frame | undefined => frames[frames.length - 1];

describe("buildScenario", () => {
  it.each(SCENARIO_IDS)("%s ends on the completed run screen", (scenario) => {
    expect(lastFrame(buildScenario(scenario))?.lines).toEqual(runDoneScreen(scenario));
  });

  it.each(SCENARIO_IDS)("%s only holds frames for a positive duration", (scenario) => {
    expect(buildScenario(scenario).every((frame) => frame.holdMs > 0)).toBe(true);
  });

  it("types the install command before opening the console", () => {
    const frames = buildScenario("diff");
    const typed = frames.findIndex((frame) => firstLine(frame).endsWith(INSTALL_COMMAND));
    expect(typed).toBeGreaterThan(0);
    expect(firstLine(frames[typed + 1])).toContain("PVZF CONSOLE");
  });

  it("walks the tools menu down to the tool it is about to run", () => {
    const frames = buildScenario("trello").map((frame) => screenText(frame.lines));
    const selectedTrello = frames.findIndex((text) => text.includes("● [3] Export Trello CSV"));
    expect(selectedTrello).toBeGreaterThan(0);
    expect(frames[selectedTrello - 1]).toContain("● [2] Migrate custom levels");
  });

  it("prints every row of the tool before the summary", () => {
    const frames = buildScenario("trello");
    const rowCount = RUNS.trello.rows.length;
    const progress = frames.slice(-rowCount - 1, -1);
    progress.forEach((frame, index) => {
      const text = screenText(frame.lines);
      expect(text).toContain(RUNS.trello.rows[index]?.name);
      expect(text).not.toContain(RUNS.trello.summaryTitle);
    });
  });
});
