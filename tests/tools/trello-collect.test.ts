import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Plant, StringEntry } from "../../src/core/models";
import { PLANTS_FILE } from "../../src/parsers/almanac";
import {
  DESCRIPTION_MAX_LEN,
  LIST_PLANTS,
  LIST_STRINGS,
  NAME_MAX_LEN,
  collectCards,
  describeAlmanac,
  describeString,
  truncate,
} from "../../src/tools/trello-export";
import { createTempProject, type TempProject } from "../helpers";

let project: TempProject;

beforeEach(() => {
  project = createTempProject();
});

afterEach(() => {
  project.cleanup();
});

describe("truncate", () => {
  it("appends an ellipsis when over the limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
    expect(truncate("hello world", 6).endsWith("…")).toBe(true);
    expect(truncate("hello world", 6).length).toBeLessThanOrEqual(6);
  });
});

describe("describeString", () => {
  it("wraps the entry in a json fence", () => {
    const e: StringEntry = { key: "my_key", source: "Hi there", target: null, status: "missing" };
    const body = describeString(e);
    expect(body.startsWith("```json")).toBe(true);
    expect(body.endsWith("```")).toBe(true);
    expect(body).toContain('"my_key"');
  });
});

describe("describeAlmanac", () => {
  it("renders the raw dict", () => {
    const body = describeAlmanac({ id: 1, name: "P", raw: { seedType: 1 } } as Plant);
    expect(body).toContain('"seedType": 1');
  });
});

describe("collectCards card-building", () => {
  it("truncates overlong string keys (name and description within limits)", () => {
    const longKey = "x".repeat(NAME_MAX_LEN + 50);
    project.makeLocale("English", { strings: { "translation_strings.json": { [longKey]: "Hi" } } });
    project.makeLocale("French");
    const cards = collectCards(project.root, "French", "lbl", "English");
    const card = cards.find((c) => c.listName === LIST_STRINGS);
    expect(card).toBeDefined();
    expect(card!.name.length).toBeLessThanOrEqual(NAME_MAX_LEN);
    expect(card!.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LEN);
  });

  it("falls back to id when the almanac name is missing", () => {
    project.makeLocale("English", { almanac: { [PLANTS_FILE]: { plants: [{ seedType: 42 }] } } });
    project.makeLocale("French");
    const cards = collectCards(project.root, "French", "lbl", "English");
    const card = cards.find((c) => c.listName === LIST_PLANTS);
    expect(card?.name).toBe("id 42");
  });

  it("combines almanac and strings", () => {
    project.makeLocale("English", {
      almanac: { [PLANTS_FILE]: { plants: [{ seedType: 1, name: "Peashooter" }] } },
      strings: { "translation_strings.json": { k1: "Hello" } },
    });
    project.makeLocale("French");
    const cards = collectCards(project.root, "French", "lbl", "English");
    expect(cards.some((c) => c.listName === LIST_PLANTS)).toBe(true);
    expect(cards.some((c) => c.listName === LIST_STRINGS)).toBe(true);
  });
});
