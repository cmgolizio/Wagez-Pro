/**
 * Hourly rates and pay.
 *
 * Money is always integer cents inside Wagez: `$22.50/hour` is `2250`. Rates
 * typed by a user are converted digit by digit rather than through floating
 * point, so no rounding error can enter the stored value.
 */

import { MINUTES_PER_HOUR } from "./time";

const DECIMAL_NUMBER = /^(\d+(\.\d*)?|\.\d+)$/;

/**
 * Convert an exact decimal string of dollars into cents, rounding a third
 * decimal place half up.
 */
function decimalDollarsToCents(text) {
  const [whole, fraction = ""] = text.split(".");
  const dollars = whole === "" ? 0 : Number(whole);
  const padded = `${fraction}000`.slice(0, 3);
  const hundredths = Number(padded.slice(0, 2));
  const thousandths = Number(padded.charAt(2));
  return dollars * 100 + hundredths + (thousandths >= 5 ? 1 : 0);
}

/**
 * Normalize an hourly rate into integer cents. Zero is allowed; negatives and
 * unreadable values are not.
 * @returns {number|null}
 */
export function parseRateCents(value) {
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  if (typeof value !== "number" && typeof value !== "string") return null;

  const text = String(value)
    .trim()
    .replace(/[$,\s]/g, "");
  if (text === "" || !DECIMAL_NUMBER.test(text)) return null;
  return decimalDollarsToCents(text);
}

/**
 * Pay for a number of paid minutes at an hourly rate, rounded once at the end.
 * @returns {number|null} integer cents.
 */
export function calculatePayCents(paidMinutes, hourlyRateCents) {
  if (!Number.isInteger(paidMinutes) || paidMinutes < 0) return null;
  if (!Number.isInteger(hourlyRateCents) || hourlyRateCents < 0) return null;
  return Math.round((paidMinutes * hourlyRateCents) / MINUTES_PER_HOUR);
}
