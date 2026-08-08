/** The prompt-dispatch-repeat loop every sub-menu shares. */

import type { AppContext } from "../context";
import { MENU_CANCELLED, type MenuOption } from "../menus";

/** Menu key that leaves the current screen. */
export const BACK_KEY = 0;

export type MenuAction = (app: AppContext) => Promise<void>;

export interface MenuSpec {
  /** Prompt title. */
  title: string;
  /** Redraw the screen before each prompt. */
  render(app: AppContext): void;
  options: readonly MenuOption[];
  actions: ReadonlyMap<number, MenuAction>;
}

/**
 * Show `spec` until the user picks *Back* or escapes.
 *
 * Escaping is treated exactly like *Back*: no menu may act on a cancelled
 * prompt, and every screen must be leavable without side effects.
 */
export async function runMenuLoop(app: AppContext, spec: MenuSpec): Promise<void> {
  for (;;) {
    spec.render(app);
    const choice = await app.deps.askChoice(spec.title, spec.options);
    if (choice === BACK_KEY || choice === MENU_CANCELLED) {
      return;
    }
    const action = spec.actions.get(choice);
    if (action === undefined) {
      app.deps.error("Invalid choice.");
      await app.deps.pressEnterToContinue();
      continue;
    }
    await action(app);
  }
}

/** Wrap a synchronous screen so it can sit in a {@link MenuSpec}'s action map. */
export function syncAction(run: (app: AppContext) => void): MenuAction {
  return (app) => {
    run(app);
    return Promise.resolve();
  };
}
