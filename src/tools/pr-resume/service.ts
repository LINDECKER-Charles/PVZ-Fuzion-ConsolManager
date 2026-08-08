/** Aggregation of a parsed PR recap into one summary per contributor. */

import {
  type PrRecapDocument,
  extractBullet,
  extractContributor,
  normalizeSectionTitle,
} from "./parser";

/**
 * The locale maintainer who reviews everyone else's work.
 *
 * `aliases` lists every spelling the recap may use (GitHub handle, display
 * name); they are all folded into `name` so a single block is produced.
 */
export interface LeadIdentity {
  name: string;
  aliases: readonly string[];
}

export interface ContributorSummary {
  /** Section title → bullets authored by this contributor. */
  sections: Map<string, string[]>;
  /** Section title → contributor → bullets this person reviewed. Lead only. */
  reviews: Map<string, Map<string, string[]>>;
}

/**
 * Bullets that belong to no `##` section yet.
 *
 * French like the rest of the rendered output — it is a heading the reader
 * sees, not an internal identifier.
 */
export const DEFAULT_SECTION = "Détail";
/** Sections whose name matches this are proof-reading passes, not reviewable work. */
const NON_REVIEWABLE = "check";
const SECTION_MARKER = "##";

const NEW_MARKERS = ["new", "nouveau", "nouvelle"];
const MODIFIED_MARKERS = ["modified", "modifi"];

/** Fold a handle/display name to a comparison key: `@LINDECKER-Charles` ≡ `Charles LINDECKER`. */
export function normalizePersonKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function createSummary(): ContributorSummary {
  return { sections: new Map(), reviews: new Map() };
}

function pushInto<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
}

function isReviewableSection(sectionName: string): boolean {
  return !sectionName.toLowerCase().includes(NON_REVIEWABLE);
}

/**
 * Walks the recap body, bucketing every bullet under its author and section.
 *
 * Contributions from anyone other than the lead are mirrored into the lead's
 * `reviews`, which is how the "Reviews effectuées" counter is derived — the
 * recap never states reviews explicitly.
 */
class RecapAccumulator {
  readonly summaries = new Map<string, ContributorSummary>();
  private readonly lead: LeadIdentity;
  private readonly leadKeys: Set<string>;
  private section = DEFAULT_SECTION;
  private contributor: string | null = null;

  constructor(lead: LeadIdentity) {
    this.lead = lead;
    this.leadKeys = new Set([lead.name, ...lead.aliases].map(normalizePersonKey));
  }

  consume(rawLine: string): void {
    const line = rawLine.trim();
    if (line.startsWith(SECTION_MARKER)) {
      this.section = normalizeSectionTitle(line);
      this.contributor = null;
      return;
    }
    const contributor = extractContributor(line);
    if (contributor) {
      this.openContributor(contributor);
      return;
    }
    const item = extractBullet(line);
    if (item !== null && this.contributor !== null) {
      this.addBullet(this.contributor, item);
    }
  }

  private openContributor(name: string): void {
    this.contributor = this.isLead(name) ? this.lead.name : name;
    // Register even without bullets: an empty block still documents the week.
    this.summaryFor(this.contributor);
  }

  private addBullet(contributor: string, item: string): void {
    pushInto(this.summaryFor(contributor).sections, this.section, item);
    if (this.isLead(contributor) || !isReviewableSection(this.section)) {
      return;
    }
    const reviews = this.summaryFor(this.lead.name).reviews;
    let bySection = reviews.get(this.section);
    if (!bySection) {
      bySection = new Map();
      reviews.set(this.section, bySection);
    }
    pushInto(bySection, contributor, item);
  }

  private isLead(name: string): boolean {
    return this.leadKeys.has(normalizePersonKey(name));
  }

  private summaryFor(name: string): ContributorSummary {
    let summary = this.summaries.get(name);
    if (!summary) {
      summary = createSummary();
      this.summaries.set(name, summary);
    }
    return summary;
  }
}

export function buildSummaries(
  document: PrRecapDocument,
  lead: LeadIdentity,
): Map<string, ContributorSummary> {
  const accumulator = new RecapAccumulator(lead);
  for (const line of document.bodyLines) {
    accumulator.consume(line);
  }
  return accumulator.summaries;
}

export interface ContributionCounts {
  newCount: number;
  modifiedCount: number;
  reviewCount: number;
}

function matchesAny(haystack: string, markers: readonly string[]): boolean {
  return markers.some((marker) => haystack.includes(marker));
}

/** Derive the week's headline numbers from the section names the bullets sit under. */
export function countContributions(summary: ContributorSummary): ContributionCounts {
  let newCount = 0;
  let modifiedCount = 0;
  for (const [section, items] of summary.sections) {
    const name = section.toLowerCase();
    if (matchesAny(name, NEW_MARKERS)) {
      newCount += items.length;
    } else if (matchesAny(name, MODIFIED_MARKERS)) {
      modifiedCount += items.length;
    }
  }
  return { newCount, modifiedCount, reviewCount: totalReviews(summary) };
}

export function totalReviews(summary: ContributorSummary): number {
  let total = 0;
  for (const bySection of summary.reviews.values()) {
    for (const items of bySection.values()) {
      total += items.length;
    }
  }
  return total;
}
