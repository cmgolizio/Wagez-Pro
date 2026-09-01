import { describe, expect, it } from "vitest";

import { MINUTES_PER_HOUR } from "@/lib/calculations/time";
import { formatWeekSummary } from "@/lib/share/weekSummary";
import { summarizeShifts } from "@/lib/shifts/week";

/** The week the build plan's own example runs over. */
const WEEK_START = "2026-08-16";

const hours = (count) => count * MINUTES_PER_HOUR;

/** A saved shift, with only the parts a total is made of spelled out. */
function shift(
  date,
  startTime,
  endTime,
  hourlyRateCents = 2000,
  breakMinutes = 0,
) {
  return {
    id: `${date}-${startTime}`,
    date,
    startTime,
    endTime,
    hourlyRateCents,
    breakMinutes,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

/** Four eight-hour days and a ten-hour Friday: forty-two paid hours. */
const CROSSING_WEEK = [
  shift("2026-08-17", "09:00", "17:00"),
  shift("2026-08-18", "09:00", "17:00"),
  shift("2026-08-19", "09:00", "17:00"),
  shift("2026-08-20", "09:00", "17:00"),
  shift("2026-08-21", "09:00", "19:00"),
];

const OVERTIME_ON = {
  enabled: true,
  thresholdMinutes: hours(40),
  multiplier: 1.5,
};

describe("the week as plain text", () => {
  it("says the week, the count, the hours and the money", () => {
    const shifts = [
      shift("2026-08-17", "16:00", "23:30"),
      shift("2026-08-18", "17:00", "22:45"),
    ];

    expect(formatWeekSummary(WEEK_START, summarizeShifts(shifts))).toBe(
      [
        "Wagez — Aug 16 – Aug 22",
        "",
        "2 shifts",
        "13h 15m",
        "$265.00 gross",
      ].join("\n"),
    );
  });

  it("counts one shift as a shift", () => {
    const totals = summarizeShifts([shift("2026-08-17", "09:00", "17:00")]);
    expect(formatWeekSummary(WEEK_START, totals)).toContain("1 shift\n");
  });

  it("leaves out the money when no shift in the week carried a rate", () => {
    const totals = summarizeShifts([
      shift("2026-08-17", "09:00", "17:00", null),
      shift("2026-08-18", "09:00", "17:00", null),
    ]);
    const text = formatWeekSummary(WEEK_START, totals);

    expect(text).toContain("16h");
    expect(text).not.toContain("$");
  });

  it("reports the hours that were actually paid, not the hours on the clock", () => {
    const totals = summarizeShifts([
      shift("2026-08-17", "09:00", "17:00", 2000, 30),
    ]);
    expect(formatWeekSummary(WEEK_START, totals)).toContain("7h 30m");
  });

  it("names the overtime split when there is overtime to report", () => {
    const totals = summarizeShifts(CROSSING_WEEK, OVERTIME_ON);

    expect(formatWeekSummary(WEEK_START, totals, OVERTIME_ON)).toBe(
      [
        "Wagez — Aug 16 – Aug 22",
        "",
        "5 shifts",
        "42h",
        "Regular 40h",
        "Overtime 2h at 1.5×",
        "$860.00 gross",
      ].join("\n"),
    );
  });

  it("says nothing about overtime while overtime is switched off", () => {
    const totals = summarizeShifts(CROSSING_WEEK);
    const text = formatWeekSummary(WEEK_START, totals);

    expect(text).not.toContain("Overtime");
    expect(text).not.toContain("Regular");
    expect(text).toContain("$840.00 gross");
  });

  it("says nothing about overtime in a week that never reached the threshold", () => {
    const shifts = CROSSING_WEEK.slice(0, 2);
    const totals = summarizeShifts(shifts, OVERTIME_ON);

    expect(formatWeekSummary(WEEK_START, totals, OVERTIME_ON)).not.toContain(
      "Overtime",
    );
  });

  it("has nothing to share for an empty week", () => {
    expect(formatWeekSummary(WEEK_START, summarizeShifts([]))).toBeNull();
  });

  it("has nothing to share for a week that is not a date", () => {
    const totals = summarizeShifts([shift("2026-08-17", "09:00", "17:00")]);
    expect(formatWeekSummary("not-a-date", totals)).toBeNull();
  });
});
