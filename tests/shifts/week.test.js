import { describe, expect, it } from "vitest";

import { MONDAY } from "@/lib/dates/isoDate";
import {
  allocateShifts,
  groupShiftsByWeek,
  shiftsForWeek,
  sortShifts,
  summarizeShifts,
} from "@/lib/shifts/week";

/** A saved shift, with only the fields a week actually reads. */
function shift(id, date, startTime, endTime, extra = {}) {
  return {
    id,
    date,
    startTime,
    endTime,
    hourlyRateCents: 2000,
    breakMinutes: 0,
    createdAt: `2026-08-17T00:00:0${id}.000Z`,
    updatedAt: `2026-08-17T00:00:0${id}.000Z`,
    ...extra,
  };
}

// A week that runs Sunday 16 August to Saturday 22 August 2026.
const MONDAY_SHIFT = shift("1", "2026-08-17", "16:00", "23:30");
const WEDNESDAY_SHIFT = shift("2", "2026-08-19", "17:00", "22:45");
const TUESDAY_SHIFT = shift("3", "2026-08-18", "09:00", "17:00");

describe("sortShifts", () => {
  it("puts shifts in the order they were worked, not saved", () => {
    const sorted = sortShifts([WEDNESDAY_SHIFT, MONDAY_SHIFT, TUESDAY_SHIFT]);

    expect(sorted.map((entry) => entry.date)).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
    ]);
  });

  it("sorts two shifts on one day by when they started", () => {
    const evening = shift("4", "2026-08-17", "18:00", "22:00");
    const morning = shift("5", "2026-08-17", "08:00", "12:00");

    expect(sortShifts([evening, morning]).map((entry) => entry.id)).toEqual([
      "5",
      "4",
    ]);
  });

  it("leaves the shifts it was given alone", () => {
    const shifts = [WEDNESDAY_SHIFT, MONDAY_SHIFT];
    sortShifts(shifts);

    expect(shifts[0]).toBe(WEDNESDAY_SHIFT);
  });
});

describe("shiftsForWeek", () => {
  const lastWeek = shift("6", "2026-08-14", "09:00", "17:00");
  const nextWeek = shift("7", "2026-08-23", "09:00", "17:00");
  const shifts = [nextWeek, WEDNESDAY_SHIFT, lastWeek, MONDAY_SHIFT];

  it("keeps the seven days that begin the week, in order", () => {
    expect(
      shiftsForWeek(shifts, "2026-08-16").map((entry) => entry.date),
    ).toEqual(["2026-08-17", "2026-08-19"]);
  });

  it("excludes the days on either side of it", () => {
    const week = shiftsForWeek(shifts, "2026-08-16");

    expect(week.some((entry) => entry.id === lastWeek.id)).toBe(false);
    expect(week.some((entry) => entry.id === nextWeek.id)).toBe(false);
  });

  it("includes both ends of the week", () => {
    const sunday = shift("8", "2026-08-16", "09:00", "17:00");
    const saturday = shift("9", "2026-08-22", "09:00", "17:00");

    expect(
      shiftsForWeek([saturday, sunday], "2026-08-16").map((e) => e.id),
    ).toEqual(["8", "9"]);
  });
});

describe("groupShiftsByWeek", () => {
  const lastWeek = shift("6", "2026-08-14", "09:00", "17:00");

  it("gathers shifts into weeks, most recent first", () => {
    const weeks = groupShiftsByWeek([lastWeek, MONDAY_SHIFT, WEDNESDAY_SHIFT]);

    expect(weeks.map((week) => week.weekStart)).toEqual([
      "2026-08-16",
      "2026-08-09",
    ]);
    expect(weeks[0].shifts.map((entry) => entry.date)).toEqual([
      "2026-08-17",
      "2026-08-19",
    ]);
  });

  it("follows the week boundary it is given", () => {
    const sunday = shift("8", "2026-08-16", "09:00", "17:00");
    // Weeks starting Monday put that Sunday in the week before Monday's.
    const weeks = groupShiftsByWeek([sunday, MONDAY_SHIFT], MONDAY);

    expect(weeks.map((week) => week.weekStart)).toEqual([
      "2026-08-17",
      "2026-08-10",
    ]);
  });
});

