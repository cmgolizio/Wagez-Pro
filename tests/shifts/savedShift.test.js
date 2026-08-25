import { describe, expect, it } from "vitest";

import {
  DATE_REQUIRED,
  createSavedShift,
  createShiftId,
  deriveShift,
  normalizeSavedShift,
} from "@/lib/shifts/savedShift";

const DRAFT = {
  date: "2026-08-17",
  startTime: "16:00",
  endTime: "23:30",
  hourlyRate: "20",
};

describe("createShiftId", () => {
  it("never repeats itself", () => {
    const ids = new Set(Array.from({ length: 500 }, createShiftId));

    expect(ids.size).toBe(500);
  });
});

describe("createSavedShift", () => {
  it("keeps the shift's own values, normalized", () => {
    const { ok, shift } = createSavedShift(DRAFT);

    expect(ok).toBe(true);
    expect(shift.date).toBe("2026-08-17");
    expect(shift.startTime).toBe("16:00");
    expect(shift.endTime).toBe("23:30");
    expect(shift.hourlyRateCents).toBe(2000);
    expect(shift.breakMinutes).toBe(0);
  });

  it("gives every shift its own id", () => {
    const first = createSavedShift(DRAFT).shift;
    const second = createSavedShift(DRAFT).shift;

    expect(typeof first.id).toBe("string");
    expect(first.id).not.toBe(second.id);
  });

  it("stamps when it was saved", () => {
    const { shift } = createSavedShift(DRAFT);

    expect(Number.isNaN(Date.parse(shift.createdAt))).toBe(false);
    expect(shift.updatedAt).toBe(shift.createdAt);
  });

  it("stores no derived value that could go stale", () => {
    const { shift } = createSavedShift(DRAFT);

    expect(shift.elapsedMinutes).toBeUndefined();
    expect(shift.paidMinutes).toBeUndefined();
    expect(shift.basePayCents).toBeUndefined();
  });

  it("saves a shift with no rate at all", () => {
    const { ok, shift } = createSavedShift({ ...DRAFT, hourlyRate: "" });

    expect(ok).toBe(true);
    expect(shift.hourlyRateCents).toBeNull();
  });

  it("asks for the day before it will save anything", () => {
    const { ok, errors, message, shift } = createSavedShift({
      ...DRAFT,
      date: "",
    });

    expect(ok).toBe(false);
    expect(errors.date).toBe(DATE_REQUIRED);
    expect(message).toBe(DATE_REQUIRED);
    expect(shift).toBeNull();
  });

  it("refuses a shift that would not calculate", () => {
    const { ok, errors } = createSavedShift({ ...DRAFT, endTime: "16:00" });

    expect(ok).toBe(false);
    expect(errors.endTime).not.toBeUndefined();
  });
});

describe("deriveShift", () => {
  it("works everything out from the shift's own values", () => {
    const { shift } = createSavedShift(DRAFT);
    const derived = deriveShift(shift);

    expect(derived.elapsedMinutes).toBe(450);
    expect(derived.paidMinutes).toBe(450);
    expect(derived.basePayCents).toBe(15000);
    expect(derived.crossesMidnight).toBe(false);
  });

  it("carries an overnight shift into the next day", () => {
    const { shift } = createSavedShift({
      ...DRAFT,
      startTime: "22:00",
      endTime: "03:00",
    });
    const derived = deriveShift(shift);

    expect(derived.elapsedMinutes).toBe(300);
    expect(derived.crossesMidnight).toBe(true);
    expect(derived.endDate).toBe("2026-08-18");
  });

  it("invents no money for a shift with no rate", () => {
    const { shift } = createSavedShift({ ...DRAFT, hourlyRate: "" });

    expect(deriveShift(shift).basePayCents).toBeNull();
    expect(deriveShift(shift).paidMinutes).toBe(450);
  });

  it("says nothing at all about a shift it cannot read", () => {
    expect(deriveShift(null)).toBeNull();
    expect(deriveShift({ startTime: "nope", endTime: "23:00" })).toBeNull();
  });
});

describe("normalizeSavedShift", () => {
  const STORED = {
    id: "abc",
    date: "2026-08-17",
    startTime: "16:00",
    endTime: "23:30",
    hourlyRateCents: 2000,
    breakMinutes: 0,
    createdAt: "2026-08-17T23:35:00.000Z",
    updatedAt: "2026-08-17T23:35:00.000Z",
  };

  it("reads a shift back exactly as it was saved", () => {
    expect(normalizeSavedShift(STORED)).toEqual(STORED);
  });

  it("fills in timestamps it was never given", () => {
    const shift = normalizeSavedShift({
      ...STORED,
      createdAt: undefined,
      updatedAt: undefined,
    });

    expect(typeof shift.createdAt).toBe("string");
    expect(shift.updatedAt).toBe(shift.createdAt);
  });

  it("refuses anything it could not put in a week", () => {
    expect(normalizeSavedShift(null)).toBeNull();
    expect(normalizeSavedShift("shift")).toBeNull();
    expect(normalizeSavedShift({ ...STORED, id: undefined })).toBeNull();
    expect(normalizeSavedShift({ ...STORED, date: "Monday" })).toBeNull();
    expect(normalizeSavedShift({ ...STORED, startTime: "25:00" })).toBeNull();
    expect(normalizeSavedShift({ ...STORED, endTime: "16:00" })).toBeNull();
    expect(
      normalizeSavedShift({ ...STORED, hourlyRateCents: -100 }),
    ).toBeNull();
  });
});
