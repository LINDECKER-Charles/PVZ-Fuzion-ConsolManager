/** Wires the page's buttons, chips and tool cards to the terminal controller. */

import { queryAll, requireElement } from "../dom.js";
import { SCENARIO_IDS, type ScenarioId } from "./models.js";
import { TerminalController, type TerminalControllerOptions } from "./terminal-controller.js";
import { TerminalView } from "./terminal-view.js";

const isScenarioId = (value: string | undefined): value is ScenarioId =>
  value !== undefined && (SCENARIO_IDS as readonly string[]).includes(value);

const bindScenarioTriggers = (controller: TerminalController): void => {
  for (const trigger of queryAll("[data-scenario]")) {
    const { scenario } = trigger.dataset;
    if (!isScenarioId(scenario)) continue;
    // Tool cards are anchors to #demo: the scroll is left to the browser.
    trigger.addEventListener("click", () => controller.selectScenario(scenario));
  }
};

export const initTerminal = (options: TerminalControllerOptions): TerminalController => {
  const view = new TerminalView(requireElement("[data-terminal-root]"));
  const controller = new TerminalController(view, options);
  bindScenarioTriggers(controller);
  view.autoButton.addEventListener("click", () => controller.resumeAuto());
  view.playButton.addEventListener("click", () => controller.togglePlay());
  view.speedButton.addEventListener("click", () => controller.cycleSpeed());
  view.screen.addEventListener("click", (event) => controller.onScreenClick(event));
  view.screen.addEventListener("keydown", (event) => controller.onScreenKey(event));
  controller.start();
  return controller;
};
