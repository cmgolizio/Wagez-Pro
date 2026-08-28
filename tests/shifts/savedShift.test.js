import { describe, expect, it } from "vitest";

import {
  DATE_REQUIRED,
  createSavedShift,
  createShiftId,
  deriveShift,
  duplicateDraft,
  normalizeSavedShift,
  shiftDraft,
  updateSavedShift,
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

describe("updateSavedShift", () => {
  const SAVED = createSavedShift(DRAFT).shift;

  it("keeps the shift it was given, changing only what was edited", () => {
    const { ok, shift } = updateSavedShift(SAVED, {
      ...shiftDraft(SAVED),
      endTime: "22:00",
    });

    expect(ok).toBe(true);
    expect(shift.id).toBe(SAVED.id);
    expect(shift.createdAt).toBe(SAVED.createdAt);
    expect(shift.date).toBe(SAVED.date);
    expect(shift.startTime).toBe("16:00");
    expect(shift.endTime).toBe("22:00");
  });

  it("says when it was last touched", () => {
    const stale = { ...SAVED, updatedAt: "2020-01-01T00:00:00.000Z" };
    const { shift } = updateSavedShift(stale, shiftDraft(stale));

    expect(shift.updatedAt).not.toBe(stale.updatedAt);
    expect(Number.isNaN(Date.parse(shift.updatedAt))).toBe(false);
  });

  it("moves a shift to another day", () => {
    const { shift } = updateSavedShift(SAVED, {
      ...shiftDraft(SAVED),
      date: "2026-08-20",
    });

    expect(shift.date).toBe("2026-08-20");
    expect(shift.id).toBe(SAVED.id);
  });

  it("recalculates from the values it was given, storing none of it", () => {
    const { shift } = updateSavedShift(SAVED, {
      ...shiftDraft(SAVED),
      endTime: "20:00",
      hourlyRate: "30",
    });

    expect(shift.basePayCents).toBeUndefined();
    expect(deriveShift(shift).paidMinutes).toBe(240);
    expect(deriveShift(shift).basePayCents).toBe(12000);
  });

  it("takes the rate away when it is cleared", () => {
    const { shift } = updateSavedShift(SAVED, {
      ...shiftDraft(SAVED),
      hourlyRate: "",
    });

    expect(shift.hourlyRateCents).toBeNull();
    expect(deriveShift(shift).basePayCents).toBeNull();
  });

  it("refuses an edit that would not calculate, changing nothing", () => {
    const { ok, errors, shift } = updateSavedShift(SAVED, {
      ...shiftDraft(SAVED),
      endTime: "16:00",
    });

    expect(ok).toBe(false);
    expect(errors.endTime).not.toBeUndefined();
    expect(shift).toBeNull();
  });

  it("refuses an edit that takes the day away", () => {
    const { ok, errors } = updateSavedShift(SAVED, {
      ...shiftDraft(SAVED),
      date: "",
    });

    expect(ok).toBe(false);
    expect(errors.date).toBe(DATE_REQUIRED);
  });
});

describe("shiftDraft", () => {
  it("hands a saved shift back as the values an editor holds", () => {
    const { shift } = createSavedShift({ ...DRAFT, hourlyRate: "22.50" });

    expect(shiftDraft(shift)).toEqual({
      date: "2026-08-17",
      startTime: "16:00",
      endTime: "23:30",
      hourlyRate: "22.50",
      // A shift with no break has an empty break field, not a typed zero.
      breakMinutes: "",
    });
  });

  it("leaves the rate empty when the shift never had one", () => {
    const { shift } = createSavedShift({ ...DRAFT, hourlyRate: "" });

    expect(shiftDraft(shift).hourlyRate).toBe("");
  });

  it("keeps an unpaid break with the shift it belongs to", () => {
    const { shift } = createSavedShift({ ...DRAFT, breakMinutes: 30 });

    expect(shiftDraft(shift).breakMinutes).toBe("30");
    // Through an edit of something else entirely, and through a copy.
    expect(
      updateSavedShift(shift, { ...shiftDraft(shift), endTime: "22:00" }).shift
        .breakMinutes,
    ).toBe(30);
    expect(createSavedShift(duplicateDraft(shift)).shift.breakMinutes).toBe(30);
  });

  it("round-trips a shift through its own draft unchanged", () => {
    const { shift } = createSavedShift(DRAFT);
    const { shift: saved } = updateSavedShift(shift, shiftDraft(shift));

    expect({ ...saved, updatedAt: shift.updatedAt }).toEqual(shift);
  });
});

describe("duplicateDraft", () => {
  const SAVED = createSavedShift({ ...DRAFT, hourlyRate: "22.50" }).shift;

  it("suggests the day after the shift it copies", () => {
    expect(duplicateDraft(SAVED).date).toBe("2026-08-18");
  });

  it("keeps everything else about the shift", () => {
    expect(duplicateDraft(SAVED)).toEqual({
      ...shiftDraft(SAVED),
      date: "2026-08-18",
    });
  });

  it("crosses a month exactly as the calendar does", () => {
    const { shift } = createSavedShift({ ...DRAFT, date: "2026-08-31" });

    expect(duplicateDraft(shift).date).toBe("2026-09-01");
  });

  it("is only a draft: saving it is what makes a shift of its own", () => {
    const draft = duplicateDraft(SAVED);

    expect(draft.id).toBeUndefined();

    const { shift } = createSavedShift(draft);
    expect(shift.id).not.toBe(SAVED.id);
    expect(shift.startTime).toBe(SAVED.startTime);
    expect(shift.hourlyRateCents).toBe(SAVED.hourlyRateCents);
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
