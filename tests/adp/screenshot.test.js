import { describe, expect, it } from "vitest";
import { parseAdpScreenshotText } from "@/lib/adp/screenshot";

const SAMPLE_TEXT = `
Timecard
Monday Nov 23 07.45 Hours
Worked 09:38 am - 05:05 pm
Tuesday Nov 24 06.90 Hours
Worked 10:16 am - 05:10 pm
Wednesday Nov 25 07.27 Hours
Worked 10:12 am - 05:28 pm
Thursday Nov 26 08.00 Hours
HOLIDAY 08:00 am / 08.00 Hours
Friday Nov 27 0 Hours
Saturday Nov 28 0 Hours
Sunday Nov 29 0 Hours
Monday Nov 30 0 Hours
`;

describe("ADP Mobile screenshot OCR parser", () => {
  it("recognizes the three worked punches in the supplied screenshot", () => {
    const result = parseAdpScreenshotText(SAMPLE_TEXT, 2026);
    expect(result.shifts).toEqual([
      { date: "2026-11-23", startTime: "09:38", endTime: "17:05" },
      { date: "2026-11-24", startTime: "10:16", endTime: "17:10" },
      { date: "2026-11-25", startTime: "10:12", endTime: "17:28" },
    ]);
    expect(result.paidTime).toEqual([{ type: "holiday", date: "2026-11-26", minutes: 480 }]);
    expect(result.warnings.some((warning) => /2026-11-23.*displays/.test(warning))).toBe(false);
  });

  it("imports HOLIDAY as paid time, never fabricated punches, and ignores empty days", () => {
    const result = parseAdpScreenshotText(
      "Thursday Nov 26 08.00 Hours\nHOLIDAY 08:00 am / 08.00 Hours\nFriday Nov 27 0 Hours",
      2026,
    );
    expect(result.shifts).toEqual([]);
    expect(result.paidTime).toEqual([{ type: "holiday", date: "2026-11-26", minutes: 480 }]);
    expect(result.warnings).toHaveLength(0);
  });

  it("rejects the wrong year rather than silently dating the shifts incorrectly", () => {
    const result = parseAdpScreenshotText(SAMPLE_TEXT, 2025);
    expect(result.shifts).toEqual([]);
    expect(result.paidTime).toEqual([]);
    expect(result.warnings.some((warning) => /weekday disagree/.test(warning))).toBe(true);
  });

  it("warns if ADP's decimal hours disagree with the actual punches", () => {
    const result = parseAdpScreenshotText(
      "Monday Nov 23 05.00 Hours\nWorked 09:38 am - 05:05 pm",
      2026,
    );
    expect(result.shifts).toHaveLength(1);
    expect(result.warnings.join(" ")).toMatch(/breaks or adjustments/i);
  });

  it("works with alternate spacing and case, preserving overnight times", () => {
    const result = parseAdpScreenshotText(
      "MONDAY NOV 23\nWorked 10:00 PM — 03:00 am",
      2026,
    );
    expect(result.shifts).toEqual([{
      date: "2026-11-23", startTime: "22:00", endTime: "03:00",
    }]);
  });

  it("skips incomplete punches and impossible dates", () => {
    const result = parseAdpScreenshotText(
      "Monday Nov 23 07.45 Hours\nWorked 09:38 am\nTuesday Nov 31 08.00 Hours\nWorked 09:00 am - 05:00 pm",
      2026,
    );
    expect(result.shifts).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("does not repeat a punch if the same screenshot text appears twice", () => {
    const input = "Monday Nov 23 07.45 Hours\nWorked 09:38 am - 05:05 pm";
    const result = parseAdpScreenshotText(input + "\n" + input, 2026);
    expect(result.shifts).toHaveLength(1);
  });
});