describe("summarizeShifts", () => {
  it("counts the shifts and adds up their time and money", () => {
    // 7h30m at $20, 8h at $20, 5h45m at $20.
    const totals = summarizeShifts([
      MONDAY_SHIFT,
      TUESDAY_SHIFT,
      WEDNESDAY_SHIFT,
    ]);

    expect(totals.shiftCount).toBe(3);
    expect(totals.paidMinutes).toBe(450 + 480 + 345);
    expect(totals.elapsedMinutes).toBe(1275);
    expect(totals.payCents).toBe(15000 + 16000 + 11500);
  });

  it("adds up different rates separately", () => {
    const totals = summarizeShifts([
      shift("1", "2026-08-17", "09:00", "17:00"),
      shift("2", "2026-08-18", "09:00", "17:00", { hourlyRateCents: 3050 }),
    ]);

    expect(totals.paidMinutes).toBe(960);
    expect(totals.payCents).toBe(16000 + 24400);
  });

  it("keeps an overnight shift the right length", () => {
    const overnight = shift("1", "2026-08-17", "22:00", "03:00");

    expect(summarizeShifts([overnight]).paidMinutes).toBe(300);
    expect(summarizeShifts([overnight]).payCents).toBe(10000);
  });

  it("takes unpaid breaks out of the paid total", () => {
    const totals = summarizeShifts([
      shift("1", "2026-08-17", "09:00", "17:00", { breakMinutes: 30 }),
      shift("2", "2026-08-18", "09:00", "17:00", { breakMinutes: 45 }),
    ]);

    expect(totals.elapsedMinutes).toBe(960);
    expect(totals.breakMinutes).toBe(75);
    expect(totals.paidMinutes).toBe(885);
    expect(totals.payCents).toBe(29500);
  });

  it("reports hours and no money when nothing carries a rate", () => {
    const totals = summarizeShifts([
      shift("1", "2026-08-17", "09:00", "17:00", { hourlyRateCents: null }),
    ]);

    expect(totals.paidMinutes).toBe(480);
    expect(totals.payCents).toBeNull();
  });

  it("counts the money of the shifts that do have a rate", () => {
    const totals = summarizeShifts([
      shift("1", "2026-08-17", "09:00", "17:00", { hourlyRateCents: null }),
      shift("2", "2026-08-18", "09:00", "17:00"),
    ]);

    expect(totals.shiftCount).toBe(2);
    expect(totals.payCents).toBe(16000);
  });

  it("is empty for an empty week", () => {
    expect(summarizeShifts([])).toEqual({
      shiftCount: 0,
      elapsedMinutes: 0,
      breakMinutes: 0,
      paidMinutes: 0,
      regularMinutes: 0,
      overtimeMinutes: 0,
      payCents: null,
      regularPayCents: null,
      overtimePayCents: null,
    });
  });

  it("skips a shift it cannot make sense of", () => {
    const broken = { ...MONDAY_SHIFT, startTime: "nope" };

    expect(summarizeShifts([broken, TUESDAY_SHIFT]).shiftCount).toBe(1);
    expect(summarizeShifts([broken, TUESDAY_SHIFT]).payCents).toBe(16000);
  });
});

/** A week that has overtime switched on, at the usual forty hours and 1.5×. */
const OVERTIME = { enabled: true, thresholdMinutes: 2400, multiplier: 1.5 };

/** Eight hours at $20, on the nth day of the week beginning Sunday 16 August. */
const day = (id, offset, extra = {}) =>
  shift(id, `2026-08-${16 + offset}`, "09:00", "17:00", extra);

/** Five eight-hour days, Monday to Friday: forty hours exactly. */
const fortyHours = [
  day("1", 1),
  day("2", 2),
  day("3", 3),
  day("4", 4),
  day("5", 5),
];

