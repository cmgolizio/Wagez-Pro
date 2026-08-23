import { describe, expect, it } from "vitest";

import { calculatePaidMinutes, calculateShift } from "@/lib/calculations/shift";
import { MESSAGES } from "@/lib/calculations/validation";

/** Calculate and assert success, returning the derived shift. */
function calculate(input) {
  const calculation = calculateShift(input);
  expect(calculation.ok).toBe(true);
  expect(calculation.message).toBeNull();
  return calculation.result;
}

describe("calculatePaidMinutes", () => {
  it("subtracts the unpaid break", () => {
    expect(calculatePaidMinutes(480, 30)).toBe(450);
    expect(calculatePaidMinutes(480)).toBe(480);
    expect(calculatePaidMinutes(480, 0)).toBe(480);
  });

  it("refuses to invent negative paid time", () => {
    expect(calculatePaidMinutes(480, 481)).toBeNull();
    expect(calculatePaidMinutes(480, -1)).toBeNull();
    expect(calculatePaidMinutes(-1, 0)).toBeNull();
    expect(calculatePaidMinutes(null, 0)).toBeNull();
    expect(calculatePaidMinutes(480, 1.5)).toBeNull();
  });
});

describe("calculateShift — durations", () => {
  it("calculates a normal shift", () => {
    expect(
      calculate({ startTime: "9:00 AM", endTime: "5:00 PM" }).elapsedMinutes,
    ).toBe(480);
  });

  it("calculates a partial hour", () => {
    expect(
      calculate({ startTime: "9:15 AM", endTime: "5:45 PM" }).elapsedMinutes,
    ).toBe(510);
  });

  it("calculates an overnight shift", () => {
    const result = calculate({ startTime: "10:00 PM", endTime: "3:00 AM" });
    expect(result.elapsedMinutes).toBe(300);
    expect(result.crossesMidnight).toBe(true);
  });

  it("calculates up to midnight", () => {
    const result = calculate({ startTime: "11:00 PM", endTime: "12:00 AM" });
    expect(result.elapsedMinutes).toBe(60);
    expect(result.crossesMidnight).toBe(true);
  });

  it("calculates from midnight", () => {
    const result = calculate({ startTime: "12:00 AM", endTime: "8:00 AM" });
    expect(result.elapsedMinutes).toBe(480);
    expect(result.crossesMidnight).toBe(false);
  });

  it("calculates across noon", () => {
    expect(
      calculate({ startTime: "12:00 PM", endTime: "1:00 PM" }).elapsedMinutes,
    ).toBe(60);
  });
});

describe("calculateShift — breaks", () => {
  it("deducts the break from paid time", () => {
    const result = calculate({
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      breakMinutes: 30,
    });
    expect(result.elapsedMinutes).toBe(480);
    expect(result.breakMinutes).toBe(30);
    expect(result.paidMinutes).toBe(450);
  });

  it("pays only for paid time", () => {
    const result = calculate({
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      breakMinutes: 30,
      hourlyRate: "20",
    });
    expect(result.basePayCents).toBe(15000);
  });

  it("defaults to no break", () => {
    const result = calculate({ startTime: "9:00 AM", endTime: "5:00 PM" });
    expect(result.breakMinutes).toBe(0);
    expect(result.paidMinutes).toBe(result.elapsedMinutes);
  });

  it("rejects a break that swallows the shift", () => {
    const calculation = calculateShift({
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      breakMinutes: 600,
    });
    expect(calculation.ok).toBe(false);
    expect(calculation.result).toBeNull();
    expect(calculation.message).toBe(MESSAGES.breakTooLong);
  });
});

