import { afterEach, describe, expect, it } from "vitest";

import {
  ACHIEVEMENTS_FILE,
  PLANTS_FILE,
  ZOMBIES_FILE,
  loadAchievements,
  loadPlants,
  loadZombies,
} from "../../src/parsers/almanac";
import { createTempProject, type TempProject } from "../helpers";

let project: TempProject;

afterEach(() => {
  project?.cleanup();
});

describe("almanac loaders", () => {
  it("load_plants extracts id and name", () => {
    project = createTempProject();
    project.makeLocale("English", {
      almanac: {
        [PLANTS_FILE]: {
          plants: [
            { seedType: 1, name: "Peashooter" },
            { seedType: 2, name: "Sunflower" },
          ],
        },
      },
    });
    const plants = loadPlants(project.root, "English");
    expect(plants.map((p) => [p.id, p.name])).toEqual([
      [1, "Peashooter"],
      [2, "Sunflower"],
    ]);
    expect(plants[0]!.raw).toEqual({ seedType: 1, name: "Peashooter" });
  });

  it("load_plants skips non-dict entries", () => {
    project = createTempProject();
    project.makeLocale("English", {
      almanac: {
        [PLANTS_FILE]: { plants: [{ seedType: 1, name: "Peashooter" }, "not a dict", 42] },
      },
    });
    const plants = loadPlants(project.root, "English");
    expect(plants.map((p) => p.id)).toEqual([1]);
  });

  it("load_plants returns empty when file missing", () => {
    project = createTempProject();
    expect(loadPlants(project.root, "Unknown")).toEqual([]);
  });

  it("load_zombies uses theZombieType id", () => {
    project = createTempProject();
    project.makeLocale("English", {
      almanac: { [ZOMBIES_FILE]: { zombies: [{ theZombieType: 100, name: "Basic" }] } },
    });
    const zombies = loadZombies(project.root, "English");
    expect(zombies.map((z) => [z.id, z.name])).toEqual([[100, "Basic"]]);
  });

  it("load_achievements reads capitalized Name field", () => {
    project = createTempProject();
    project.makeLocale("English", {
      almanac: { [ACHIEVEMENTS_FILE]: { achievements: [{ achievement: "ACH_1", Name: "First" }] } },
    });
    const achievements = loadAchievements(project.root, "English");
    expect(achievements.map((a) => [a.id, a.name])).toEqual([["ACH_1", "First"]]);
  });
});
