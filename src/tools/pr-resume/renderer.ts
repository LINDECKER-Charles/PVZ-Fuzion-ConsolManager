/** Markdown rendering of the per-contributor blocks.
 *
 * The output is French on purpose: it is pasted verbatim into the French
 * contributor documentation (`Docs/french-contributor/*`).
 */

import { type ContributorSummary, countContributions } from "./service";
import { formatPeriod } from "./period";

const TITLE = "# 📊 Résumés des contributions par contributeur";
const EMPTY_MESSAGE = "Aucune contribution détectée dans le document.";
const CONTRIBUTOR_ICON = "👤";
const WEEK_ICON = "📅";
const EM_DASH = "—";
const SUMMARY_TITLE = "**Résumé de la semaine**";
const DETAIL_TITLE = "#### Détail";
const REVIEWS_TITLE = "## 🌿 **Reviews**";

const byLowerCase = (a: string, b: string): number =>
  a.toLowerCase().localeCompare(b.toLowerCase());

export interface RenderInput {
  period: string;
  prUrl: string;
  prNumber: string;
  summaries: Map<string, ContributorSummary>;
}

/** The header fields every contributor block repeats. */
interface BlockContext {
  formattedPeriod: string;
  prLink: string;
}

function renderHeadline(summary: ContributorSummary): string[] {
  const { newCount, modifiedCount, reviewCount } = countContributions(summary);
  return [
    SUMMARY_TITLE,
    "",
    `* Nouvelles traductions : **${newCount}**`,
    `* Traductions ajustées : **${modifiedCount}**`,
    `* Reviews effectuées : **${reviewCount}**`,
  ];
}

function renderSections(summary: ContributorSummary): string[] {
  const lines: string[] = [];
  for (const section of [...summary.sections.keys()].sort(byLowerCase)) {
    lines.push(`## ${section}`);
    for (const item of summary.sections.get(section) ?? []) {
      lines.push(`* ${item}`);
    }
    lines.push("");
  }
  return lines;
}

/** One `### section` block listing what each contributor was reviewed on. */
function renderReviewedSection(section: string, bucket: Map<string, string[]>): string[] {
  const lines = [`### ${section}`, ""];
  for (const reviewed of [...bucket.keys()].sort(byLowerCase)) {
    lines.push(`${reviewed} :`, ...(bucket.get(reviewed) ?? []).map((item) => `* ${item}`), "");
  }
  return lines;
}

function renderReviews(summary: ContributorSummary): string[] {
  if (summary.reviews.size === 0) {
    return [];
  }
  const lines = [REVIEWS_TITLE, ""];
  for (const section of [...summary.reviews.keys()].sort(byLowerCase)) {
    lines.push(...renderReviewedSection(section, summary.reviews.get(section) ?? new Map()));
  }
  return lines;
}

function renderContributor(
  name: string,
  summary: ContributorSummary,
  context: BlockContext,
): string[] {
  return [
    "",
    `## ${CONTRIBUTOR_ICON} ${name}`,
    "",
    `### ${WEEK_ICON} Semaine ${EM_DASH} \`${context.formattedPeriod}\``,
    `> ${context.prLink}`,
    "",
    ...renderHeadline(summary),
    "",
    "---",
    "",
    DETAIL_TITLE,
    "",
    ...renderSections(summary),
    ...renderReviews(summary),
    "---",
  ];
}

export function renderContributionSummary(input: RenderInput): string {
  const context: BlockContext = {
    formattedPeriod: formatPeriod(input.period),
    prLink: `[PR#${input.prNumber}](${input.prUrl})`,
  };
  const lines = [
    TITLE,
    "",
    `Période: \`${context.formattedPeriod}\``,
    `PR: ${context.prLink}`,
    "",
    "---",
  ];

  const contributors = [...input.summaries.keys()].sort(byLowerCase);
  if (contributors.length === 0) {
    return [...lines, "", EMPTY_MESSAGE, ""].join("\n");
  }

  for (const name of contributors) {
    const summary = input.summaries.get(name);
    if (summary) lines.push(...renderContributor(name, summary, context));
  }
  lines.push("");
  return lines.join("\n");
}