describe("calculateShift — pay", () => {
  it("uses stable integer-cent money handling", () => {
    const result = calculate({
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      hourlyRate: "22.50",
    });
    expect(result.hourlyRateCents).toBe(2250);
    expect(result.basePayCents).toBe(18000);
  });

  it("handles a decimal rate over a partial hour", () => {
    // 7 hours 32 minutes at $22/hour.
    const result = calculate({
      startTime: "9:00 AM",
      endTime: "4:32 PM",
      hourlyRate: "22",
    });
    expect(result.paidMinutes).toBe(452);
    expect(result.basePayCents).toBe(16573);
  });

  it("handles a rate with cents", () => {
    const result = calculate({
      startTime: "9:00 AM",
      endTime: "5:30 PM",
      hourlyRate: "7.25",
    });
    expect(result.paidMinutes).toBe(510);
    expect(result.basePayCents).toBe(6163);
  });

  it("calculates duration but no money when there is no rate", () => {
    const result = calculate({ startTime: "9:00 AM", endTime: "4:30 PM" });
    expect(result.paidMinutes).toBe(450);
    expect(result.hourlyRateCents).toBeNull();
    expect(result.basePayCents).toBeNull();
  });

  it("treats a blank rate as no rate rather than zero", () => {
    expect(
      calculate({ startTime: "9:00 AM", endTime: "5:00 PM", hourlyRate: "  " })
        .basePayCents,
    ).toBeNull();
  });

  it("pays nothing for an intentional zero rate", () => {
    const result = calculate({
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      hourlyRate: "0",
    });
    expect(result.hourlyRateCents).toBe(0);
    expect(result.basePayCents).toBe(0);
  });

  it("accepts an already-normalized rate", () => {
    expect(
      calculate({
        startTime: "9:00 AM",
        endTime: "5:00 PM",
        hourlyRateCents: 2000,
      }).basePayCents,
    ).toBe(16000);
  });
});

describe("calculateShift — dates", () => {
  it("stays undated when no date is given", () => {
    const result = calculate({ startTime: "10:00 PM", endTime: "3:00 AM" });
    expect(result.date).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it("keeps a same-day shift on its date", () => {
    const result = calculate({
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      date: "2026-08-17",
    });
    expect(result.date).toBe("2026-08-17");
    expect(result.endDate).toBe("2026-08-17");
  });

  it("ends an overnight shift on the next day", () => {
    const result = calculate({
      startTime: "10:00 PM",
      endTime: "3:00 AM",
      date: "2026-08-22",
    });
    expect(result.date).toBe("2026-08-22");
    expect(result.endDate).toBe("2026-08-23");
  });

  it("rolls an overnight shift over a month boundary", () => {
    expect(
      calculate({
        startTime: "10:00 PM",
        endTime: "3:00 AM",
        date: "2026-08-31",
      }).endDate,
    ).toBe("2026-09-01");
  });
});

describe("calculateShift — validation", () => {
  it("rejects an identical start and end instead of assuming 24 hours", () => {
    const calculation = calculateShift({
      startTime: "9:00 AM",
      endTime: "9:00 AM",
    });
    expect(calculation.ok).toBe(false);
    expect(calculation.result).toBeNull();
    expect(calculation.errors.endTime).toBe(MESSAGES.sameTime);
  });

  it("asks for the times it needs", () => {
    expect(calculateShift({}).message).toBe(MESSAGES.startMissing);
    expect(calculateShift({ startTime: "9:00 AM" }).message).toBe(
      MESSAGES.endMissing,
    );
  });

  it("rejects a bad rate without guessing one", () => {
    const calculation = calculateShift({
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      hourlyRate: "-5",
    });
    expect(calculation.ok).toBe(false);
    expect(calculation.errors.hourlyRate).toBe(MESSAGES.rateNegative);
  });

  it("never returns a result alongside errors", () => {
    const calculation = calculateShift({ startTime: "nope", endTime: "nope" });
    expect(calculation.ok).toBe(false);
    expect(calculation.result).toBeNull();
    expect(Object.keys(calculation.errors).length).toBeGreaterThan(0);
  });
});

describe("calculateShift — determinism", () => {
  it("returns the same result for the same inputs", () => {
    const input = {
      startTime: "4:15 PM",
      endTime: "11:47 PM",
      hourlyRate: "22.50",
      breakMinutes: 20,
      date: "2026-08-17",
    };
    expect(calculateShift(input)).toEqual(calculateShift(input));
  });

  it("is not affected by the caller's object", () => {
    const input = { startTime: "9:00 AM", endTime: "5:00 PM" };
    calculateShift(input);
    expect(input).toEqual({ startTime: "9:00 AM", endTime: "5:00 PM" });
  });
});
