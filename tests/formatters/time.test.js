import { describe, expect, it } from "vitest";

import { formatTime } from "@/lib/formatters/time";

describe("formatTime", () => {
  it("formats afternoon and evening times", () => {
    expect(formatTime("16:15")).toBe("4:15 PM");
    expect(formatTime("23:47")).toBe("11:47 PM");
    expect(formatTime("12:00")).toBe("12:00 PM");
  });

  it("formats morning times", () => {
    expect(formatTime("09:00")).toBe("9:00 AM");
    expect(formatTime("09:05")).toBe("9:05 AM");
    expect(formatTime("00:00")).toBe("12:00 AM");
    expect(formatTime("00:30")).toBe("12:30 AM");
  });

  it("formats whatever the user typed", () => {
    expect(formatTime("4:15 PM")).toBe("4:15 PM");
    expect(formatTime({ hour: 16, minute: 15 })).toBe("4:15 PM");
  });

  it("returns null when there is nothing to show", () => {
    expect(formatTime("")).toBeNull();
    expect(formatTime(null)).toBeNull();
    expect(formatTime("25:00")).toBeNull();
  });
});
