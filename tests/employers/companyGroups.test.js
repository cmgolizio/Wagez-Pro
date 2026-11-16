import { describe, expect, it } from "vitest";

import {
  companyGroups,
  companyNameFor,
  matchesEmployerFilter,
} from "@/lib/employers/company";
import { createSavedShift } from "@/lib/shifts/savedShift";
import { payPeriodDetails } from "@/lib/pay-periods/biweekly";
import {
  defaultWagezData,
  loadWagezData,
  saveWagezData,
} from "@/lib/storage/wagezStorage";

const employers = [
  { id: "server", name: "Restaurant - Server", hourlyRateCents: 500, companyName: "Restaurant" },
  { id: "manager", name: "Restaurant - Manager", hourlyRateCents: 2500, companyName: "restaurant" },
  { id: "shop", name: "Coffee Shop", hourlyRateCents: 2000 },
];
const schedule = { anchorStart: "2026-10-24", anchorPayday: "2026-11-13" };

function shift(date, employerId, hourlyRate, tip = "") {
  const result = createSavedShift({
    date,
    startTime: "09:00",
    endTime: "17:00",
    hourlyRate,
    tip,
    employerId,
  });
  expect(result.ok).toBe(true);
  return result.shift;
}

describe("companies with multiple hourly-rate profiles", () => {
  it("groups profiles by company without merging or altering their rates", () => {
    const groups = companyGroups(employers);
    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.key === "restaurant").profileIds).toEqual([
      "server",
      "manager",
    ]);
    expect(companyNameFor(employers[2])).toBe("Coffee Shop");
    expect(employers[0].hourlyRateCents).toBe(500);
    expect(employers[1].hourlyRateCents).toBe(2500);
  });

  it("filters on company or an individual rate profile", () => {
    const server = shift("2026-10-25", "server", "5");
    const manager = shift("2026-10-26", "manager", "25");
    const shop = shift("2026-10-27", "shop", "20");
    const shifts = [server, manager, shop];
    expect(shifts.filter((entry) => matchesEmployerFilter(entry, "company:restaurant", employers))).toHaveLength(2);
    expect(shifts.filter((entry) => matchesEmployerFilter(entry, "employer:server", employers))).toEqual([server]);
    expect(shifts.filter((entry) => matchesEmployerFilter(entry, "company:coffee shop", employers))).toEqual([shop]);
    expect(shifts.filter((entry) => matchesEmployerFilter(entry, "all", employers))).toHaveLength(3);
    expect(matchesEmployerFilter(shop, "server", employers)).toBe(false);
  });

  it("counts both rate profiles in one pay period, including their tips", () => {
    const shifts = [
      shift("2026-10-25", "server", "5", "40.00"),
      shift("2026-11-02", "manager", "25"),
      shift("2026-11-03", "shop", "20"),
    ];
    const combined = payPeriodDetails(shifts, schedule, "2026-10-28", {
      employerId: "company:restaurant", employers,
    });
    expect(combined.totals.shiftCount).toBe(2);
    expect(combined.totals.tipCents).toBe(4000);
    expect(combined.totals.payCents).toBe(28000);
    expect(combined.weeks.map((week) => week.totals.shiftCount)).toEqual([1, 1]);
    const oneRole = payPeriodDetails(shifts, schedule, "2026-10-28", {
      employerId: "employer:server", employers,
    });
    expect(oneRole.totals.payCents).toBe(8000);
  });

  it("preserves historical shifts and company labels through backup storage", () => {
    const data = defaultWagezData();
    data.employers = employers;
    data.shifts = [shift("2026-10-25", "server", "5"), shift("2026-10-26", "manager", "25")];
    const records = new Map();
    const fakeStorage = {
      setItem: (key, value) => records.set(key, value),
      getItem: (key) => records.get(key) ?? null,
    };
    expect(saveWagezData(data, fakeStorage)).toBe(true);
    const saved = loadWagezData(fakeStorage);
    expect(saved.employers[0].companyName).toBe("Restaurant");
    expect(saved.employers[1].companyName).toBe("restaurant");
    expect(saved.employers[2].companyName).toBeUndefined();
    expect(saved.shifts).toEqual(data.shifts);
    expect(companyGroups(saved.employers)).toHaveLength(2);
  });

  it("does not discard the old employer records without company names", () => {
    const data = defaultWagezData();
    data.employers = [
      { id: "a", name: "Old Job", hourlyRateCents: 1500 },
      { id: "b", name: "Old Job - Night", hourlyRateCents: 2000 },
    ];
    const records = new Map();
    const fakeStorage = {
      setItem: (key, value) => records.set(key, value),
      getItem: (key) => records.get(key) ?? null,
    };
    expect(saveWagezData(data, fakeStorage)).toBe(true);
    expect(loadWagezData(fakeStorage).employers).toEqual(data.employers);
    expect(companyGroups(loadWagezData(fakeStorage).employers)).toHaveLength(2);
  });
});
