/**
 * Weekly overtime.
 *
 * Overtime in Wagez is arithmetic the user has asked for, not a judgement about
 * what they are owed: they choose a weekly threshold and a multiplier, and
 * Wagez applies exactly those. It is off until somebody turns it on, and while
 * it is off nothing in here changes a single number.
 *
 * The unit is paid minutes. A break is unpaid time and has already been taken
 * off before a shift reaches this module, so break minutes can never push
 * anybody over the threshold.
 */

import { MINUTES_PER_HOUR } from "./time";
import { calculatePayCents } from "./wages";

/** A working week of 40 hours, with time and a half after it. */
export const DEFAULT_THRESHOLD_MINUTES = 40 * MINUTES_PER_HOUR;
export const DEFAULT_MULTIPLIER = 1.5;

/** A threshold is somewhere between an hour and a whole week of hours. */
export const MIN_THRESHOLD_MINUTES = MINUTES_PER_HOUR;
export const MAX_THRESHOLD_MINUTES = 168 * MINUTES_PER_HOUR;

/** Overtime pays at least the normal rate, and no more than ten times it. */
export const MIN_MULTIPLIER = 1;
export const MAX_MULTIPLIER = 10;

/** Overtime as a Wagez nobody has configured has it: off, 40 hours, 1.5×. */
export const DEFAULT_OVERTIME = Object.freeze({
  enabled: false,
  thresholdMinutes: DEFAULT_THRESHOLD_MINUTES,
  multiplier: DEFAULT_MULTIPLIER,
});

const POSITIVE_DECIMAL = /^\d+(\.\d+)?$/;

/** A plain non-negative decimal, from a number or the text of one. */
function parseDecimal(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  return POSITIVE_DECIMAL.test(text) ? Number(text) : null;
}

/**
 * The threshold as the user gives it — hours in a week — as minutes.
 * @returns {number|null} null when it is not a threshold Wagez can work with.
 */
export function parseThresholdMinutes(value) {
  const hours = parseDecimal(value);
  if (hours === null) return null;
  const minutes = Math.round(hours * MINUTES_PER_HOUR);
  if (minutes < MIN_THRESHOLD_MINUTES) return null;
  return minutes > MAX_THRESHOLD_MINUTES ? null : minutes;
}

/**
 * What overtime pays, as a multiple of the shift's own rate.
 * @returns {number|null} null when it is not a multiplier Wagez can work with.
 */
export function parseMultiplier(value) {
  const raw = parseDecimal(value);
  if (raw === null) return null;
  // Two decimal places is as fine as a multiplier ever needs to be.
  const multiplier = Math.round(raw * 100) / 100;
  if (multiplier < MIN_MULTIPLIER) return null;
  return multiplier > MAX_MULTIPLIER ? null : multiplier;
}

/**
 * Overtime settings, whatever they arrive as.
 *
 * Anything unreadable falls back to the default rather than being repaired into
 * something the user never chose — the same way the rest of Wagez reads the
 * device.
 *
 * @returns {{enabled: boolean, thresholdMinutes: number, multiplier: number}}
 */
export function normalizeOvertime(value) {
  const overtime = value === null || typeof value !== "object" ? {} : value;
  const { thresholdMinutes, multiplier } = overtime;
  const threshold =
    Number.isInteger(thresholdMinutes) &&
    thresholdMinutes >= MIN_THRESHOLD_MINUTES &&
    thresholdMinutes <= MAX_THRESHOLD_MINUTES;

  return {
    enabled: overtime.enabled === true,
    thresholdMinutes: threshold ? thresholdMinutes : DEFAULT_THRESHOLD_MINUTES,
    multiplier: parseMultiplier(multiplier) ?? DEFAULT_MULTIPLIER,
  };
}

/**
 * Split a week's shifts into regular and overtime, and price both.
 *
 * The shifts are walked in the order they were worked, counting paid minutes as
 * they go. Everything up to the threshold is regular; everything after it is
 * overtime — including the second half of the shift the threshold falls in the
 * middle of. Each shift is paid at its own rate, so a week of two jobs prices
 * its overtime by the job the overtime happened at.
 *
 * With overtime off there is no threshold to cross, so every minute is a
 * regular minute and the answer is exactly the answer Wagez gives without it.
 *
 * @param {{paidMinutes: number, hourlyRateCents: number|null}[]} entries in
 *   chronological order.
 * @param {object} [overtime] the user's overtime settings.
 * @returns {{regularMinutes: number, overtimeMinutes: number,
 *   regularPayCents: number|null, overtimePayCents: number|null,
 *   payCents: number|null}[]} one entry per shift, in the order given. Money is
 *   null for a shift with no rate: Wagez never invents one.
 */
export function allocateOvertime(entries, overtime = DEFAULT_OVERTIME) {
  const { enabled, thresholdMinutes, multiplier } = normalizeOvertime(overtime);
  const threshold = enabled ? thresholdMinutes : Infinity;
  let worked = 0;

  return entries.map((entry) => {
    const paidMinutes =
      Number.isInteger(entry?.paidMinutes) && entry.paidMinutes > 0
        ? entry.paidMinutes
        : 0;
    const rateCents = Number.isInteger(entry?.hourlyRateCents)
      ? entry.hourlyRateCents
      : null;

    // Whatever is left of the threshold when this shift starts, at most.
    const regularMinutes = Math.max(
      0,
      Math.min(paidMinutes, threshold - worked),
    );
    const overtimeMinutes = paidMinutes - regularMinutes;
    worked += paidMinutes;

    if (rateCents === null) {
      return {
        regularMinutes,
        overtimeMinutes,
        regularPayCents: null,
        overtimePayCents: null,
        payCents: null,
      };
    }

    // Each half is rounded to the cent on its own, so the two always add up to
    // the shift's pay exactly as they are shown.
    const regularPayCents = calculatePayCents(regularMinutes, rateCents);
    const overtimePayCents = calculatePayCents(
      overtimeMinutes,
      rateCents,
      multiplier,
    );

    return {
      regularMinutes,
      overtimeMinutes,
      regularPayCents,
      overtimePayCents,
      payCents: regularPayCents + overtimePayCents,
    };
  });
}
