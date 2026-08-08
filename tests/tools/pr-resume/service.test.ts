import { describe, expect, it } from "vitest";

import { parseRecap } from "../../../src/tools/pr-resume/parser";
import {
  type LeadIdentity,
  DEFAULT_SECTION,
  buildSummaries,
  countContributions,
  normalizePersonKey,
} from "../../../src/tools/pr-resume/service";
import { formatPeriod } from "../../../src/tools/pr-resume/period";

const LEAD: LeadIdentity = {
  name: "Charles LINDECKER",
  aliases: ["@LINDECKER-Charles", "LINDECKER-Charles"],
};

function recap(...body: string[]) {
  return parseRecap(
    ["2026-04-01..2026-04-07", "https://github.com/o/r/pull/123", "", ...body].join("\n"),
  );
}

describe("normalizePersonKey", () => {
  it("folds every spelling of the same person to one key", () => {
    expect(normalizePersonKey("@LINDECKER-Charles")).toBe(normalizePersonKey("lindecker charles"));
  });
});

describe("buildSummaries", () => {
  it("buckets bullets per contributor and section", () => {
    const summaries = buildSummaries(
      recap(
        "## 🌱 Newly Added Plants",
        "",
        "@someone :",
        "* **Briseur** (`seedType: 1390`)",
        "* **Autre** (`seedType: 1391`)",
        "",
        "## 🔧 Modified Achievements",
        "",
        "@someone :",
        "* **D'où ?** (`achievement: 7`)",
      ),
      LEAD,
    );
    const someone = summaries.get("@someone")!;
    expect([...someone.sections.keys()]).toEqual([
      "🌱 Newly Added Plants",
      "🔧 Modified Achievements",
    ]);
    expect(someone.sections.get("🌱 Newly Added Plants")).toHaveLength(2);
    expect(countContributions(someone)).toEqual({
      newCount: 2,
      modifiedCount: 1,
      reviewCount: 0,
    });
  });

  it("canonicalizes every lead alias into a single block", () => {
    const summaries = buildSummaries(
      recap(
        "## New Plants",
        "@LINDECKER-Charles :",
        "* A",
        "",
        "## Modified Plants",
        "[Charles LINDECKER](https://github.com/x) :",
        "* B",
      ),
      LEAD,
    );
    expect([...summaries.keys()]).toEqual(["Charles LINDECKER"]);
    expect(countContributions(summaries.get("Charles LINDECKER")!)).toMatchObject({
      newCount: 1,
      modifiedCount: 1,
    });
  });

  it("credits the lead with a review for everyone else's items", () => {
    const summaries = buildSummaries(
      recap("## New Plants", "@someone :", "* A", "* B", "", "@other :", "* C"),
      LEAD,
    );
    const lead = summaries.get("Charles LINDECKER")!;
    expect(lead.reviews.get("New Plants")!.get("@someone")).toEqual(["A", "B"]);
    expect(lead.reviews.get("New Plants")!.get("@other")).toEqual(["C"]);
    expect(countContributions(lead).reviewCount).toBe(3);
  });

  it("skips 'check' sections when computing reviews", () => {
    const summaries = buildSummaries(recap("## Plant Check", "@someone :", "* A"), LEAD);
    expect(summaries.has("Charles LINDECKER")).toBe(false);
    expect(summaries.get("@someone")!.sections.get("Plant Check")).toEqual(["A"]);
  });

  it("registers a contributor with no bullets", () => {
    const summaries = buildSummaries(recap("## New Plants", "@ghost :"), LEAD);
    expect(summaries.get("@ghost")!.sections.size).toBe(0);
  });

  it("drops bullets that precede any contributor marker", () => {
    expect(buildSummaries(recap("## New Plants", "* orphan"), LEAD).size).toBe(0);
  });

  it("files headerless bullets under the default section", () => {
    const summaries = buildSummaries(recap("@someone :", "* A"), LEAD);
    expect([...summaries.get("@someone")!.sections.keys()]).toEqual([DEFAULT_SECTION]);
  });

  it("honours a custom lead identity", () => {
    const summaries = buildSummaries(recap("## New Plants", "@ada :", "* A"), {
      name: "Ada Lovelace",
      aliases: ["@ada"],
    });
    expect([...summaries.keys()]).toEqual(["Ada Lovelace"]);
    expect(countContributions(summaries.get("Ada Lovelace")!).reviewCount).toBe(0);
  });
});

describe("formatPeriod", () => {
  it("converts an ISO range to dd/mm/yy", () => {
    expect(formatPeriod("2026-04-01..2026-04-07")).toBe("01/04/26 → 07/04/26");
  });

  it.each([
    ["01/04/26 → 07/04/26", "already formatted"],
    ["Semaine 14", "free-form"],
    ["2026-02-31..2026-03-01", "overflowing date"],
    ["nope..nope", "non-ISO bounds"],
  ])("leaves %s untouched (%s)", (input) => {
    expect(formatPeriod(input)).toBe(input.trim());
  });
});
