import { describe, expect, it } from "vitest";

import { calculateShift } from "@/lib/calculations/shift";
import { MESSAGES } from "@/lib/calculations/validation";
import {
  createSavedShift,
  deriveShift,
  duplicateDraft,
  normalizeSavedShift,
  shiftDraft,
  updateSavedShift,
} from "@/lib/shifts/savedShift";
import { summarizeShifts } from "@/lib/shifts/week";
import { formatWeekSummary } from "@/lib/share/weekSummary";
import {
  defaultWagezData,
  loadWagezData,
  saveWagezData,
} from "@/lib/storage/wagezStorage";

const draft = {
  date: "2026-11-09",
  startTime: "09:00",
  endTime: "17:00",
  hourlyRate: "20",
  breakMinutes: 30,
};

describe("flat shift tips", () => {
  it("adds tips to shift earnings without changing hours or wage base", () => {
    const result = calculateShift({ ...draft, tip: "42.75" });
    expect(result.ok).toBe(true);
    expect(result.result.paidMinutes).toBe(450);
    expect(result.result.basePayCents).toBe(15000);
    expect(result.result.tipCents).toBe(4275);
    expect(result.result.totalPayCents).toBe(19275);
  });

  it("supports tip-only shifts without inventing an hourly wage", () => {
    const result = calculateShift({ ...draft, hourlyRate: "", tip: "35.50" });
    expect(result.ok).toBe(true);
    expect(result.result.basePayCents).toBeNull();
    expect(result.result.totalPayCents).toBe(3550);
  });

  it("rejects negative, malformed and unsafe tip amounts", () => {
    for (const tip of ["-5", "banana", "9999999999999999999"]) {
      const result = calculateShift({ ...draft, tip });
      expect(result.ok).toBe(false);
      expect(result.errors.tipCents).toBe(
        tip.startsWith("-") ? MESSAGES.tipNegative : MESSAGES.tipInvalid,
      );
    }
  });

  it("saves, edits, duplicates, and restores tips losslessly", () => {
    const created = createSavedShift({ ...draft, tip: "17.25" });
    expect(created.ok).toBe(true);
    const saved = created.shift;
    expect(saved.tipCents).toBe(1725);
    expect(shiftDraft(saved).tip).toBe("17.25");
    expect(deriveShift(saved).totalPayCents).toBe(16725);

    const duplicated = createSavedShift(duplicateDraft(saved)).shift;
    expect(duplicated.tipCents).toBe(1725);
    expect(duplicated.id).not.toBe(saved.id);

    const edited = updateSavedShift(saved, {
      ...shiftDraft(saved),
      tip: "25.00",
    }).shift;
    expect(edited.tipCents).toBe(2500);
    expect(edited.id).toBe(saved.id);
    expect(updateSavedShift(edited, {
      ...shiftDraft(edited),
      tip: "",
    }).shift.tipCents).toBeUndefined();

    const original = defaultWagezData();
    original.shifts = [saved];
    const records = new Map();
    const fakeStorage = {
      setItem: (key, value) => records.set(key, value),
      getItem: (key) => records.get(key) ?? null,
    };
    expect(saveWagezData(original, fakeStorage)).toBe(true);
    expect(loadWagezData(fakeStorage).shifts[0].tipCents).toBe(1725);
  });

  it("retains old saved shifts unchanged when tip was never set", () => {
    const oldShift = createSavedShift(draft).shift;
    expect(oldShift.tipCents).toBeUndefined();
    expect(normalizeSavedShift(oldShift)).toEqual(oldShift);
    expect(shiftDraft(oldShift).tip).toBeUndefined();
  });

  it("includes tips in weekly gross, not regular or overtime wage amounts", () => {
    const shift = createSavedShift({ ...draft, tip: "12.50" }).shift;
    const totals = summarizeShifts([shift]);
    expect(totals.tipCents).toBe(1250);
    expect(totals.payCents).toBe(16250);
    expect(totals.regularPayCents).toBe(15000);
    expect(formatWeekSummary("2026-11-08", totals)).toContain("$12.50 tips");
    expect(formatWeekSummary("2026-11-08", totals)).toContain("$162.50 gross");
  });
});
