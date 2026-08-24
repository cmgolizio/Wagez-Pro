import { describe, expect, it } from "vitest";

import {
  MESSAGES,
  isBlank,
  validateShiftInput,
} from "@/lib/calculations/validation";

const shift = { startTime: "09:00", endTime: "17:00" };

describe("isBlank", () => {
  it("treats empty input as unfilled", () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank("")).toBe(true);
    expect(isBlank("   ")).toBe(true);
  });

  it("treats real values as filled", () => {
    expect(isBlank(0)).toBe(false);
    expect(isBlank("0")).toBe(false);
    expect(isBlank("09:00")).toBe(false);
  });
});

describe("validateShiftInput — times", () => {
  it("accepts a start and a stop", () => {
    const validation = validateShiftInput(shift);
    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual({});
    expect(validation.message).toBeNull();
    expect(validation.values.startTime).toBe("09:00");
    expect(validation.values.endTime).toBe("17:00");
  });

  it("normalizes whatever the user typed", () => {
    const validation = validateShiftInput({
      startTime: "4:15 PM",
      endTime: { hour: 11, minute: 47, meridiem: "PM" },
    });
    expect(validation.values.startTime).toBe("16:15");
    expect(validation.values.endTime).toBe("23:47");
  });

  it("asks for a missing start time", () => {
    const validation = validateShiftInput({ endTime: "17:00" });
    expect(validation.ok).toBe(false);
    expect(validation.errors.startTime).toBe(MESSAGES.startMissing);
    expect(validation.message).toBe(MESSAGES.startMissing);
  });

  it("asks for a missing stop time", () => {
    const validation = validateShiftInput({ startTime: "09:00" });
    expect(validation.ok).toBe(false);
    expect(validation.errors.endTime).toBe(MESSAGES.endMissing);
  });

  it("reports unreadable times", () => {
    const validation = validateShiftInput({
      startTime: "elevenish",
      endTime: "25:00",
    });
    expect(validation.errors.startTime).toBe(MESSAGES.startInvalid);
    expect(validation.errors.endTime).toBe(MESSAGES.endInvalid);
  });

  it("rejects an identical start and end", () => {
    const validation = validateShiftInput({
      startTime: "09:00",
      endTime: "9:00 AM",
    });
    expect(validation.ok).toBe(false);
    expect(validation.errors.endTime).toBe(MESSAGES.sameTime);
  });
});

describe("validateShiftInput — rate", () => {
  it("is optional", () => {
    const validation = validateShiftInput(shift);
    expect(validation.ok).toBe(true);
    expect(validation.values.hourlyRateCents).toBeNull();
  });

  it("normalizes a typed rate", () => {
    const validation = validateShiftInput({ ...shift, hourlyRate: "$22.50" });
    expect(validation.values.hourlyRateCents).toBe(2250);
  });

  it("accepts an already-normalized rate", () => {
    const validation = validateShiftInput({ ...shift, hourlyRateCents: 2250 });
    expect(validation.ok).toBe(true);
    expect(validation.values.hourlyRateCents).toBe(2250);
  });

  it("prefers the normalized rate when both are present", () => {
    const validation = validateShiftInput({
      ...shift,
      hourlyRate: "99",
      hourlyRateCents: 2250,
    });
    expect(validation.values.hourlyRateCents).toBe(2250);
  });

  it("allows an intentional zero", () => {
    const validation = validateShiftInput({ ...shift, hourlyRate: "0" });
    expect(validation.ok).toBe(true);
    expect(validation.values.hourlyRateCents).toBe(0);
  });

  it("keeps a normalized zero rate rather than reading it as unset", () => {
    const validation = validateShiftInput({ ...shift, hourlyRateCents: 0 });
    expect(validation.ok).toBe(true);
    expect(validation.values.hourlyRateCents).toBe(0);
  });

  it("rejects a negative rate", () => {
    expect(
      validateShiftInput({ ...shift, hourlyRate: "-5" }).errors.hourlyRate,
    ).toBe(MESSAGES.rateNegative);
    expect(
      validateShiftInput({ ...shift, hourlyRateCents: -500 }).errors.hourlyRate,
    ).toBe(MESSAGES.rateNegative);
  });

  it("rejects an unreadable rate", () => {
    expect(
      validateShiftInput({ ...shift, hourlyRate: "twenty" }).errors.hourlyRate,
    ).toBe(MESSAGES.rateInvalid);
    expect(
      validateShiftInput({ ...shift, hourlyRateCents: 22.5 }).errors.hourlyRate,
    ).toBe(MESSAGES.rateInvalid);
  });
});

