/**
 * Calendar dates are stored as `"YYYY-MM-DD"` strings so they sort
 * chronologically as plain text and carry no timezone of their own.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True when `value` is a real calendar date in `"YYYY-MM-DD"` form. */
export function isIsoDate(value) {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Shift an ISO date by whole days, e.g. for a shift that ends after midnight.
 * @returns {string|null}
 */
export function addDays(isoDate, days) {
  if (!isIsoDate(isoDate) || !Number.isInteger(days)) return null;

  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** The two week boundaries Wagez understands. */
export const SUNDAY = "sunday";
export const MONDAY = "monday";

const WEEK_START_INDEX = { [SUNDAY]: 0, [MONDAY]: 1 };

export const DAYS_PER_WEEK = 7;

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

/**
 * Build an ISO date from year/month/day numbers, without validating them.
 * Callers pass values that came out of a Date, so they are already real.
 */
function toIsoDate(year, month, day) {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/**
 * Today, as the user's own calendar sees it.
 *
 * Read from local time rather than UTC: "today" is the day the user is having,
 * not the day it is in Greenwich.
 *
 * @param {Date} [now]
 * @returns {string} `"YYYY-MM-DD"`
 */
export function todayIsoDate(now = new Date()) {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Which day of the week a date falls on: 0 for Sunday through 6 for Saturday.
 * @returns {number|null}
 */
export function dayOfWeek(isoDate) {
  if (!isIsoDate(isoDate)) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * The first day of the seven-day week a date belongs to.
 *
 * @param {string} isoDate
 * @param {string} [weekStartsOn] {@link SUNDAY} or {@link MONDAY}
 * @returns {string|null}
 */
export function startOfWeek(isoDate, weekStartsOn = SUNDAY) {
  const day = dayOfWeek(isoDate);
  if (day === null) return null;
  const firstDay = WEEK_START_INDEX[weekStartsOn] ?? WEEK_START_INDEX[SUNDAY];
  // How far back the week began, counting the wrap when the week starts on a
  // Monday and the date is a Sunday.
  const offset = (day - firstDay + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return addDays(isoDate, -offset);
}

/** The last day of the week that begins on `weekStart`. */
export function endOfWeek(weekStart) {
  return addDays(weekStart, DAYS_PER_WEEK - 1);
}
