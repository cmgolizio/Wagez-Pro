import { describe, expect, it } from "vitest";

import { calculatePayCents, parseRateCents } from "@/lib/calculations/wages";

describe("parseRateCents", () => {
  it("normalizes whole dollars", () => {
    expect(parseRateCents("15")).toBe(1500);
    expect(parseRateCents(15)).toBe(1500);
    expect(parseRateCents("22")).toBe(2200);
  });

  it("normalizes decimals exactly", () => {
    expect(parseRateCents("7.25")).toBe(725);
    expect(parseRateCents("22.50")).toBe(2250);
    expect(parseRateCents("22.5")).toBe(2250);
    expect(parseRateCents("50.75")).toBe(5075);
    expect(parseRateCents(22.5)).toBe(2250);
    expect(parseRateCents(50.75)).toBe(5075);
  });

  it("avoids floating-point drift on awkward values", () => {
    expect(parseRateCents("1.005")).toBe(101);
    expect(parseRateCents("0.07")).toBe(7);
    expect(parseRateCents("1.15")).toBe(115);
    expect(parseRateCents("8.245")).toBe(825);
    expect(parseRateCents("8.244")).toBe(824);
  });

  it("tolerates typed currency decoration", () => {
    expect(parseRateCents("$22.50")).toBe(2250);
    expect(parseRateCents(" 1,250 ")).toBe(125000);
    expect(parseRateCents(".5")).toBe(50);
  });

  it("allows zero", () => {
    expect(parseRateCents("0")).toBe(0);
    expect(parseRateCents(0)).toBe(0);
  });

  it("rejects negatives and unreadable values", () => {
    expect(parseRateCents("-5")).toBeNull();
    expect(parseRateCents(-5)).toBeNull();
    expect(parseRateCents("")).toBeNull();
    expect(parseRateCents("   ")).toBeNull();
    expect(parseRateCents("twenty")).toBeNull();
    expect(parseRateCents("22.50.1")).toBeNull();
    expect(parseRateCents(null)).toBeNull();
    expect(parseRateCents(undefined)).toBeNull();
    expect(parseRateCents(Number.NaN)).toBeNull();
    expect(parseRateCents(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("calculatePayCents", () => {
  it("pays a whole shift", () => {
    expect(calculatePayCents(480, 2000)).toBe(16000);
    expect(calculatePayCents(450, 2000)).toBe(15000);
  });

  it("rounds once, at the end", () => {
    // 452 minutes at $22/hour is $165.7333...
    expect(calculatePayCents(452, 2200)).toBe(16573);
  });

  it("handles decimal rates", () => {
    expect(calculatePayCents(450, 2250)).toBe(16875);
    expect(calculatePayCents(480, 725)).toBe(5800);
    expect(calculatePayCents(510, 1733)).toBe(14731);
  });

  it("pays nothing at a zero rate or for zero time", () => {
    expect(calculatePayCents(480, 0)).toBe(0);
    expect(calculatePayCents(0, 2200)).toBe(0);
  });

  it("pays a multiple of the rate when it is given one", () => {
    // Six hours at $20, at time and a half.
    expect(calculatePayCents(360, 2000, 1.5)).toBe(18000);
    expect(calculatePayCents(480, 2000, 2)).toBe(32000);
  });

  it("pays the rate itself when it is not", () => {
    expect(calculatePayCents(480, 2000, 1)).toBe(calculatePayCents(480, 2000));
  });

  it("still rounds once, at the end, with a multiplier", () => {
    // 452 minutes at $22/hour × 1.5 is $248.60.
    expect(calculatePayCents(452, 2200, 1.5)).toBe(24860);
  });

  it("rejects invalid arguments", () => {
    expect(calculatePayCents(-1, 2200)).toBeNull();
    expect(calculatePayCents(480, -1)).toBeNull();
    expect(calculatePayCents(1.5, 2200)).toBeNull();
    expect(calculatePayCents(480, 22.5)).toBeNull();
    expect(calculatePayCents(null, 2200)).toBeNull();
    expect(calculatePayCents(480, 2200, -1)).toBeNull();
    expect(calculatePayCents(480, 2200, "1.5")).toBeNull();
  });
});