describe("validateShiftInput — break", () => {
  it("defaults to none", () => {
    expect(validateShiftInput(shift).values.breakMinutes).toBe(0);
    expect(
      validateShiftInput({ ...shift, breakMinutes: "" }).values.breakMinutes,
    ).toBe(0);
  });

  it("accepts an explicit zero", () => {
    expect(
      validateShiftInput({ ...shift, breakMinutes: 0 }).values.breakMinutes,
    ).toBe(0);
    expect(
      validateShiftInput({ ...shift, breakMinutes: "0" }).values.breakMinutes,
    ).toBe(0);
  });

  it("normalizes a typed break", () => {
    expect(
      validateShiftInput({ ...shift, breakMinutes: "30" }).values.breakMinutes,
    ).toBe(30);
  });

  it("rejects a negative break", () => {
    expect(
      validateShiftInput({ ...shift, breakMinutes: -15 }).errors.breakMinutes,
    ).toBe(MESSAGES.breakNegative);
  });

  it("rejects an unreadable break", () => {
    expect(
      validateShiftInput({ ...shift, breakMinutes: "a while" }).errors
        .breakMinutes,
    ).toBe(MESSAGES.breakInvalid);
  });

  it("rejects a break longer than the shift", () => {
    const validation = validateShiftInput({ ...shift, breakMinutes: 481 });
    expect(validation.ok).toBe(false);
    expect(validation.errors.breakMinutes).toBe(MESSAGES.breakTooLong);
  });

  it("rejects a break exactly as long as the shift", () => {
    expect(
      validateShiftInput({ ...shift, breakMinutes: 480 }).errors.breakMinutes,
    ).toBe(MESSAGES.breakTooLong);
  });

  it("allows a break one minute shorter than the shift", () => {
    expect(validateShiftInput({ ...shift, breakMinutes: 479 }).ok).toBe(true);
  });

  it("measures the break against an overnight shift", () => {
    const overnight = { startTime: "22:00", endTime: "03:00" };
    expect(validateShiftInput({ ...overnight, breakMinutes: 30 }).ok).toBe(
      true,
    );
    expect(
      validateShiftInput({ ...overnight, breakMinutes: 300 }).errors
        .breakMinutes,
    ).toBe(MESSAGES.breakTooLong);
  });
});

describe("validateShiftInput — date", () => {
  it("is optional", () => {
    expect(validateShiftInput(shift).values.date).toBeNull();
  });

  it("accepts an ISO date", () => {
    expect(
      validateShiftInput({ ...shift, date: "2026-08-17" }).values.date,
    ).toBe("2026-08-17");
  });

  it("rejects anything else", () => {
    expect(validateShiftInput({ ...shift, date: "Monday" }).errors.date).toBe(
      MESSAGES.dateInvalid,
    );
  });
});

describe("validateShiftInput — headline message", () => {
  it("reports the earliest failing field", () => {
    const validation = validateShiftInput({
      startTime: "",
      endTime: "",
      hourlyRate: "nope",
    });
    expect(validation.message).toBe(MESSAGES.startMissing);
    expect(Object.keys(validation.errors).sort()).toEqual([
      "endTime",
      "hourlyRate",
      "startTime",
    ]);
  });

  it("handles being called with nothing at all", () => {
    const validation = validateShiftInput();
    expect(validation.ok).toBe(false);
    expect(validation.message).toBe(MESSAGES.startMissing);
  });
});
