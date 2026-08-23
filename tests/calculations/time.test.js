import { describe, expect, it } from "vitest";

import {
  AM,
  MINUTES_PER_DAY,
  PM,
  calculateElapsedMinutes,
  createTime,
  crossesMidnight,
  from12Hour,
  isTime,
  minutesToTime,
  parseMinutes,
  parseTime,
  timeToMinutes,
  to12Hour,
} from "@/lib/calculations/time";

describe("isTime", () => {
  it("accepts canonical times", () => {
    expect(isTime("00:00")).toBe(true);
    expect(isTime("16:15")).toBe(true);
    expect(isTime("23:59")).toBe(true);
  });

  it("rejects anything that is not canonical", () => {
    expect(isTime("4:15")).toBe(false);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("16:60")).toBe(false);
    expect(isTime("4:15 PM")).toBe(false);
    expect(isTime(1615)).toBe(false);
    expect(isTime(null)).toBe(false);
  });
});

describe("createTime", () => {
  it("pads both parts", () => {
    expect(createTime(4, 5)).toBe("04:05");
    expect(createTime(0, 0)).toBe("00:00");
    expect(createTime(23, 59)).toBe("23:59");
  });

  it("rejects out-of-range and non-integer parts", () => {
    expect(createTime(24, 0)).toBeNull();
    expect(createTime(-1, 0)).toBeNull();
    expect(createTime(12, 60)).toBeNull();
    expect(createTime(12, -1)).toBeNull();
    expect(createTime(12.5, 0)).toBeNull();
  });
});

describe("from12Hour", () => {
  it("converts afternoon times", () => {
    expect(from12Hour(4, 15, PM)).toBe("16:15");
    expect(from12Hour(11, 47, PM)).toBe("23:47");
  });

  it("converts morning times", () => {
    expect(from12Hour(9, 0, AM)).toBe("09:00");
    expect(from12Hour(4, 15, AM)).toBe("04:15");
  });

  it("handles the two noons", () => {
    expect(from12Hour(12, 0, AM)).toBe("00:00");
    expect(from12Hour(12, 0, PM)).toBe("12:00");
    expect(from12Hour(12, 30, AM)).toBe("00:30");
  });

  it("accepts loose meridiem spellings", () => {
    expect(from12Hour(4, 15, "pm")).toBe("16:15");
    expect(from12Hour(4, 15, "p.m.")).toBe("16:15");
    expect(from12Hour(4, 15, "a")).toBe("04:15");
  });

  it("rejects an invalid 12-hour clock", () => {
    expect(from12Hour(0, 0, AM)).toBeNull();
    expect(from12Hour(13, 0, PM)).toBeNull();
    expect(from12Hour(4, 15, "xm")).toBeNull();
    expect(from12Hour(4, 60, PM)).toBeNull();
  });
});

describe("to12Hour", () => {
  it("splits a time into editable parts", () => {
    expect(to12Hour("16:15")).toEqual({ hour: 4, minute: 15, meridiem: PM });
    expect(to12Hour("00:00")).toEqual({ hour: 12, minute: 0, meridiem: AM });
    expect(to12Hour("12:00")).toEqual({ hour: 12, minute: 0, meridiem: PM });
    expect(to12Hour("09:05")).toEqual({ hour: 9, minute: 5, meridiem: AM });
  });

  it("round-trips through from12Hour", () => {
    for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += 1) {
      const time = minutesToTime(minutes);
      const parts = to12Hour(time);
      expect(from12Hour(parts.hour, parts.minute, parts.meridiem)).toBe(time);
    }
  });

  it("returns null for unreadable values", () => {
    expect(to12Hour("nope")).toBeNull();
  });
});

