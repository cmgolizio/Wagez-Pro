/**
 * A week as plain text.
 *
 * Sharing a week means handing somebody the same answer the screen gives, in
 * something they can paste anywhere: a message, a note, an email. So the text
 * is built from the very same formatters the week is drawn with — a shared
 * total that disagreed with the total on screen would be worse than no sharing
 * at all — and nothing leaves the device to produce it.
 *
 * It stays short, the way the summary does. Wagez says what the week came to,
 * not how every hour of it was spent.
 */

import { DEFAULT_OVERTIME } from "@/lib/calculations/overtime";
import { formatCents } from "@/lib/formatters/currency";
import { formatWeekRange } from "@/lib/formatters/date";
import { formatDurationCompact } from "@/lib/formatters/duration";
import { formatMultiplier } from "@/lib/formatters/overtime";

/** What a share sheet calls this, where it asks for a name. */
export const SHARE_TITLE = "Wagez";

/**
 * The week, in words worth pasting somewhere.
 *
 *     Wagez — Aug 17 – Aug 23
 *
 *     4 shifts
 *     31h 45m
 *     $635.00 gross
 *
 * Money appears only where the week actually has a rate behind it, and the
 * overtime pair only where there is overtime to report — exactly the rules the
 * summary on screen follows.
 *
 * @param {string} weekStart the `"YYYY-MM-DD"` the week begins on.
 * @param {object} totals from `summarizeShifts`.
 * @param {object} [overtime] the user's overtime settings.
 * @returns {string|null} null when there is no week to share: an empty week, or
 *   a week that does not sit on a real date.
 */
export function formatWeekSummary(
  weekStart,
  totals,
  overtime = DEFAULT_OVERTIME,
) {
  const { shiftCount, paidMinutes, payCents, regularMinutes, overtimeMinutes } =
    totals;
  if (shiftCount === 0) return null;

  const range = formatWeekRange(weekStart);
  if (range === null) return null;

  const lines = [
    `${SHARE_TITLE} — ${range}`,
    "",
    `${shiftCount} ${shiftCount === 1 ? "shift" : "shifts"}`,
    formatDurationCompact(paidMinutes),
  ];

  if (overtime.enabled && overtimeMinutes > 0) {
    lines.push(`Regular ${formatDurationCompact(regularMinutes)}`);
    lines.push(
      `Overtime ${formatDurationCompact(overtimeMinutes)} at ${formatMultiplier(overtime.multiplier)}`,
    );
  }

  if (payCents !== null) lines.push(`${formatCents(payCents)} gross`);

  return lines.join("\n");
}
