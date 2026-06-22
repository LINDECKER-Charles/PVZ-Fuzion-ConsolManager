import type { Id } from "./models";

export interface HasId {
  id: Id;
}

/** Entries from `source` whose `id` does not appear in `target`. */
export function missingById<T extends HasId>(source: Iterable<T>, target: Iterable<T>): T[] {
  const targetIds = new Set<Id>();
  for (const item of target) targetIds.add(item.id);
  return [...source].filter((item) => !targetIds.has(item.id));
}
