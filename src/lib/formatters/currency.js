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
