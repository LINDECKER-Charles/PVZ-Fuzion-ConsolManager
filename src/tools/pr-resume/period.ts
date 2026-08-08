/** Period formatting for PR recaps: `2026-04-01..2026-04-07` → `01/04/26 → 07/04/26`. */

export const PERIOD_ARROW = "→";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RANGE_SEPARATOR = "..";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Parse a strict `YYYY-MM-DD` date.
 *
 * Rejects overflowing components (`2026-02-31`) by round-tripping through
 * `Date`, which normalises them instead of failing.
 */
function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return null;
  }
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

function formatDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

/**
 * Normalise the period line.
 *
 * An already-formatted range (containing {@link PERIOD_ARROW}) and anything the
 * parser does not recognise are returned untouched — the recap author stays in
 * control of the wording.
 */
export function formatPeriod(period: string): string {
  const cleaned = period.trim();
  if (cleaned.includes(PERIOD_ARROW) || !cleaned.includes(RANGE_SEPARATOR)) {
    return cleaned;
  }

  const [startRaw, endRaw] = cleaned.split(RANGE_SEPARATOR, 2).map((s) => s.trim());
  const start = parseIsoDate(startRaw);
  const end = parseIsoDate(endRaw);
  if (!start || !end) {
    return cleaned;
  }
  return `${formatDate(start)} ${PERIOD_ARROW} ${formatDate(end)}`;
}
