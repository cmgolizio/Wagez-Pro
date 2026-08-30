/**
 * Overtime display: what it is paid at, and when it starts.
 *
 * Durations themselves are already spoken for — a threshold is a duration like
 * any other and reads through `formatDuration`.
 */

import { MINUTES_PER_HOUR } from "@/lib/calculations/time";

/** Trim a decimal down to what it actually says: `1.5`, `2`, `1.75`. */
function trim(value, places) {
  const factor = 10 ** places;
  return String(Math.round(value * factor) / factor);
}

/**
 * A multiplier as a field would have it typed, e.g. `1.5` -> `"1.5"`.
 * @returns {string} `""` when there is no multiplier to edit.
 */
export function formatMultiplierInput(multiplier) {
  return Number.isFinite(multiplier) ? trim(multiplier, 2) : "";
}

/**
 * A multiplier as it is read, e.g. `1.5` -> `"1.5×"`.
 * @returns {string|null}
 */
export function formatMultiplier(multiplier) {
  return Number.isFinite(multiplier) ? `${trim(multiplier, 2)}×` : null;
}

/**
 * A threshold as a field would have it typed — hours in a week, e.g. `2400` ->
 * `"40"`.
 * @returns {string} `""` when there is no threshold to edit.
 */
export function formatHoursInput(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0) return "";
  return trim(minutes / MINUTES_PER_HOUR, 2);
}
