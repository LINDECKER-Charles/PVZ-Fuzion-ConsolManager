import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectCards, exportTrello } from "../../src/tools/trello-export";
import { createTempProject, type TempProject } from "../helpers";

let project: TempProject;
let exportsDir: string;

beforeEach(() => {
  project = createTempProject();
  exportsDir = mkdtempSync(path.join(tmpdir(), "pvzf-exp-"));
});

afterEach(() => {
  project.cleanup();
  rmSync(exportsDir, { recursive: true, force: true });
});

function isFile(p: string): boolean {
  return existsSync(p) && statSync(p).isFile();
}

describe("exportTrello", () => {
  it("writes CSVs and a README", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k1: "Hello" } } });
    project.makeLocale("French");
    const out = exportTrello("French", exportsDir, project.root, "lbl", "English");
    expect(isFile(out.readmePath)).toBe(true);
    expect(out.totalCards).toBeGreaterThanOrEqual(1);
    expect(Object.keys(out.csvPaths).length).toBeGreaterThan(0);
    for (const p of Object.values(out.csvPaths)) {
      expect(isFile(p)).toBe(true);
    }
  });

  it("handles a fully translated locale", () => {
    project.makeLocale("English", { strings: { "translation_strings.json": { k: "v" } } });
    project.makeLocale("French", { strings: { "translation_strings.json": { k: "v-fr" } } });
    const out = exportTrello("French", exportsDir, project.root, "lbl", "English");
    expect(out.totalCards).toBe(0);
    expect(out.csvPaths).toEqual({});
    expect(isFile(out.readmePath)).toBe(true);
  });

  it("exports one travel card per missing ID with its name and desc", () => {
    project.makeLocale("English", {
      strings: {
        "travel_buffs.json": {
          advancedBuffs: {
            "0": { name: "Existing", desc: "Existing description" },
            "1": { name: "Missing", desc: "Missing description" },
          },
        },
      },
    });
    project.makeLocale("French", {
      strings: {
        "travel_buffs.json": {
          advancedBuffs: { "0": { name: "", desc: "" } },
        },
      },
    });

    const travelCards = collectCards(project.root, "French", "lbl", "English")
      .filter((card) => card.listName === "Travel Buffs");
    expect(travelCards).toHaveLength(1);
    expect(travelCards[0].name).toBe("Missing");
    expect(travelCards[0].description).toContain("Missing description");
  });
});
