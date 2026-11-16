/**
 * Biweekly pay periods, anchored to one known period and its payday.
 * All date arithmetic is UTC calendar-day arithmetic to avoid DST drift.
 * Payday is a recurring planned date, not a verified payroll deposit date.
 */

import { addDays, isIsoDate, startOfWeek } from "@/lib/dates/isoDate";
import { allocateShifts, summarizeAllocated } from "@/lib/shifts/week";

export const PAY_PERIOD_DAYS = 14;
const DAY_MS = 86400000;

export function dayNumber(isoDate) {
  if (!isIsoDate(isoDate)) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

export function normalizePayPeriod(value) {
  if (!value || typeof value !== "object") return null;
  const { anchorStart, anchorPayday } = value;
  const start = dayNumber(anchorStart);
  const payday = dayNumber(anchorPayday);
  if (start === null || payday === null || payday < start + 13) return null;
  return { anchorStart, anchorPayday };
}

/**
 * Resolve any date into the beginning of its 14-day period,
 * extending the known cycle indefinitely in both directions.
 */
export function periodForDate(date, schedule) {
  const normalized = normalizePayPeriod(schedule);
  if (!normalized) return null;
  const target = dayNumber(date);
  if (target === null) return null;
  const cycle = Math.floor(
    (target - dayNumber(normalized.anchorStart)) / PAY_PERIOD_DAYS,
  );
  const start = addDays(normalized.anchorStart, cycle * PAY_PERIOD_DAYS);
  return {
    start,
    end: addDays(start, PAY_PERIOD_DAYS - 1),
    payday: addDays(normalized.anchorPayday, cycle * PAY_PERIOD_DAYS),
    cycle,
  };
}

/**
 * Price each shift in the context of its WHOLE configured overtime week,
 * including shifts on either side of the pay-period boundary. Filtering by
 * employer happens only after overtime allocation, as in Week view.
 */
export function payPeriodDetails(
  shifts,
  schedule,
  date,
  { overtime, weekStartsOn = "sunday", employerId = "all" } = {},
) {
  const period = periodForDate(date, schedule);
  if (!period) return null;

  const byWeek = new Map();
  for (const shift of shifts) {
    const weekStart = startOfWeek(shift.date, weekStartsOn);
    if (!weekStart) continue;
    if (!byWeek.has(weekStart)) byWeek.set(weekStart, []);
    byWeek.get(weekStart).push(shift);
  }

  const priced = [];
  for (const week of byWeek.values()) {
    const allocation = allocateShifts(week, overtime);
    for (const entry of allocation) {
      const day = entry.shift.date;
      if (day < period.start || day > period.end) continue;
      if (employerId === "none" && entry.shift.employerId) continue;
      if (employerId !== "all" && employerId !== "none" &&
          entry.shift.employerId !== employerId) continue;
      priced.push(entry);
    }
  }

  const firstEnd = addDays(period.start, 6);
  const firstWeek = priced.filter(({ shift }) => shift.date <= firstEnd);
  const secondWeek = priced.filter(({ shift }) => shift.date > firstEnd);
  const missingRates = priced.filter(({ derived }) =>
    derived.hourlyRateCents === null,
  ).length;

  return {
    ...period,
    totals: summarizeAllocated(priced),
    missingRates,
    weeks: [
      {
        start: period.start,
        end: firstEnd,
        totals: summarizeAllocated(firstWeek),
      },
      {
        start: addDays(period.start, 7),
        end: period.end,
        totals: summarizeAllocated(secondWeek),
      },
    ],
  };
}
