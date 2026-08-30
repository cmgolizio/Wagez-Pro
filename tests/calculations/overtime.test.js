import { describe, expect, it } from "vitest";

import {
  DEFAULT_MULTIPLIER,
  DEFAULT_OVERTIME,
  DEFAULT_THRESHOLD_MINUTES,
  allocateOvertime,
  normalizeOvertime,
  parseMultiplier,
  parseThresholdMinutes,
} from "@/lib/calculations/overtime";

/** Overtime as somebody who has turned it on has it: 40 hours, time and a half. */
const ON = { enabled: true, thresholdMinutes: 2400, multiplier: 1.5 };

/** A worked shift, as the allocator reads one. */
const worked = (hours, hourlyRateCents = 2000) => ({
  paidMinutes: Math.round(hours * 60),
  hourlyRateCents,
});

const minutes = (allocation) =>
  allocation.map(({ regularMinutes, overtimeMinutes }) => [
    regularMinutes,
    overtimeMinutes,
  ]);

describe("settings", () => {
  it("is off, at forty hours and one and a half times, until told otherwise", () => {
    expect(DEFAULT_OVERTIME).toEqual({
      enabled: false,
      thresholdMinutes: 2400,
      multiplier: 1.5,
    });
    expect(DEFAULT_THRESHOLD_MINUTES).toBe(2400);
    expect(DEFAULT_MULTIPLIER).toBe(1.5);
  });

  it("keeps settings it can read", () => {
    expect(normalizeOvertime(ON)).toEqual(ON);
  });

  it("falls back to the defaults for anything it cannot", () => {
    expect(normalizeOvertime(null)).toEqual(DEFAULT_OVERTIME);
    expect(normalizeOvertime("nope")).toEqual(DEFAULT_OVERTIME);
    expect(normalizeOvertime({}).thresholdMinutes).toBe(2400);
    expect(normalizeOvertime({ thresholdMinutes: -60 }).thresholdMinutes).toBe(
      2400,
    );
    expect(normalizeOvertime({ thresholdMinutes: 0 }).thresholdMinutes).toBe(
      2400,
    );
    expect(normalizeOvertime({ multiplier: 0.5 }).multiplier).toBe(1.5);
    expect(normalizeOvertime({ multiplier: "lots" }).multiplier).toBe(1.5);
  });

  it("only counts overtime when it has actually been switched on", () => {
    expect(normalizeOvertime({ enabled: "yes" }).enabled).toBe(false);
    expect(normalizeOvertime({ enabled: true }).enabled).toBe(true);
  });
});

describe("reading a threshold", () => {
  it("takes hours in a week and keeps minutes", () => {
    expect(parseThresholdMinutes("40")).toBe(2400);
    expect(parseThresholdMinutes("37.5")).toBe(2250);
    expect(parseThresholdMinutes(44)).toBe(2640);
  });

  it("refuses what is not a week's worth of hours", () => {
    expect(parseThresholdMinutes("")).toBeNull();
    expect(parseThresholdMinutes("forty")).toBeNull();
    expect(parseThresholdMinutes("-40")).toBeNull();
    expect(parseThresholdMinutes("0")).toBeNull();
    // More hours than there are in a week.
    expect(parseThresholdMinutes("169")).toBeNull();
  });
});

describe("reading a multiplier", () => {
  it("takes what overtime pays against the rate", () => {
    expect(parseMultiplier("1.5")).toBe(1.5);
    expect(parseMultiplier("2")).toBe(2);
    expect(parseMultiplier(1.75)).toBe(1.75);
  });

  it("refuses a multiplier that would pay less than the rate", () => {
    expect(parseMultiplier("0.5")).toBeNull();
    expect(parseMultiplier("0")).toBeNull();
    expect(parseMultiplier("-2")).toBeNull();
    expect(parseMultiplier("11")).toBeNull();
    expect(parseMultiplier("double")).toBeNull();
  });
});

describe("overtime switched off", () => {
  it("counts every minute as a regular minute", () => {
    const allocation = allocateOvertime([worked(40), worked(8)]);

    expect(minutes(allocation)).toEqual([
      [2400, 0],
      [480, 0],
    ]);
  });

  it("pays exactly what the shifts are worth without it", () => {
    const allocation = allocateOvertime([worked(40), worked(8)]);

    expect(allocation.map((entry) => entry.payCents)).toEqual([80000, 16000]);
  });

  it("ignores a threshold it has been given but not switched on", () => {
    const off = { enabled: false, thresholdMinutes: 60, multiplier: 3 };

    expect(allocateOvertime([worked(8)], off)).toEqual([
      {
        regularMinutes: 480,
        overtimeMinutes: 0,
        regularPayCents: 16000,
        overtimePayCents: 0,
        payCents: 16000,
      },
    ]);
  });
});

