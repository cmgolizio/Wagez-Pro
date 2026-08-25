/**
 * Saved shifts, seen a week at a time.
 *
 * Everything here derives from the shifts themselves: which week a shift falls
 * in, what order the week reads in, and what the week adds up to. Nothing is
 * stored — a total that was written down could go stale, and a weekly total
 * that lies is worse than no weekly total at all.
 */

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
 * What a set of shifts adds up to.
 *
 * Pay is only counted for the shifts that actually have a rate: Wagez never
 * invents one, so a week of unpaid-rate shifts reports its hours and no money.
 *
 * @returns {{shiftCount: number, elapsedMinutes: number, breakMinutes: number,
 *   paidMinutes: number, payCents: number|null}}
 */
export function summarizeShifts(shifts) {
  const totals = {
    shiftCount: 0,
    elapsedMinutes: 0,
    breakMinutes: 0,
    paidMinutes: 0,
    payCents: null,
  };

  for (const shift of shifts) {
    const derived = deriveShift(shift);
    if (derived === null) continue;

    totals.shiftCount += 1;
    totals.elapsedMinutes += derived.elapsedMinutes;
    totals.breakMinutes += derived.breakMinutes;
    totals.paidMinutes += derived.paidMinutes;
    if (derived.basePayCents !== null) {
      totals.payCents = (totals.payCents ?? 0) + derived.basePayCents;
    }
  }

  return totals;
}