describe("parseTime", () => {
  it("passes canonical times through", () => {
    expect(parseTime("16:15")).toBe("16:15");
  });

  it("normalizes loose 24-hour strings", () => {
    expect(parseTime("9:05")).toBe("09:05");
    expect(parseTime(" 9:05 ")).toBe("09:05");
  });

  it("understands 12-hour strings", () => {
    expect(parseTime("4:15 PM")).toBe("16:15");
    expect(parseTime("4:15pm")).toBe("16:15");
    expect(parseTime("11:47 p.m.")).toBe("23:47");
    expect(parseTime("12:00 AM")).toBe("00:00");
    expect(parseTime("7 AM")).toBe("07:00");
  });

  it("understands part objects", () => {
    expect(parseTime({ hour: 16, minute: 15 })).toBe("16:15");
    expect(parseTime({ hour: 4, minute: 15, meridiem: PM })).toBe("16:15");
  });

  it("returns null for blank or unreadable values", () => {
    expect(parseTime("")).toBeNull();
    expect(parseTime("   ")).toBeNull();
    expect(parseTime(null)).toBeNull();
    expect(parseTime(undefined)).toBeNull();
    expect(parseTime(1615)).toBeNull();
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("12:75")).toBeNull();
    expect(parseTime("half past four")).toBeNull();
  });
});

describe("timeToMinutes / minutesToTime", () => {
  it("converts to minutes since midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:15")).toBe(555);
    expect(timeToMinutes("4:15 PM")).toBe(975);
    expect(timeToMinutes("23:59")).toBe(1439);
    expect(timeToMinutes("nope")).toBeNull();
  });

  it("converts back, wrapping across day boundaries", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(975)).toBe("16:15");
    expect(minutesToTime(MINUTES_PER_DAY)).toBe("00:00");
    expect(minutesToTime(-60)).toBe("23:00");
    expect(minutesToTime(1.5)).toBeNull();
  });
});

describe("parseMinutes", () => {
  it("accepts whole non-negative minute counts", () => {
    expect(parseMinutes(0)).toBe(0);
    expect(parseMinutes(30)).toBe(30);
    expect(parseMinutes("45")).toBe(45);
    expect(parseMinutes(" 60 ")).toBe(60);
  });

  it("rejects negatives, fractions and nonsense", () => {
    expect(parseMinutes(-1)).toBeNull();
    expect(parseMinutes("-15")).toBeNull();
    expect(parseMinutes(15.5)).toBeNull();
    expect(parseMinutes("15.5")).toBeNull();
    expect(parseMinutes("")).toBeNull();
    expect(parseMinutes("half an hour")).toBeNull();
    expect(parseMinutes(null)).toBeNull();
  });
});

describe("calculateElapsedMinutes", () => {
  it("measures a normal shift", () => {
    expect(calculateElapsedMinutes("09:00", "17:00")).toBe(480);
  });

  it("measures a partial hour", () => {
    expect(calculateElapsedMinutes("09:15", "17:45")).toBe(510);
  });

  it("measures an overnight shift", () => {
    expect(calculateElapsedMinutes("22:00", "03:00")).toBe(300);
  });

  it("measures up to midnight", () => {
    expect(calculateElapsedMinutes("23:00", "00:00")).toBe(60);
  });

  it("measures from midnight", () => {
    expect(calculateElapsedMinutes("00:00", "08:00")).toBe(480);
  });

  it("measures across noon", () => {
    expect(calculateElapsedMinutes("12:00", "13:00")).toBe(60);
  });

  it("never returns a negative duration", () => {
    for (let start = 0; start < MINUTES_PER_DAY; start += 37) {
      for (let end = 0; end < MINUTES_PER_DAY; end += 53) {
        const elapsed = calculateElapsedMinutes(
          minutesToTime(start),
          minutesToTime(end),
        );
        expect(elapsed).toBeGreaterThanOrEqual(0);
        expect(elapsed).toBeLessThan(MINUTES_PER_DAY);
      }
    }
  });

  it("returns 0 rather than 24 hours for identical times", () => {
    expect(calculateElapsedMinutes("09:00", "09:00")).toBe(0);
  });

  it("returns null when a time is unreadable", () => {
    expect(calculateElapsedMinutes("nope", "17:00")).toBeNull();
    expect(calculateElapsedMinutes("09:00", null)).toBeNull();
  });
});

describe("crossesMidnight", () => {
  it("is true only when the end time comes first", () => {
    expect(crossesMidnight("22:00", "03:00")).toBe(true);
    expect(crossesMidnight("23:00", "00:00")).toBe(true);
    expect(crossesMidnight("09:00", "17:00")).toBe(false);
    expect(crossesMidnight("09:00", "09:00")).toBe(false);
    expect(crossesMidnight("nope", "17:00")).toBe(false);
  });
});
