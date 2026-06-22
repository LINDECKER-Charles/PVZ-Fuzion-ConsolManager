import type { Achievement, Id, Plant, Zombie } from "../core/models";
import { loadJson, sourceAlmanacPath } from "./loaders";

export const PLANTS_FILE = "LawnStringsTranslate.json";
export const ZOMBIES_FILE = "ZombieStringsTranslate.json";
export const ACHIEVEMENTS_FILE = "AchievementsTextTranslate.json";

type RawEntry = Record<string, unknown>;

function isRecord(value: unknown): value is RawEntry {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Mirrors Python's `dict.get` (absent → `None`). */
function get(item: RawEntry, key: string): unknown {
  return key in item ? item[key] : null;
}

function collection(data: unknown, key: string): RawEntry[] {
  if (!isRecord(data)) return [];
  const items = data[key];
  if (!Array.isArray(items)) return [];
  return items.filter(isRecord);
}

export function loadPlants(root: string, locale: string): Plant[] {
  const data = loadJson(sourceAlmanacPath(root, locale, PLANTS_FILE));
  return collection(data, "plants").map((item) => ({
    id: get(item, "seedType") as Id,
    name: get(item, "name") as string | null,
    raw: item,
  }));
}

export function loadZombies(root: string, locale: string): Zombie[] {
  const data = loadJson(sourceAlmanacPath(root, locale, ZOMBIES_FILE));
  return collection(data, "zombies").map((item) => ({
    id: get(item, "theZombieType") as Id,
    name: get(item, "name") as string | null,
    raw: item,
  }));
}

export function loadAchievements(root: string, locale: string): Achievement[] {
  const data = loadJson(sourceAlmanacPath(root, locale, ACHIEVEMENTS_FILE));
  return collection(data, "achievements").map((item) => ({
    id: get(item, "achievement") as Id,
    name: get(item, "Name") as string | null,
    raw: item,
  }));
}
