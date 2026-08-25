/**
 * Calendar-date display.
 *
 * Stored dates are plain `"YYYY-MM-DD"` strings with no timezone of their own,
 * so every formatter here reads them as UTC. Anything else would let a user in
 * a negative offset see yesterday's date on their own shift.
 */

import { endOfWeek, isIsoDate } from "@/lib/dates/isoDate";

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

const monthDayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function toUtcDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * A shift's day, e.g. `"2026-08-17"` -> `"Mon · Aug 17"`.
 * @returns {string|null}
 */
export function formatShiftDay(isoDate) {
  if (!isIsoDate(isoDate)) return null;
  const date = toUtcDate(isoDate);
  return `${weekdayFormat.format(date)} · ${monthDayFormat.format(date)}`;
}

/**
 * Just the weekday, e.g. `"Mon"`.
 * @returns {string|null}
 */
export function formatWeekday(isoDate) {
  if (!isIsoDate(isoDate)) return null;
  return weekdayFormat.format(toUtcDate(isoDate));
}

/**
 * The span a week covers, e.g. `"Aug 17 – Aug 23"`.
 * @returns {string|null}
 */
export function formatWeekRange(weekStart) {
  const weekEnd = endOfWeek(weekStart);
  if (weekEnd === null) return null;
  return `${monthDayFormat.format(toUtcDate(weekStart))} – ${monthDayFormat.format(toUtcDate(weekEnd))}`;
}
