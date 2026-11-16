import { describe, expect, it } from "vitest";

import { createSavedShift } from "@/lib/shifts/savedShift";
import {
  dayNumber,
  normalizePayPeriod,
  payPeriodDetails,
  periodForDate,
} from "@/lib/pay-periods/biweekly";
import {
  defaultWagezData,
  loadWagezData,
  saveWagezData,
} from "@/lib/storage/wagezStorage";

const schedule = {
  anchorStart: "2026-10-24",
  anchorPayday: "2026-11-13",
};

function shift(date, hours = 8, options = {}) {
  const result = createSavedShift({
    date,
    startTime: hours > 14 ? "00:00" : "09:00",
    endTime: `${String(hours > 14 ? hours : 9 + hours).padStart(2, "0")}:00`,
    hourlyRate: "20",
    ...options,
  });
  expect(result.ok).toBe(true);
  return result.shift;
}

describe("biweekly pay period schedule", () => {
  it("repeats one known pair of dates indefinitely backward and forward", () => {
    expect(periodForDate("2026-10-24", schedule)).toEqual({
      start: "2026-10-24",
      end: "2026-11-06",
      payday: "2026-11-13",
      cycle: 0,
    });
    expect(periodForDate("2026-11-06", schedule).start).toBe("2026-10-24");
    expect(periodForDate("2026-11-07", schedule)).toEqual({
      start: "2026-11-07",
      end: "2026-11-20",
      payday: "2026-11-27",
      cycle: 1,
    });
    expect(periodForDate("2026-10-23", schedule)).toEqual({
      start: "2026-10-10",
      end: "2026-10-23",
      payday: "2026-10-30",
      cycle: -1,
    });
  });

  it("does not drift across DST, leap years, or the year boundary", () => {
    expect(dayNumber("2026-11-07") - dayNumber("2026-10-24")).toBe(14);
    const leap = { anchorStart: "2024-02-19", anchorPayday: "2024-03-08" };
    expect(periodForDate("2024-03-04", leap)).toMatchObject({
      start: "2024-03-04", end: "2024-03-17", payday: "2024-03-22",
    });
    const year = { anchorStart: "2026-12-21", anchorPayday: "2027-01-08" };
    expect(periodForDate("2027-01-04", year)).toMatchObject({
      start: "2027-01-04", end: "2027-01-17", payday: "2027-01-22",
    });
  });

  it("requires a complete, valid anchor and a payday after the period", () => {
    expect(normalizePayPeriod(null)).toBeNull();
    expect(normalizePayPeriod({ anchorStart: "2026-11-31", anchorPayday: "2026-12-11" })).toBeNull();
    expect(normalizePayPeriod({ anchorStart: "2026-10-24", anchorPayday: "2026-10-25" })).toBeNull();
    expect(normalizePayPeriod(schedule)).toEqual(schedule);
  });

  it("groups two consecutive seven-day blocks and includes tips in gross", () => {
    const shifts = [
      shift("2026-10-25", 8, { tip: "10.00", employerId: "a" }),
      shift("2026-11-02", 4, { employerId: "a" }),
      shift("2026-11-07", 6, { employerId: "a" }),
    ];
    const result = payPeriodDetails(shifts, schedule, "2026-11-01");
    expect(result.totals.shiftCount).toBe(2);
    expect(result.totals.paidMinutes).toBe(720);
    expect(result.totals.tipCents).toBe(1000);
    expect(result.totals.payCents).toBe(25000);
    expect(result.weeks.map((week) => week.totals.shiftCount)).toEqual([1, 1]);
    expect(result.payday).toBe("2026-11-13");
    expect(payPeriodDetails(shifts, schedule, "2026-11-07").totals.shiftCount).toBe(1);
    expect(payPeriodDetails(shifts, schedule, "2026-11-01", {
      employerId: "none",
    }).totals.shiftCount).toBe(0);
  });

  it("respects overtime earned before a pay-period boundary", () => {
    // The overtime week begins Sunday Nov 1, but the pay period begins Wed Nov 4.
    const cross = {
      anchorStart: "2026-11-04",
      anchorPayday: "2026-11-25",
    };
    const shifts = [
      shift("2026-11-01", 12),
      shift("2026-11-02", 12),
      shift("2026-11-03", 16),
      shift("2026-11-04", 8),
    ];
    const result = payPeriodDetails(shifts, cross, "2026-11-04", {
      overtime: { enabled: true, thresholdMinutes: 2400, multiplier: 1.5 },
      weekStartsOn: "sunday",
    });
    expect(result.totals.shiftCount).toBe(1);
    expect(result.totals.paidMinutes).toBe(480);
    expect(result.totals.overtimeMinutes).toBe(480);
    expect(result.totals.payCents).toBe(24000);
  });

  it("keeps payroll configuration and all prior shifts through storage", () => {
    const data = defaultWagezData();
    data.shifts = [shift("2026-11-02")];
    const storage = new Map();
    const fake = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    };
    expect(loadWagezData(fake).settings.payPeriod).toBeNull();
    data.settings.payPeriod = schedule;
    expect(saveWagezData(data, fake)).toBe(true);
    expect(loadWagezData(fake).settings.payPeriod).toEqual(schedule);
    expect(loadWagezData(fake).shifts).toEqual(data.shifts);
  });

  it("does not pretend hours-only shifts have known wages", () => {
    const s = shift("2026-10-25", 8, { hourlyRate: "" });
    const result = payPeriodDetails([s], schedule, "2026-10-25");
    expect(result.totals.payCents).toBeNull();
    expect(result.missingRates).toBe(1);
  });
});