describe("a week with overtime", () => {
  it("changes nothing at all while it is switched off", () => {
    const week = [...fortyHours, day("6", 6)];

    expect(summarizeShifts(week)).toEqual(summarizeShifts(week, undefined));
    expect(summarizeShifts(week).payCents).toBe(48 * 2000);
    expect(summarizeShifts(week).overtimeMinutes).toBe(0);
  });

  it("reaches the threshold without going over it", () => {
    const totals = summarizeShifts(fortyHours, OVERTIME);

    expect(totals.regularMinutes).toBe(2400);
    expect(totals.overtimeMinutes).toBe(0);
    expect(totals.payCents).toBe(80000);
  });

  it("pays the hours past the threshold at the multiplier", () => {
    // A sixth eight-hour day: forty regular hours and eight overtime.
    const totals = summarizeShifts([...fortyHours, day("6", 6)], OVERTIME);

    expect(totals.regularMinutes).toBe(2400);
    expect(totals.overtimeMinutes).toBe(480);
    // $800 + 8 × $20 × 1.5.
    expect(totals.regularPayCents).toBe(80000);
    expect(totals.overtimePayCents).toBe(24000);
    expect(totals.payCents).toBe(104000);
  });

  it("counts the week in the order it was worked, not the order it was saved", () => {
    const week = [day("6", 6, { hourlyRateCents: 3000 }), ...fortyHours];

    // The Saturday is the shift that crosses the threshold wherever it sits in
    // the array, so it is the one paid at time and a half.
    const [last] = allocateShifts(week, OVERTIME).slice(-1);
    expect(last.shift.id).toBe("6");
    expect(last.pay.overtimeMinutes).toBe(480);
    expect(summarizeShifts(week, OVERTIME).overtimePayCents).toBe(36000);
  });

  it("splits the shift the threshold falls in the middle of", () => {
    // Four eight-hour days is thirty-two hours; the six-hour Friday crosses.
    const week = [
      day("1", 1),
      day("2", 2),
      day("3", 3),
      day("4", 4),
      shift("5", "2026-08-21", "09:00", "19:00"),
    ];

    const friday = allocateShifts(week, OVERTIME).at(-1);
    expect(friday.pay.regularMinutes).toBe(480);
    expect(friday.pay.overtimeMinutes).toBe(120);
    // 8 × $20 + 2 × $20 × 1.5.
    expect(friday.pay.payCents).toBe(16000 + 6000);
  });

  it("keeps unpaid breaks out of the threshold", () => {
    // Five nine-hour days with an hour unpaid in each: forty hours paid.
    const week = fortyHours.map((entry, index) =>
      shift(String(index + 1), entry.date, "09:00", "19:00", {
        breakMinutes: 120,
      }),
    );

    const totals = summarizeShifts(week, OVERTIME);
    expect(totals.elapsedMinutes).toBe(3000);
    expect(totals.breakMinutes).toBe(600);
    expect(totals.paidMinutes).toBe(2400);
    expect(totals.overtimeMinutes).toBe(0);
    expect(totals.payCents).toBe(80000);
  });

  it("pays each shift's overtime at that shift's own rate", () => {
    const week = [...fortyHours, day("6", 6, { hourlyRateCents: 4000 })];
    const totals = summarizeShifts(week, OVERTIME);

    // 8 × $40 × 1.5, at the rate of the day the overtime was worked.
    expect(totals.overtimePayCents).toBe(48000);
    expect(totals.payCents).toBe(80000 + 48000);
  });

  it("adds the halves of every shift up to the week's own total", () => {
    const totals = summarizeShifts([...fortyHours, day("6", 6)], OVERTIME);

    expect(totals.regularPayCents + totals.overtimePayCents).toBe(
      totals.payCents,
    );
    expect(totals.regularMinutes + totals.overtimeMinutes).toBe(
      totals.paidMinutes,
    );
  });
});
