import { describe, expect, it } from "vitest";

import {
  PrRecapParseError,
  extractBullet,
  extractContributor,
  extractPrNumber,
  normalizeSectionTitle,
  parseRecap,
} from "../../../src/tools/pr-resume/parser";

describe("parseRecap", () => {
  it("takes the first two non-empty lines as the header", () => {
    const doc = parseRecap(
      ["", "  2026-04-01..2026-04-07  ", "", "https://x/pull/7", "", "## Section", "* a"].join("\n"),
    );
    expect(doc.period).toBe("2026-04-01..2026-04-07");
    expect(doc.prUrl).toBe("https://x/pull/7");
    expect(doc.bodyLines).toEqual(["", "## Section", "* a"]);
  });

  it("tolerates CRLF line endings", () => {
    const doc = parseRecap("period\r\nhttps://x/pull/1\r\n\r\n## S\r\n");
    expect(doc.prUrl).toBe("https://x/pull/1");
    expect(doc.bodyLines).toContain("## S");
  });

  it("rejects a document with fewer than two non-empty lines", () => {
    expect(() => parseRecap("only-one-line")).toThrow(PrRecapParseError);
    expect(() => parseRecap("\n\n  \n")).toThrow(PrRecapParseError);
  });
});

describe("extractPrNumber", () => {
  it("reads the number out of a GitHub PR URL", () => {
    expect(extractPrNumber("https://github.com/o/r/pull/123")).toBe("123");
  });

  it("falls back to '?' when there is no PR number", () => {
    expect(extractPrNumber("https://github.com/o/r")).toBe("?");
  });
});

describe("normalizeSectionTitle", () => {
  it("strips heading markers, bold markers and extra spaces", () => {
    expect(normalizeSectionTitle("###  **Newly   Added**  Plants ")).toBe("Newly Added Plants");
  });
});

describe("extractContributor", () => {
  it.each([
    ["@LINDECKER-Charles :", "@LINDECKER-Charles"],
    ["@handle", "@handle"],
    ["[Charles LINDECKER](https://github.com/x) :", "Charles LINDECKER"],
  ])("recognizes %s", (line, expected) => {
    expect(extractContributor(line)).toBe(expected);
  });

  it.each(["", "## Section", "* an item", "not a contributor"])("rejects %s", (line) => {
    expect(extractContributor(line)).toBeNull();
  });
});

describe("extractBullet", () => {
  it("strips the bullet marker", () => {
    expect(extractBullet("* **Item** (`k: 1`)")).toBe("**Item** (`k: 1`)");
    expect(extractBullet("-   dashed")).toBe("dashed");
  });

  it("leaves bold text alone", () => {
    expect(extractBullet("**Bold**")).toBeNull();
    expect(extractBullet("plain")).toBeNull();
  });
});
