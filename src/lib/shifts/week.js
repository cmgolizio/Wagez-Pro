/**
 * Saved shifts, seen a week at a time.
 *
 * Everything here derives from the shifts themselves: which week a shift falls
 * in, what order the week reads in, and what the week adds up to. Nothing is
 * stored — a total that was written down could go stale, and a weekly total
 * that lies is worse than no weekly total at all.
 */

import {
  DEFAULT_OVERTIME,
  allocateOvertime,
} from "@/lib/calculations/overtime";
import { SUNDAY, endOfWeek, startOfWeek } from "@/lib/dates/isoDate";

import { deriveShift } from "./savedShift";

/**
 * Chronological order: the day first, then the time the shift started, then the
 * order the shifts were saved in so that two identical shifts never swap places
 * between renders.
 */
function compareShifts(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
  return String(a.createdAt).localeCompare(String(b.createdAt));
}

/**
 * Sort shifts chronologically. Insertion order is never trusted: a Wednesday
 * saved before a Monday still reads Monday first.
 *
 * @returns {object[]} a new array.
 */
export function sortShifts(shifts) {
  return [...shifts].sort(compareShifts);
}

/**
 * The shifts worked in the seven days beginning `weekStart`, in order.
 *
 * A shift belongs to the week its start date falls in, so an overnight shift
 * that finishes on Monday morning still counts towards the Sunday.
 */
export function shiftsForWeek(shifts, weekStart) {
  const weekEnd = endOfWeek(weekStart);
  if (weekEnd === null) return [];
  return sortShifts(
    shifts.filter((shift) => shift.date >= weekStart && shift.date <= weekEnd),
  );
}

/**
 * Split saved shifts into weeks, most recent week first.
 *
 * @param {object[]} shifts
 * @param {string} [weekStartsOn] which day a week begins on.
 * @returns {{weekStart: string, shifts: object[]}[]}
 */
export function groupShiftsByWeek(shifts, weekStartsOn = SUNDAY) {
  const weeks = new Map();

  for (const shift of shifts) {
    const weekStart = startOfWeek(shift.date, weekStartsOn);
    if (weekStart === null) continue;
    const week = weeks.get(weekStart);
    if (week === undefined) weeks.set(weekStart, [shift]);
    else week.push(shift);
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([weekStart, weekShifts]) => ({
      weekStart,
      shifts: sortShifts(weekShifts),
    }));
}

/**
 * A set of shifts, each worked out and each priced.
 *
 * The shifts are put in the order they were worked before anything is counted:
 * overtime is a running total across a week, so the order it is counted in is
 * part of the answer, and insertion order is never that order.
 *
 * A shift that no longer makes sense is dropped rather than guessed at, exactly
 * as it is everywhere else a stored shift is read.
 *
 * @param {object[]} shifts saved shifts.
 * @param {object} [overtime] the user's overtime settings. Left out, or off,
 *   every minute is a regular minute and every shift is paid its base pay.
 * @returns {{shift: object, derived: object, pay: object}[]} in chronological
 *   order.
 */
export function allocateShifts(shifts, overtime = DEFAULT_OVERTIME) {
  const worked = [];

  for (const shift of sortShifts(shifts)) {
    const derived = deriveShift(shift);
    if (derived !== null) worked.push({ shift, derived });
  }

  const allocation = allocateOvertime(
    worked.map((entry) => entry.derived),
    overtime,
  );

  return worked.map((entry, index) => ({ ...entry, pay: allocation[index] }));
}

/**
 * What a week of already-priced shifts adds up to.
 *
 * Pay is only counted for the shifts that actually have a rate: Wagez never
 * invents one, so a week of rateless shifts reports its hours and no money.
 *
 * @param {{derived: object, pay: object}[]} allocated from
 *   {@link allocateShifts}.
 * @returns {{shiftCount: number, elapsedMinutes: number, breakMinutes: number,
 *   paidMinutes: number, regularMinutes: number, overtimeMinutes: number,
 *   payCents: number|null, regularPayCents: number|null,
 *   overtimePayCents: number|null}}
 */
export function summarizeAllocated(allocated) {
  const totals = {
    shiftCount: 0,
    elapsedMinutes: 0,
    breakMinutes: 0,
    paidMinutes: 0,
    regularMinutes: 0,
    overtimeMinutes: 0,
    payCents: null,
    regularPayCents: null,
    overtimePayCents: null,
  };

  for (const { derived, pay } of allocated) {
    totals.shiftCount += 1;
    totals.elapsedMinutes += derived.elapsedMinutes;
    totals.breakMinutes += derived.breakMinutes;
    totals.paidMinutes += derived.paidMinutes;
    totals.regularMinutes += pay.regularMinutes;
    totals.overtimeMinutes += pay.overtimeMinutes;

    if (pay.payCents !== null) {
      totals.payCents = (totals.payCents ?? 0) + pay.payCents;
      totals.regularPayCents =
        (totals.regularPayCents ?? 0) + pay.regularPayCents;
      totals.overtimePayCents =
        (totals.overtimePayCents ?? 0) + pay.overtimePayCents;
    }
  }

  return totals;
}

/**
 * What a set of shifts adds up to.
 *
 * @param {object[]} shifts
 * @param {object} [overtime] the user's overtime settings.
 * @returns {object} see {@link summarizeAllocated}.
 */
export function summarizeShifts(shifts, overtime = DEFAULT_OVERTIME) {
  return summarizeAllocated(allocateShifts(shifts, overtime));
}
