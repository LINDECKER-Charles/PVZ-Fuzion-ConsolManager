import { describe, expect, it } from "vitest";

import { missingById } from "../../src/core/diff";

interface Entry {
  id: number;
}

const entry = (id: number): Entry => ({ id });

describe("missingById", () => {
  it("returns only entries absent from target", () => {
    const src = [entry(1), entry(2), entry(3)];
    const tgt = [entry(1), entry(3)];
    expect(missingById(src, tgt).map((e) => e.id)).toEqual([2]);
  });

  it("is empty when target covers source", () => {
    const src = [entry(1), entry(2)];
    expect(missingById(src, src)).toEqual([]);
  });

  it("returns all when target empty", () => {
    const src = [entry(1), entry(2)];
    expect(missingById(src, []).map((e) => e.id)).toEqual([1, 2]);
  });

  it("preserves source order", () => {
    const src = [entry(3), entry(1), entry(2)];
    expect(missingById(src, [entry(1)]).map((e) => e.id)).toEqual([3, 2]);
  });
});
