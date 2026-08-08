/** Integration tests for the terminal output primitives.
 *
 * Clack is driven for real here — the helpers are bound to in-memory streams —
 * so what is asserted is that our wrappers put the caller's text on the stream
 * the caller chose.
 */

import { describe, expect, it, vi } from "vitest";

import {
  clearConsole,
  defaultIO,
  error,
  farewell,
  header,
  info,
  panel,
  pressEnterToContinue,
  section,
  success,
  warn,
} from "../../src/cli/output";
import { scriptedIO, stripAnsi } from "./_scripted-io";

describe("presentation helpers", () => {
  it("render into the bound output stream", () => {
    const io = scriptedIO();
    header("Documentation", "Author the contributor docs.", io);
    section("Cards per Trello list", io);
    panel(["Period   01/04/26", "PR       #123"], "Recap", io);
    info("informational", io);
    warn("careful", io);
    success("done", io);
    error("broken", io);
    farewell("Goodbye!", io);

    const text = stripAnsi(io.text);
    expect(text).toContain("DOCUMENTATION");
    expect(text).toContain("Author the contributor docs.");
    expect(text).toContain("CARDS PER TRELLO LIST");
    expect(text).toContain("Recap");
    expect(text).toContain("PR       #123");
    expect(text).toContain("informational");
    expect(text).toContain("careful");
    expect(text).toContain("done");
    expect(text).toContain("broken");
    expect(text).toContain("Goodbye!");
  });

  it("panel renders without a title", () => {
    const io = scriptedIO();
    panel(["untitled line"], undefined, io);
    expect(stripAnsi(io.text)).toContain("untitled line");
  });

  it("pressEnterToContinue waits on the IO question", async () => {
    const asked: string[] = [];
    await pressEnterToContinue({
      question: (prompt: string) => {
        asked.push(prompt);
        return Promise.resolve("");
      },
      write: () => {},
    });
    expect(stripAnsi(asked.join())).toContain("Press Enter to continue");
  });

  it("defaultIO.write goes through clack's gutter on stdout", () => {
    const written: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    try {
      defaultIO.write("a table row");
    } finally {
      spy.mockRestore();
    }
    expect(stripAnsi(written.join())).toContain("a table row");
  });

  it("clearConsole is a no-op when stdout is not a TTY", () => {
    const written: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    const isTTY = process.stdout.isTTY;
    try {
      Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
      clearConsole();
      expect(written).toEqual([]);

      Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
      clearConsole();
      expect(written.join()).toContain("[2J");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: isTTY, configurable: true });
      spy.mockRestore();
    }
  });
});
