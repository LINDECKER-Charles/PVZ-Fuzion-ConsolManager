/** Test doubles for the CLI seam — the Vitest equivalent of the pytest
 * monkeypatches in `test_cli_app.py` / `test_cli_interactive.py`. */

import { MENU_CANCELLED } from "../../src/cli/menus";
import type { MenuOption } from "../../src/cli/menus";
import type { ConsoleIO } from "../../src/cli/output";
import type { AppDeps } from "../../src/cli/deps";

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

export type FakeDepsOverrides = Partial<AppDeps>;

/**
 * Silenced-by-default deps bundle. Print-ish helpers are no-ops (mirrors the
 * `silence_ui` fixture); override any member to script behaviour. The `io`
 * still records writes done directly via `deps.io.write(...)`.
 *
 * `askChoice` defaults to {@link MENU_CANCELLED}, i.e. "escape this screen" —
 * an unscripted menu leaves rather than picking an arbitrary entry.
 */
export function fakeDeps(overrides: FakeDepsOverrides = {}): AppDeps {
  const io = overrides.io ?? new FakeIO();
  return {
    io,
    saveSettings: () => null,
    renderTitle: () => {},
    header: () => {},
    panel: () => {},
    farewell: () => {},
    askChoice: (_t: string, _o: readonly MenuOption[], initial?: number) =>
      Promise.resolve(initial ?? MENU_CANCELLED),
    askChoiceFromList: (_l: string, _v: readonly string[], current: string) =>
      Promise.resolve(current),
    askText: (_l: string, d = "") => Promise.resolve(d),
    askConfirm: (_l: string, d = false) => Promise.resolve(d),
    selectLocalization: () => Promise.resolve("French"),
    clearConsole: () => {},
    pressEnterToContinue: () => Promise.resolve(),
    info: () => {},
    success: () => {},
    warn: () => {},
    error: () => {},
    section: () => {},
    ...overrides,
  };
}
