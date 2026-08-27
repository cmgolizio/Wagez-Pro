/**
 * Money display. Everything starts from integer cents.
 */

const CENTS_PER_DOLLAR = 100;

const dollarsAndCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format cents as currency, e.g. `16573` -> `"$165.73"`.
 * @returns {string|null}
 */
export function formatCents(cents) {
  if (!Number.isFinite(cents)) return null;
  return dollarsAndCents.format(cents / CENTS_PER_DOLLAR);
}

/**
 * Format an hourly rate, e.g. `2200` -> `"$22/hour"`, `2250` -> `"$22.50/hour"`.
 * Round rates drop the trailing zeros so the big display stays uncluttered.
 * @returns {string|null}
 */
export function formatHourlyRate(cents) {
  if (!Number.isFinite(cents)) return null;
  const format =
    cents % CENTS_PER_DOLLAR === 0 ? wholeDollars : dollarsAndCents;
  return `${format.format(cents / CENTS_PER_DOLLAR)}/hour`;
}

/**
 * Format cents as a plain decimal for a rate input, e.g. `2250` -> `"22.50"`,
 * `2000` -> `"20"`. No symbol and no separators: the value has to read back
 * through `parseRateCents` unchanged.
 * @returns {string} `""` when there is no rate to edit.
 */
export function formatRateInput(cents) {
  if (!Number.isInteger(cents) || cents < 0) return "";
  const dollars = Math.floor(cents / CENTS_PER_DOLLAR);
  const remainder = cents % CENTS_PER_DOLLAR;
  return remainder === 0
    ? String(dollars)
    : `${dollars}.${String(remainder).padStart(2, "0")}`;
}
