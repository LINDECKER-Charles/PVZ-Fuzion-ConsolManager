/** Test doubles for the CLI seam — the Vitest equivalent of the pytest
 * monkeypatches in `test_cli_app.py` / `test_cli_interactive.py`. */

import type { ConsoleIO, MenuOption } from "../../src/cli/menus";
import type { AppDeps } from "../../src/cli/app";

/** A ConsoleIO that yields scripted answers and records every write. */
export class FakeIO implements ConsoleIO {
  readonly writes: string[] = [];
  private readonly answers: string[];
  private idx = 0;

  constructor(answers: string[] = []) {
    this.answers = answers;
  }

  question(_prompt: string): Promise<string> {
    if (this.idx >= this.answers.length) {
      return Promise.resolve("");
    }
    return Promise.resolve(this.answers[this.idx++]);
  }

  write(text: string): void {
    this.writes.push(text);
  }

  /** Joined writes, for substring assertions (mirrors `capsys.out`). */
  get output(): string {
    return this.writes.join("\n");
  }
}

/** Builds a sequencer like the pytest `_seq(*values)` helper. */
export function seq<T>(...values: T[]): () => T {
  let i = 0;
  return () => values[i++];
}

export interface FakeDepsOverrides {
  io?: ConsoleIO;
  saveSettings?: AppDeps["saveSettings"];
  renderTitle?: AppDeps["renderTitle"];
  askChoice?: AppDeps["askChoice"];
  askChoiceFromList?: AppDeps["askChoiceFromList"];
  askText?: AppDeps["askText"];
  selectLocalization?: AppDeps["selectLocalization"];
  clearConsole?: AppDeps["clearConsole"];
  pressEnterToContinue?: AppDeps["pressEnterToContinue"];
  info?: AppDeps["info"];
  success?: AppDeps["success"];
  warn?: AppDeps["warn"];
  error?: AppDeps["error"];
  section?: AppDeps["section"];
}

/**
 * Silenced-by-default deps bundle. Print-ish helpers are no-ops (mirrors the
 * `silence_ui` fixture); override any member to script behaviour. The `io`
 * still records writes done directly via `deps.io.write(...)`.
 */
export function fakeDeps(overrides: FakeDepsOverrides = {}): AppDeps {
  const io = overrides.io ?? new FakeIO();
  return {
    io,
    saveSettings: overrides.saveSettings ?? (() => null),
    renderTitle: overrides.renderTitle ?? (() => {}),
    askChoice:
      overrides.askChoice ??
      ((_t: string, _o: readonly MenuOption[], d = -1) => Promise.resolve(d)),
    askChoiceFromList:
      overrides.askChoiceFromList ??
      ((_l: string, _v: readonly string[], current: string) => Promise.resolve(current)),
    askText: overrides.askText ?? ((_l: string, d = "") => Promise.resolve(d)),
    selectLocalization:
      overrides.selectLocalization ?? (() => Promise.resolve("French")),
    clearConsole: overrides.clearConsole ?? (() => {}),
    pressEnterToContinue: overrides.pressEnterToContinue ?? (() => Promise.resolve()),
    info: overrides.info ?? (() => {}),
    success: overrides.success ?? (() => {}),
    warn: overrides.warn ?? (() => {}),
    error: overrides.error ?? (() => {}),
    section: overrides.section ?? (() => {}),
  };
}
