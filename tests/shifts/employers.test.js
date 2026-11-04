import { describe, expect, it } from "vitest";

import {
  createSavedShift,
  duplicateDraft,
  normalizeSavedShift,
  updateSavedShift,
} from "@/lib/shifts/savedShift";
import { allocateShifts, summarizeAllocated } from "@/lib/shifts/week";

const sample = {
  date: "2026-10-05",
  startTime: "09:00",
  endTime: "17:00",
  hourlyRate: "20",
  breakMinutes: "",
  employerId: "cafe",
};

describe("employers on shifts", () => {
  it("saves and reloads employer identity without changing the rate", () => {
    const result = createSavedShift(sample);
    expect(result.ok).toBe(true);
    expect(result.shift.employerId).toBe("cafe");
    expect(result.shift.hourlyRateCents).toBe(2000);
    expect(normalizeSavedShift(result.shift)).toEqual(result.shift);
  });

  it("allows clearing the employer and keeping the entered rate", () => {
    const first = createSavedShift(sample).shift;
    const updated = updateSavedShift(first, { ...sample, employerId: "", hourlyRate: "21" });
    expect(updated.ok).toBe(true);
    expect(updated.shift.id).toBe(first.id);
    expect(updated.shift.employerId).toBeNull();
    expect(updated.shift.hourlyRateCents).toBe(2100);
    expect(normalizeSavedShift(updated.shift).employerId).toBeUndefined();
  });

  it("duplicates the employer and hourly rate as they were saved", () => {
    const first = createSavedShift(sample).shift;
    const draft = duplicateDraft(first);
    expect(draft.employerId).toBe("cafe");
    expect(draft.hourlyRate).toBe("20");
    const next = createSavedShift(draft);
    expect(next.ok).toBe(true);
    expect(next.shift.id).not.toBe(first.id);
    expect(next.shift.employerId).toBe("cafe");
  });

  it("filtered totals count only selected employer shifts", () => {
    const first = createSavedShift(sample).shift;
    const second = createSavedShift({ ...sample, employerId: "bar", hourlyRate: "30" }).shift;
    const allocated = allocateShifts([first, second]);
    const filtered = allocated.filter(({ shift }) => shift.employerId === "cafe");
    expect(summarizeAllocated(filtered).shiftCount).toBe(1);
    expect(summarizeAllocated(filtered).payCents).toBe(16000);
    expect(summarizeAllocated(allocated).payCents).toBe(40000);
  });
});
