import { describe, expect, it } from "vitest";

import { AM, PM } from "@/lib/calculations/time";
import {
  EMPTY_PARTS,
  QUICK_MINUTES,
  normalizeParts,
  otherMeridiem,
  partsToTime,
  stepHour,
  stepMinute,
  toParts,
  typeHour,
  typeMinute,
} from "@/lib/timeEntry";

describe("toParts", () => {
  it("splits a canonical time into editable segments", () => {
    expect(toParts("16:15")).toEqual({ hour: "4", minute: "15", meridiem: PM });
    expect(toParts("09:05")).toEqual({ hour: "9", minute: "05", meridiem: AM });
  });

  it("handles both noons", () => {
    expect(toParts("00:00")).toEqual({
      hour: "12",
      minute: "00",
      meridiem: AM,
    });
    expect(toParts("12:00")).toEqual({
      hour: "12",
      minute: "00",
      meridiem: PM,
    });
  });

  it("leaves the segments empty for a time nobody has entered", () => {
    expect(toParts("")).toEqual(EMPTY_PARTS);
    expect(toParts("nonsense")).toEqual(EMPTY_PARTS);
  });
});

describe("partsToTime", () => {
  it("composes a canonical time", () => {
    expect(partsToTime({ hour: "4", minute: "15", meridiem: PM })).toBe(
      "16:15",
    );
    expect(partsToTime({ hour: "12", minute: "00", meridiem: AM })).toBe(
      "00:00",
    );
  });

  it("round-trips every minute of the day", () => {
    for (let minutes = 0; minutes < 24 * 60; minutes += 1) {
      const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
        minutes % 60,
      ).padStart(2, "0")}`;
      expect(partsToTime(toParts(time))).toBe(time);
    }
  });

  it("publishes nothing while a segment is still missing", () => {
    expect(partsToTime({ hour: "4", minute: "", meridiem: PM })).toBe("");
    expect(partsToTime({ hour: "", minute: "15", meridiem: PM })).toBe("");
    expect(partsToTime({ hour: "0", minute: "15", meridiem: PM })).toBe("");
  });
});

describe("typeHour", () => {
  it("takes a single digit and waits when it could still grow", () => {
    expect(typeHour("1", AM)).toEqual({ hour: "1", meridiem: AM, done: false });
    expect(typeHour("0", AM)).toEqual({ hour: "0", meridiem: AM, done: false });
  });

  it("finishes the segment on a digit that cannot be extended", () => {
    expect(typeHour("4", AM)).toEqual({ hour: "4", meridiem: AM, done: true });
    expect(typeHour("9", PM)).toEqual({ hour: "9", meridiem: PM, done: true });
  });

  it("accepts a second digit up to twelve", () => {
    expect(typeHour("10", AM)).toEqual({
      hour: "10",
      meridiem: AM,
      done: true,
    });
    expect(typeHour("12", AM)).toEqual({
      hour: "12",
      meridiem: AM,
      done: true,
    });
    expect(typeHour("04", PM)).toEqual({ hour: "4", meridiem: PM, done: true });
  });

  it("reads a 24-hour value as the same time in the afternoon", () => {
    expect(typeHour("16", AM)).toEqual({ hour: "4", meridiem: PM, done: true });
    expect(typeHour("23", AM)).toEqual({
      hour: "11",
      meridiem: PM,
      done: true,
    });
    expect(typeHour("13", AM)).toEqual({ hour: "1", meridiem: PM, done: true });
  });

  it("reads 00 as midnight's twelve", () => {
    expect(typeHour("00", PM)).toEqual({
      hour: "12",
      meridiem: AM,
      done: true,
    });
  });

  it("starts over when the digits stop meaning an hour", () => {
    expect(typeHour("45", AM)).toEqual({ hour: "5", meridiem: AM, done: true });
    // A third digit means the user is retyping the segment.
    expect(typeHour("124", AM)).toEqual({
      hour: "4",
      meridiem: AM,
      done: true,
    });
    expect(typeHour("121", AM)).toEqual({
      hour: "1",
      meridiem: AM,
      done: false,
    });
  });

  it("ignores anything that is not a digit", () => {
    expect(typeHour("", AM)).toEqual({ hour: "", meridiem: AM, done: false });
    expect(typeHour("abc", AM)).toEqual({
      hour: "",
      meridiem: AM,
      done: false,
    });
    expect(typeHour("4:", AM)).toEqual({ hour: "4", meridiem: AM, done: true });
  });
});

describe("typeMinute", () => {
  it("waits on a digit that could still grow", () => {
    expect(typeMinute("1")).toEqual({ minute: "1", done: false });
    expect(typeMinute("5")).toEqual({ minute: "5", done: false });
  });

  it("finishes on a digit that cannot start a minute", () => {
    expect(typeMinute("6")).toEqual({ minute: "6", done: true });
    expect(typeMinute("9")).toEqual({ minute: "9", done: true });
  });

  it("accepts every minute of the hour", () => {
    for (let minute = 0; minute < 60; minute += 1) {
      const typed = String(minute).padStart(2, "0");
      expect(typeMinute(typed)).toEqual({ minute: typed, done: true });
    }
  });

  it("starts over when the digits stop meaning a minute", () => {
    expect(typeMinute("60")).toEqual({ minute: "0", done: false });
    expect(typeMinute("99")).toEqual({ minute: "9", done: true });
    expect(typeMinute("157")).toEqual({ minute: "7", done: true });
  });

  it("ignores anything that is not a digit", () => {
    expect(typeMinute("")).toEqual({ minute: "", done: false });
    expect(typeMinute("--")).toEqual({ minute: "", done: false });
  });
});

describe("stepHour", () => {
  it("nudges by one", () => {
    expect(stepHour("4", 1)).toBe("5");
    expect(stepHour("4", -1)).toBe("3");
  });

  it("wraps around the twelve-hour clock", () => {
    expect(stepHour("12", 1)).toBe("1");
    expect(stepHour("1", -1)).toBe("12");
  });

  it("starts somewhere sensible from empty", () => {
    expect(stepHour("", 1)).toBe("1");
    expect(stepHour("", -1)).toBe("12");
  });
});

describe("stepMinute", () => {
  it("nudges by one, staying padded", () => {
    expect(stepMinute("15", 1)).toBe("16");
    expect(stepMinute("00", 1)).toBe("01");
    expect(stepMinute("10", -1)).toBe("09");
  });

  it("wraps around the hour", () => {
    expect(stepMinute("59", 1)).toBe("00");
    expect(stepMinute("00", -1)).toBe("59");
  });

  it("starts somewhere sensible from empty", () => {
    expect(stepMinute("", 1)).toBe("00");
    expect(stepMinute("", -1)).toBe("59");
  });
});

describe("otherMeridiem", () => {
  it("flips the half of the day", () => {
    expect(otherMeridiem(AM)).toBe(PM);
    expect(otherMeridiem(PM)).toBe(AM);
  });
});

describe("normalizeParts", () => {
  it("pads a single-digit minute", () => {
    expect(normalizeParts({ hour: "4", minute: "5", meridiem: PM })).toEqual({
      hour: "4",
      minute: "05",
      meridiem: PM,
    });
  });

  it("reads a lone zero hour as midnight's twelve", () => {
    expect(normalizeParts({ hour: "0", minute: "30", meridiem: PM })).toEqual({
      hour: "12",
      minute: "30",
      meridiem: AM,
    });
  });

  it("leaves finished segments alone", () => {
    const parts = { hour: "11", minute: "47", meridiem: PM };
    expect(normalizeParts(parts)).toEqual(parts);
    expect(normalizeParts(EMPTY_PARTS)).toEqual(EMPTY_PARTS);
  });
});

describe("QUICK_MINUTES", () => {
  it("offers the quarter hours", () => {
    expect(QUICK_MINUTES).toEqual(["00", "15", "30", "45"]);
  });
});
