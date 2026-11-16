import { describe, expect, it } from "vitest";
import {
  elapsedMinutes,
  parseAdpTimecardRows,
  shiftTimeKey,
} from "@/lib/adp/timecard";

const SAMPLE = [
  "11/8/26, 1:10 AM Time - MyADP",
  "7.65 Total Hours",
  "Time Period: 10/24/2026 - 11/06/2026",
  "Weekly Summary",
  "10/31/2026 - 11/06/2026 7.65 HRS",
  "DATE TIME DETAILS",
  "10/24/2026",
  "11/05/2026",
  "11/06/2026 09:18 AM - 04:57 PM",
];

describe("ADP timecard PDF text parsing", () => {
  it("extracts the real shift from the supplied sample layout, not summary dates", () => {
    const result = parseAdpTimecardRows(SAMPLE);
    expect(result.shifts).toEqual([{
      date: "2026-11-06",
      startTime: "09:18",
      endTime: "16:57",
    }]);
    expect(result.reportedTotalHours).toBe(7.65);
    expect(result.warnings).toEqual([]);
    expect(elapsedMinutes("09:18", "16:57")).toBe(459);
  });

  it("parses multiple dates, AM/PM, and overnight punches", () => {
    const result = parseAdpTimecardRows([
      "10/29/2026 09:00 AM - 05:00 PM",
      "10/30/2026 10:00 PM - 03:00 AM",
    ]);
    expect(result.shifts).toHaveLength(2);
    expect(result.shifts[0].startTime).toBe("09:00");
    expect(result.shifts[0].endTime).toBe("17:00");
    expect(elapsedMinutes(result.shifts[1].startTime, result.shifts[1].endTime)).toBe(300);
  });

  it("does not import an incomplete punch or invented break", () => {
    const result = parseAdpTimecardRows([
      "11/06/2026 09:18 AM",
      "11/07/2026",
    ]);
    expect(result.shifts).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("warns when listed paid hours do not match the visible punch spans", () => {
    const result = parseAdpTimecardRows([
      "7.50 Total Hours",
      "11/06/2026 09:00 AM - 05:00 PM",
    ]);
    expect(result.shifts).toHaveLength(1);
    expect(result.warnings.join(" ")).toMatch(/Breaks or adjustments/);
  });

  it("deduplicates identical rows without deleting distinct same-day shifts", () => {
    const result = parseAdpTimecardRows([
      "11/06/2026 09:00 AM - 12:00 PM",
      "11/06/2026 09:00 AM - 12:00 PM",
      "11/06/2026 01:00 PM - 05:00 PM",
    ]);
    expect(result.shifts).toHaveLength(2);
    expect(new Set(result.shifts.map(shiftTimeKey)).size).toBe(2);
  });

  it("skips impossible calendar dates and zero-length shifts", () => {
    const result = parseAdpTimecardRows([
      "02/30/2026 09:00 AM - 05:00 PM",
      "11/06/2026 09:00 AM - 09:00 AM",
    ]);
    expect(result.shifts).toEqual([]);
    expect(result.warnings).not.toEqual([]);
  });
});