describe("overtime switched on", () => {
  it("counts exactly the threshold as regular time", () => {
    // Five eight-hour days: forty hours, and not a minute of overtime.
    const week = [worked(8), worked(8), worked(8), worked(8), worked(8)];
    const allocation = allocateOvertime(week, ON);

    expect(allocation.reduce((sum, e) => sum + e.regularMinutes, 0)).toBe(2400);
    expect(allocation.reduce((sum, e) => sum + e.overtimeMinutes, 0)).toBe(0);
  });

  it("counts the hour past the threshold as overtime", () => {
    const allocation = allocateOvertime([worked(40), worked(1)], ON);

    expect(minutes(allocation)).toEqual([
      [2400, 0],
      [0, 60],
    ]);
  });

  it("splits the shift the threshold falls in the middle of", () => {
    // Thirty-eight hours already worked, then an eight-hour Friday.
    const allocation = allocateOvertime([worked(38), worked(8)], ON);

    expect(minutes(allocation)).toEqual([
      [2280, 0],
      [120, 360],
    ]);
  });

  it("pays the split shift two regular hours and six at time and a half", () => {
    const [, friday] = allocateOvertime([worked(38), worked(8)], ON);

    // 2 × $20 + 6 × $20 × 1.5 = $40 + $180.
    expect(friday.regularPayCents).toBe(4000);
    expect(friday.overtimePayCents).toBe(18000);
    expect(friday.payCents).toBe(22000);
  });

  it("pays overtime at the rate of the shift the overtime happened at", () => {
    // Forty hours at $20, then a shift at $30 that is entirely overtime.
    const [, second] = allocateOvertime(
      [worked(40, 2000), worked(4, 3000)],
      ON,
    );

    expect(second.overtimeMinutes).toBe(240);
    // 4 × $30 × 1.5, not four hours at anybody else's rate.
    expect(second.payCents).toBe(18000);
  });

  it("keeps each shift's own rate on both sides of the threshold", () => {
    const [, crossing] = allocateOvertime(
      [worked(38, 2000), worked(8, 3000)],
      ON,
    );

    // 2 × $30 + 6 × $30 × 1.5.
    expect(crossing.regularPayCents).toBe(6000);
    expect(crossing.overtimePayCents).toBe(27000);
  });

  it("does not count an unpaid break towards the threshold", () => {
    // Five nine-hour days with an hour unpaid in each: forty paid hours.
    const week = Array.from({ length: 5 }, () => worked(8));
    const allocation = allocateOvertime(week, ON);

    expect(allocation.every((entry) => entry.overtimeMinutes === 0)).toBe(true);
    // The same five days without the breaks would have crossed it.
    const unbroken = allocateOvertime(
      Array.from({ length: 5 }, () => worked(9)),
      ON,
    );
    expect(unbroken.reduce((sum, e) => sum + e.overtimeMinutes, 0)).toBe(300);
  });

  it("follows a different threshold and multiplier", () => {
    const [shift] = allocateOvertime([worked(10)], {
      enabled: true,
      thresholdMinutes: 480,
      multiplier: 2,
    });

    expect(minutes([shift])).toEqual([[480, 120]]);
    // 8 × $20 + 2 × $20 × 2.
    expect(shift.payCents).toBe(16000 + 8000);
  });

  it("counts a rateless shift's hours without inventing money for them", () => {
    const [rateless, paid] = allocateOvertime(
      [{ paidMinutes: 2400, hourlyRateCents: null }, worked(8)],
      ON,
    );

    expect(rateless.payCents).toBeNull();
    // Its hours still filled the threshold, so the paid shift is all overtime.
    expect(paid.overtimeMinutes).toBe(480);
    expect(paid.payCents).toBe(24000);
  });

  it("adds its two halves up to the shift's pay exactly", () => {
    const allocation = allocateOvertime(
      [worked(39, 1733), worked(7, 1733)],
      ON,
    );

    for (const entry of allocation) {
      expect(entry.regularPayCents + entry.overtimePayCents).toBe(
        entry.payCents,
      );
    }
  });
});
