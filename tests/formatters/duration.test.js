import { describe, expect, it } from "vitest";

import {
  formatDuration,
  formatDurationCompact,
} from "@/lib/formatters/duration";

describe("formatDuration", () => {
  it("uses the Wagez long form", () => {
    expect(formatDuration(60)).toBe("1 hour.");
    expect(formatDuration(120)).toBe("2 hours.");
    expect(formatDuration(75)).toBe("1 hour + 15 min.");
    expect(formatDuration(452)).toBe("7 hours + 32 min.");
    expect(formatDuration(450)).toBe("7 hours + 30 min.");
    expect(formatDuration(45)).toBe("45 min.");
  });

  it("handles the ends of the range", () => {
    expect(formatDuration(0)).toBe("0 min.");
    expect(formatDuration(1)).toBe("1 min.");
    expect(formatDuration(1439)).toBe("23 hours + 59 min.");
  });

  it("returns null for values that are not a duration", () => {
    expect(formatDuration(-1)).toBeNull();
    expect(formatDuration(1.5)).toBeNull();
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration("60")).toBeNull();
  });
});

describe("formatDurationCompact", () => {
  it("uses the short form", () => {
    expect(formatDurationCompact(2325)).toBe("38h 45m");
    expect(formatDurationCompact(450)).toBe("7h 30m");
    expect(formatDurationCompact(60)).toBe("1h");
    expect(formatDurationCompact(45)).toBe("45m");
    expect(formatDurationCompact(0)).toBe("0m");
  });

  it("returns null for values that are not a duration", () => {
    expect(formatDurationCompact(-1)).toBeNull();
    expect(formatDurationCompact(null)).toBeNull();
  });
});
