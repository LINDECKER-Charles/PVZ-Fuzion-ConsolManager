/** Domain models — pure data shapes, no IO. */

export type Id = string | number;

/**
 * Common shape for almanac entities (plants, zombies, achievements).
 * `raw` holds the untouched object from the translation file so it can be
 * dumped verbatim in reports and exports.
 */
export interface AlmanacEntry {
  id: Id;
  name: string | null;
  raw: Record<string, unknown>;
}

export type Plant = AlmanacEntry;
export type Zombie = AlmanacEntry;
export type Achievement = AlmanacEntry;

export type StringStatus = "missing" | "empty";

/** A translation discrepancy in a flat key/value string file. */
export interface StringEntry {
  key: string;
  source: string | null;
  target: string | null;
  status: StringStatus;
}

export const DEFAULT_TRELLO_LABEL = "To be translated";

export interface TrelloCard {
  name: string;
  description: string;
  listName: string;
  labels: string;
}
