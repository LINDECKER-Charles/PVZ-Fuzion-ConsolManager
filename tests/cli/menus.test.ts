/** Integration tests for the clack-backed prompts.
 *
 * Clack is driven for real here — the prompts are bound to in-memory streams
 * and fed actual key sequences — so what is asserted is our translation layer:
 * cancellation mapping, the "all locales" sentinel, key→value parsing and the
 * defaults a prompt falls back to.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  type MenuOption,
  MENU_CANCELLED,
  askChoice,
  askChoiceFromList,
  askConfirm,
  askText,
  selectLocalization,
} from "../../src/cli/menus";
import { KEY, scriptedIO } from "./_scripted-io";

const MENU: MenuOption[] = [
  { key: "1", label: "First", hint: "the first one" },
  { key: "2", label: "Second" },
  { key: "0", label: "Back" },
];

describe("askChoice", () => {
  it("returns the numeric key of the highlighted entry", async () => {
    const io = scriptedIO();
    io.keys(KEY.enter);
    expect(await askChoice("Menu", MENU, { io })).toBe(1);
  });

  it("moves with the arrow keys", async () => {
    const io = scriptedIO();
    io.keys(KEY.down, KEY.down, KEY.enter);
    expect(await askChoice("Menu", MENU, { io })).toBe(0);
  });

  it("starts on the requested entry", async () => {
    const io = scriptedIO();
    io.keys(KEY.enter);
    expect(await askChoice("Menu", MENU, { initialValue: 2, io })).toBe(2);
  });

  it.each([
    ["escape", KEY.escape],
    ["ctrl+c", KEY.ctrlC],
  ])("maps %s to MENU_CANCELLED rather than the Back entry", async (_name, key) => {
    const io = scriptedIO();
    io.keys(key);
    expect(await askChoice("Menu", MENU, { io })).toBe(MENU_CANCELLED);
  });

  it("falls back to the row index when a key is not numeric", async () => {
    const io = scriptedIO();
    io.keys(KEY.down, KEY.enter);
    const options: MenuOption[] = [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ];
    expect(await askChoice("Menu", options, { io })).toBe(1);
  });

  it("renders the label and the hint", async () => {
    const io = scriptedIO();
    io.keys(KEY.enter);
    await askChoice("Menu", MENU, { io });
    expect(io.text).toContain("First");
    expect(io.text).toContain("the first one");
  });
});

describe("askChoiceFromList", () => {
  const colors = ["red", "green", "blue"];

  it("returns the picked value", async () => {
    const io = scriptedIO();
    io.keys(KEY.down, KEY.enter);
    expect(await askChoiceFromList("Color", colors, { current: "red", io })).toBe("green");
  });

  it("keeps the current value when cancelled", async () => {
    const io = scriptedIO();
    io.keys(KEY.escape);
    expect(await askChoiceFromList("Color", colors, { current: "green", io })).toBe("green");
  });

  it("starts on the current value and flags it", async () => {
    const io = scriptedIO();
    io.keys(KEY.enter);
    expect(await askChoiceFromList("Color", colors, { current: "blue", io })).toBe("blue");
    expect(io.text).toContain("current");
  });
});

describe("askText", () => {
  it("returns the typed value, trimmed", async () => {
    const io = scriptedIO();
    io.keys("  hello  ", KEY.enter);
    expect(await askText("Label", "fallback", io)).toBe("hello");
  });

  it("falls back to the default on an empty submission", async () => {
    const io = scriptedIO();
    io.keys(KEY.enter);
    expect(await askText("Label", "fallback", io)).toBe("fallback");
  });

  it("falls back to the default when cancelled", async () => {
    const io = scriptedIO();
    io.keys("typed", KEY.escape);
    expect(await askText("Label", "fallback", io)).toBe("fallback");
  });

  it("returns an empty string when there is no default", async () => {
    const io = scriptedIO();
    io.keys(KEY.enter);
    expect(await askText("Label", "", io)).toBe("");
  });
});

describe("askConfirm", () => {
  it("submits the initial value", async () => {
    const io = scriptedIO();
    io.keys(KEY.enter);
    expect(await askConfirm("Sure?", true, io)).toBe(true);
  });

  it("toggles with the arrow keys", async () => {
    const io = scriptedIO();
    io.keys(KEY.down, KEY.enter);
    expect(await askConfirm("Sure?", true, io)).toBe(false);
  });

  it("keeps the default when cancelled", async () => {
    const io = scriptedIO();
    io.keys(KEY.escape);
    expect(await askConfirm("Sure?", true, io)).toBe(true);
  });
});

describe("selectLocalization", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "pvzf-menus-"));
    mkdirSync(path.join(root, "Localization"), { recursive: true });
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const makeLocales = (...names: string[]): void => {
    for (const name of names) {
      mkdirSync(path.join(root, "Localization", name), { recursive: true });
    }
  };

  it("expands the 'All locales' entry into the full list", async () => {
    makeLocales("English", "French", "German");
    const io = scriptedIO();
    io.keys(KEY.enter); // the sentinel is the first row
    expect(await selectLocalization(root, {}, io)).toEqual(["English", "French", "German"]);
  });

  it("returns a single locale", async () => {
    makeLocales("English", "French");
    const io = scriptedIO();
    io.keys(KEY.down, KEY.enter);
    expect(await selectLocalization(root, {}, io)).toBe("English");
  });

  it("omits the 'All locales' entry in single mode and applies exclusions", async () => {
    makeLocales("English", "French");
    const io = scriptedIO();
    io.keys(KEY.enter);
    expect(await selectLocalization(root, { allowMulti: false, exclude: ["English"] }, io)).toBe(
      "French",
    );
    expect(io.text).not.toContain("All locales");
  });

  it("returns null when cancelled", async () => {
    makeLocales("English", "French");
    const io = scriptedIO();
    io.keys(KEY.escape);
    expect(await selectLocalization(root, {}, io)).toBeNull();
  });

  it("returns null and explains when the project has no locale", async () => {
    const io = scriptedIO();
    expect(await selectLocalization(root, {}, io)).toBeNull();
    expect(io.text).toContain("No localization folder found");
  });

  it("switches to a filterable list past the threshold", async () => {
    makeLocales(...Array.from({ length: 14 }, (_, i) => `Locale${String(i).padStart(2, "0")}`));
    const io = scriptedIO();
    io.keys("Locale07", KEY.enter);
    expect(await selectLocalization(root, { allowMulti: false }, io)).toBe("Locale07");
  });
});
