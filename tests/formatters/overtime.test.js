import { describe, expect, it } from "vitest";

import {
  formatHoursInput,
  formatMultiplier,
  formatMultiplierInput,
} from "@/lib/formatters/overtime";

describe("formatMultiplier", () => {
  it("reads as a multiple of the rate", () => {
    expect(formatMultiplier(1.5)).toBe("1.5×");
    expect(formatMultiplier(2)).toBe("2×");
    expect(formatMultiplier(1.75)).toBe("1.75×");
  });

  it("has nothing to say about a multiplier that is not one", () => {
    expect(formatMultiplier(null)).toBeNull();
    expect(formatMultiplier(undefined)).toBeNull();
  });
});

describe("formatMultiplierInput", () => {
  it("reads back into the field it came from", () => {
    expect(formatMultiplierInput(1.5)).toBe("1.5");
    expect(formatMultiplierInput(2)).toBe("2");
  });

  it("is empty when there is nothing to edit", () => {
    expect(formatMultiplierInput(null)).toBe("");
  });
});

describe("formatHoursInput", () => {
  it("gives a threshold back as the hours it was typed as", () => {
    expect(formatHoursInput(2400)).toBe("40");
    expect(formatHoursInput(2250)).toBe("37.5");
    expect(formatHoursInput(2640)).toBe("44");
  });

  it("is empty when there is nothing to edit", () => {
    expect(formatHoursInput(null)).toBe("");
    expect(formatHoursInput(-60)).toBe("");
  });
});
