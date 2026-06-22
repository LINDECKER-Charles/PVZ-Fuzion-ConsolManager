import path from "node:path";
import { isAbsolute } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PROJECT_DIR_NAME,
  PROJECT_ROOT,
  REPO_ROOT,
  SOURCE_LOCALE,
} from "../src/config";

/**
 * The Python suite monkeypatches and exercises the private `_discover_project_root`.
 * `config.ts` keeps that helper module-private (not exported) and is off-limits to
 * edit, so we instead assert the observable, exported invariants the discovery
 * logic guarantees.
 */
describe("config", () => {
  it("exposes the expected constants", () => {
    expect(PROJECT_DIR_NAME).toBe("PvZ_Fusion_Translator");
    expect(SOURCE_LOCALE).toBe("English");
  });

  it("resolves REPO_ROOT and PROJECT_ROOT to absolute paths", () => {
    expect(isAbsolute(REPO_ROOT)).toBe(true);
    expect(isAbsolute(PROJECT_ROOT)).toBe(true);
  });

  it("falls back to the canonical sibling path of REPO_ROOT", () => {
    // When no candidate exists, discovery returns `REPO_ROOT/PROJECT_DIR_NAME`.
    // In the test environment that canonical path is the resolved default.
    const canonical = path.resolve(REPO_ROOT, PROJECT_DIR_NAME);
    const parentCandidate = path.resolve(REPO_ROOT, "..", PROJECT_DIR_NAME);
    expect([canonical, parentCandidate]).toContain(PROJECT_ROOT);
  });
});
