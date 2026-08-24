import { describe, expect, it } from "vitest";

import { shiftSignature } from "@/lib/calculations/signature";

const SHIFT = { startTime: "16:00", endTime: "23:00", hourlyRate: "20" };

describe("shiftSignature", () => {
  it("is stable for the same input", () => {
    expect(shiftSignature(SHIFT)).toBe(shiftSignature({ ...SHIFT }));
  });

  it("changes when a calculated value changes", () => {
    const original = shiftSignature(SHIFT);

    expect(shiftSignature({ ...SHIFT, startTime: "16:15" })).not.toBe(original);
    expect(shiftSignature({ ...SHIFT, endTime: "23:30" })).not.toBe(original);
    expect(shiftSignature({ ...SHIFT, hourlyRate: "21" })).not.toBe(original);
    expect(shiftSignature({ ...SHIFT, breakMinutes: "30" })).not.toBe(original);
    expect(shiftSignature({ ...SHIFT, date: "2026-08-23" })).not.toBe(original);
  });

  it("ignores rewriting the same values differently", () => {
    const original = shiftSignature(SHIFT);

    expect(shiftSignature({ ...SHIFT, startTime: "4:00 PM" })).toBe(original);
    expect(shiftSignature({ ...SHIFT, hourlyRate: "20.00" })).toBe(original);
    expect(shiftSignature({ ...SHIFT, hourlyRate: " $20 " })).toBe(original);
    expect(shiftSignature({ ...SHIFT, breakMinutes: "" })).toBe(original);
  });

  it("tells an unreadable value apart from a blank one", () => {
    const blankRate = shiftSignature({ ...SHIFT, hourlyRate: "" });

    expect(shiftSignature({ ...SHIFT, hourlyRate: "abc" })).not.toBe(blankRate);
    expect(shiftSignature({ ...SHIFT, hourlyRate: "abc" })).not.toBe(
      shiftSignature(SHIFT),
    );
  });

  it("treats inputs that fail the same way as the same", () => {
    // Both refuse to calculate with the same complaint, so a result made from
    // one is exactly as stale as a result made from the other.
    expect(shiftSignature({ ...SHIFT, hourlyRate: "abc" })).toBe(
      shiftSignature({ ...SHIFT, hourlyRate: "xyz" }),
    );
  });

  it("distinguishes a missing time from a zero-length shift", () => {
    const missing = shiftSignature({ ...SHIFT, endTime: "" });
    const identical = shiftSignature({ ...SHIFT, endTime: "16:00" });

    expect(missing).not.toBe(identical);
    expect(missing).not.toBe(shiftSignature(SHIFT));
    expect(identical).not.toBe(shiftSignature(SHIFT));
  });

  it("signs an empty draft without complaint", () => {
    expect(typeof shiftSignature()).toBe("string");
    expect(shiftSignature()).toBe(shiftSignature({}));
  });
});
