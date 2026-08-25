import { describe, expect, it } from "vitest";

import {
  MONDAY,
  SUNDAY,
  addDays,
  dayOfWeek,
  endOfWeek,
  isIsoDate,
  startOfWeek,
  todayIsoDate,
} from "@/lib/dates/isoDate";

describe("isIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(isIsoDate("2026-08-17")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-12-31")).toBe(true);
  });

  it("rejects impossible or malformed dates", () => {
    expect(isIsoDate("2025-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-00-10")).toBe(false);
    expect(isIsoDate("2026-08-32")).toBe(false);
    expect(isIsoDate("2026-8-17")).toBe(false);
    expect(isIsoDate("08/17/2026")).toBe(false);
    expect(isIsoDate("Monday")).toBe(false);
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});

describe("addDays", () => {
  it("moves forward and backward", () => {
    expect(addDays("2026-08-17", 1)).toBe("2026-08-18");
    expect(addDays("2026-08-17", 0)).toBe("2026-08-17");
    expect(addDays("2026-08-17", -1)).toBe("2026-08-16");
  });

  it("rolls over month and year boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("rejects invalid input", () => {
    expect(addDays("nope", 1)).toBeNull();
    expect(addDays("2026-08-17", 1.5)).toBeNull();
  });
});

describe("todayIsoDate", () => {
  it("reads the user's own calendar, not UTC's", () => {
    // Late evening in a negative offset is already tomorrow in UTC; Wagez has
    // to agree with the wall the user is looking at.
    const evening = new Date(2026, 7, 17, 23, 30);

    expect(todayIsoDate(evening)).toBe("2026-08-17");
  });

  it("pads months and days", () => {
    expect(todayIsoDate(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("answers with a real date when asked for now", () => {
    expect(isIsoDate(todayIsoDate())).toBe(true);
  });
});

describe("dayOfWeek", () => {
  it("counts from Sunday", () => {
    expect(dayOfWeek("2026-08-16")).toBe(0);
    expect(dayOfWeek("2026-08-17")).toBe(1);
    expect(dayOfWeek("2026-08-22")).toBe(6);
  });

  it("rejects anything that is not a date", () => {
    expect(dayOfWeek("Monday")).toBeNull();
  });
});

describe("startOfWeek", () => {
  it("goes back to the most recent Sunday by default", () => {
    expect(startOfWeek("2026-08-17")).toBe("2026-08-16");
    expect(startOfWeek("2026-08-22")).toBe("2026-08-16");
    expect(startOfWeek("2026-08-16")).toBe("2026-08-16");
  });

  it("goes back to the most recent Monday when weeks start there", () => {
    expect(startOfWeek("2026-08-17", MONDAY)).toBe("2026-08-17");
    expect(startOfWeek("2026-08-22", MONDAY)).toBe("2026-08-17");
    // Sunday belongs to the week that began the Monday before it.
    expect(startOfWeek("2026-08-16", MONDAY)).toBe("2026-08-10");
  });

  it("crosses month and year boundaries", () => {
    expect(startOfWeek("2026-09-01", SUNDAY)).toBe("2026-08-30");
    expect(startOfWeek("2027-01-01", SUNDAY)).toBe("2026-12-27");
  });

  it("rejects anything that is not a date", () => {
    expect(startOfWeek("nope")).toBeNull();
  });
});

describe("endOfWeek", () => {
  it("is six days after the start", () => {
    expect(endOfWeek("2026-08-16")).toBe("2026-08-22");
    expect(endOfWeek("2026-08-30")).toBe("2026-09-05");
  });
});
