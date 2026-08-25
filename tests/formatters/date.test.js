import { describe, expect, it } from "vitest";

import {
  formatShiftDay,
  formatWeekRange,
  formatWeekday,
} from "@/lib/formatters/date";

describe("formatShiftDay", () => {
  it("reads as a day, not a timestamp", () => {
    expect(formatShiftDay("2026-08-17")).toBe("Mon · Aug 17");
    expect(formatShiftDay("2026-01-03")).toBe("Sat · Jan 3");
  });

  it("does not drift a day in a negative timezone", () => {
    // A stored date has no time of day, so it must be read as itself rather
    // than as midnight somewhere else.
    expect(formatShiftDay("2026-08-16")).toBe("Sun · Aug 16");
  });

  it("has nothing to say about a non-date", () => {
    expect(formatShiftDay("Monday")).toBeNull();
    expect(formatShiftDay("")).toBeNull();
  });
});

describe("formatWeekday", () => {
  it("is just the day of the week", () => {
    expect(formatWeekday("2026-08-17")).toBe("Mon");
    expect(formatWeekday("nope")).toBeNull();
  });
});

describe("formatWeekRange", () => {
  it("spans the seven days from the start", () => {
    expect(formatWeekRange("2026-08-16")).toBe("Aug 16 – Aug 22");
  });

  it("crosses a month without complaint", () => {
    expect(formatWeekRange("2026-08-30")).toBe("Aug 30 – Sep 5");
  });

  it("has nothing to say about a non-date", () => {
    expect(formatWeekRange("nope")).toBeNull();
  });
});
