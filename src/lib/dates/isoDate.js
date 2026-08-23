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
