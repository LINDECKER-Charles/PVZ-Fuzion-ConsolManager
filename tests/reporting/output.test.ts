import { describe, expect, it } from "vitest";

import { markdownCell } from "../../src/reporting/output";

describe("markdownCell", () => {
  it("renders a missing value as an empty cell", () => {
    expect(markdownCell(null)).toBe("");
  });

  it("leaves ordinary text untouched", () => {
    expect(markdownCell("Briseur de Machoir")).toBe("Briseur de Machoir");
  });

  it("escapes a pipe so it cannot open a new cell", () => {
    expect(markdownCell("a|b")).toBe(String.raw`a\|b`);
  });

  it("escapes backslashes before pipes", () => {
    // Escaping pipes first would leave `\\|`: an escaped backslash followed by
    // a live separator, splitting the row the value sits in.
    expect(markdownCell(String.raw`a\|b`)).toBe(String.raw`a\\\|b`);
    expect(markdownCell("\\")).toBe("\\\\");
  });

  it("keeps a regex translation intact", () => {
    expect(markdownCell(String.raw`^烈焰战士([^\s]+)$`)).toBe(String.raw`^烈焰战士([^\\s]+)$`);
  });

  it("folds newlines into the row and drops carriage returns", () => {
    expect(markdownCell("line1\r\nline2")).toBe("line1 ⏎ line2");
  });
});
