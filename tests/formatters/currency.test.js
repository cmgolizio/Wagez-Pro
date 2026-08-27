import { describe, expect, it } from "vitest";

import { parseRateCents } from "@/lib/calculations/wages";
import {
  formatCents,
  formatHourlyRate,
  formatRateInput,
} from "@/lib/formatters/currency";

describe("formatCents", () => {
  it("formats money from integer cents", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(15000)).toBe("$150.00");
    expect(formatCents(16573)).toBe("$165.73");
    expect(formatCents(7)).toBe("$0.07");
  });

  it("groups large amounts", () => {
    expect(formatCents(102350)).toBe("$1,023.50");
  });

  it("returns null for values that are not money", () => {
    expect(formatCents(null)).toBeNull();
    expect(formatCents(undefined)).toBeNull();
    expect(formatCents(Number.NaN)).toBeNull();
    expect(formatCents("2200")).toBeNull();
  });
});

describe("formatHourlyRate", () => {
  it("drops empty cents on round rates", () => {
    expect(formatHourlyRate(2200)).toBe("$22/hour");
    expect(formatHourlyRate(0)).toBe("$0/hour");
  });

  it("keeps cents when they matter", () => {
    expect(formatHourlyRate(2250)).toBe("$22.50/hour");
    expect(formatHourlyRate(725)).toBe("$7.25/hour");
    expect(formatHourlyRate(5075)).toBe("$50.75/hour");
  });

  it("returns null for values that are not money", () => {
    expect(formatHourlyRate(null)).toBeNull();
    expect(formatHourlyRate(Number.NaN)).toBeNull();
  });
});

describe("formatRateInput", () => {
  it("writes a rate the way it would be typed", () => {
    expect(formatRateInput(2000)).toBe("20");
    expect(formatRateInput(2250)).toBe("22.50");
    expect(formatRateInput(725)).toBe("7.25");
    expect(formatRateInput(5)).toBe("0.05");
    expect(formatRateInput(0)).toBe("0");
  });

  it("reads back as the same rate it came from", () => {
    for (const cents of [0, 5, 725, 2000, 2250, 5075, 123456]) {
      expect(parseRateCents(formatRateInput(cents))).toBe(cents);
    }
  });

  it("is empty when there is no rate to edit", () => {
    expect(formatRateInput(null)).toBe("");
    expect(formatRateInput(undefined)).toBe("");
    expect(formatRateInput(-100)).toBe("");
  });
});
