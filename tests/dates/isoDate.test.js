import { describe, expect, it } from "vitest";

import { addDays, isIsoDate } from "@/lib/dates/isoDate";

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
