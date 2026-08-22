/** DOM side of the terminal demo — owns the elements, knows nothing about the session logic. */

import { queryAll, requireElement } from "../dom.js";
import type { Line, ScenarioId, Span } from "./models.js";
import type { TerminalViewPort } from "./terminal-port.js";

const HINT_AUTO = "click to take control";
const HINT_LIVE = "LIVE — ↑↓ Enter · Esc backs out";
const LABEL_PAUSE = "⏸ pause";
const LABEL_PLAY = "▶ play";
const LIVE_CLASS = "is-live";
const ACTIVE_CLASS = "is-active";

const spanElement = (part: Span): HTMLElement => {
  const element = document.createElement("span");
  element.className = part.isBold ? `tone-${part.tone} is-bold` : `tone-${part.tone}`;
  element.textContent = part.text;
  return element;
};

const lineElement = (line: Line): HTMLElement => {
  const element = document.createElement("div");
  element.className = "terminal__line";
  for (const part of line) {
    if (part.text) element.append(spanElement(part));
  }
  return element;
};

export class TerminalView implements TerminalViewPort {
  readonly root: HTMLElement;
  readonly screen: HTMLElement;
  readonly autoButton: HTMLButtonElement;
  readonly playButton: HTMLButtonElement;
  readonly speedButton: HTMLButtonElement;
  private readonly lines: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly chips: HTMLElement[];

  constructor(root: HTMLElement) {
    this.root = root;
    this.screen = requireElement("[data-terminal]", root);
    this.lines = requireElement("[data-terminal-lines]", root);
    this.hint = requireElement("[data-terminal-hint]", root);
    this.autoButton = requireElement<HTMLButtonElement>("[data-terminal-auto]", root);
    this.playButton = requireElement<HTMLButtonElement>("[data-terminal-play]", root);
    this.speedButton = requireElement<HTMLButtonElement>("[data-terminal-speed]", root);
    this.chips = queryAll("[data-scenario]", root);
  }

  showLines(lines: readonly Line[]): void {
    const fragment = document.createDocumentFragment();
    for (const line of lines) fragment.append(lineElement(line));
    this.lines.replaceChildren(fragment);
  }

  setLive(isLive: boolean): void {
    this.root.classList.toggle(LIVE_CLASS, isLive);
    this.hint.textContent = isLive ? HINT_LIVE : HINT_AUTO;
    this.autoButton.hidden = !isLive;
  }

  setPlaying(isPlaying: boolean): void {
    this.playButton.textContent = isPlaying ? LABEL_PAUSE : LABEL_PLAY;
  }

  setSpeed(speed: number): void {
    this.speedButton.textContent = `${speed}×`;
  }

  /** Highlights the chip of the running scenario; `null` clears every chip (live mode). */
  setActiveScenario(scenario: ScenarioId | null): void {
    for (const chip of this.chips) {
      chip.classList.toggle(ACTIVE_CLASS, chip.dataset.scenario === scenario);
    }
  }

  focusScreen(): void {
    this.screen.focus({ preventScroll: true });
  }
}
