import { describe, expect, it } from "vitest";
import {
  createPaidTime, normalizePaidTime, paidTimeKey,
  sumPaidTime, withPaidTime,
} from "@/lib/shifts/paidTime";
import { summarizeShifts } from "@/lib/shifts/week";
import { createSavedShift } from "@/lib/shifts/savedShift";
import {
  defaultWagezData, loadWagezData, saveWagezData,
} from "@/lib/storage/wagezStorage";
import { payPeriodDetails } from "@/lib/pay-periods/biweekly";

const holiday = {
  type: "holiday", date: "2026-11-26",
  minutes: 480, hourlyRateCents: 2500, employerId: "one",
};
const schedule = { anchorStart: "2026-11-21", anchorPayday: "2026-12-11" };

describe("paid HOLIDAY", () => {
  it("preserves arbitrary credited time categories without reclassifying them", () => {
    const training = createPaidTime({
      ...holiday, type: "training", date: "2026-11-09", minutes: 210,
    });
    const jury = createPaidTime({
      ...holiday, type: "jury-duty", date: "2026-11-10", minutes: 120,
    });
    const noHours = createPaidTime({
      ...holiday, type: "on-call", date: "2026-11-11", minutes: 0,
    });
    expect(normalizePaidTime(training)).toEqual(training);
    expect(normalizePaidTime(jury)).toEqual(jury);
    expect(normalizePaidTime(noHours)).toEqual(noHours);
    const totals = withPaidTime(summarizeShifts([]), [training, jury, noHours]);
    expect(totals.paidTimeCount).toBe(3);
    expect(totals.paidTimeMinutes).toBe(330);
    expect(totals.paidTimePayCents).toBe(13750);
    expect(totals.paidMinutes).toBe(0);
    expect(totals.categories.map((category) => category.type)).toEqual([
      "jury-duty", "on-call", "training",
    ]);
  });

  it("stores vacation separately from holiday and includes both in gross pay", () => {
    const vacation = createPaidTime({ ...holiday, date: "2026-11-12", type: "vacation" });
    const holidayEntry = createPaidTime(holiday);
    expect(vacation).toMatchObject({ type: "vacation", minutes: 480 });
    expect(normalizePaidTime(vacation)).toEqual(vacation);
    expect(paidTimeKey(vacation)).toBe("vacation|2026-11-12|one");
    const totals = withPaidTime(summarizeShifts([]), [vacation, holidayEntry]);
    expect(totals.vacationCount).toBe(1);
    expect(totals.vacationMinutes).toBe(480);
    expect(totals.vacationPayCents).toBe(20000);
    expect(totals.holidayCount).toBe(1);
    expect(totals.holidayMinutes).toBe(480);
    expect(totals.holidayPayCents).toBe(20000);
    expect(totals.paidTimePayCents).toBe(40000);
    expect(totals.payCents).toBe(40000);
    expect(totals.paidMinutes).toBe(0);
    expect(totals.overtimeMinutes).toBe(0);
  });

  it("retains two vacation records through storage and pay periods", () => {
    const vacations = [
      createPaidTime({ ...holiday, type: "vacation", date: "2026-11-12" }),
      createPaidTime({ ...holiday, type: "vacation", date: "2026-11-13" }),
    ];
    const data = defaultWagezData();
    data.paidTime = vacations;
    const map = new Map();
    const storage = {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
    };
    expect(saveWagezData(data, storage)).toBe(true);
    const restored = loadWagezData(storage);
    expect(restored.paidTime).toEqual(vacations);
    const details = payPeriodDetails([], {
      anchorStart: "2026-11-07", anchorPayday: "2026-11-27",
    }, "2026-11-12", { paidTime: restored.paidTime });
    expect(details.totals.vacationCount).toBe(2);
    expect(details.totals.vacationMinutes).toBe(960);
    expect(details.totals.vacationPayCents).toBe(40000);
    expect(details.totals.paidMinutes).toBe(0);
  });

  it("stores eight paid hours without inventing clock punches", () => {
    const saved = createPaidTime(holiday);
    expect(saved).toMatchObject(holiday);
    expect(saved.startTime).toBeUndefined();
    expect(saved.endTime).toBeUndefined();
    expect(paidTimeKey(saved)).toBe("holiday|2026-11-26|one");
    expect(normalizePaidTime(saved)).toEqual(saved);
  });

  it("adds holiday earnings but does not increase worked or overtime hours", () => {
    const result = createSavedShift({
      date: "2026-11-23", startTime: "09:00", endTime: "17:00", hourlyRate: "25",
    });
    expect(result.ok).toBe(true);
    const wages = summarizeShifts([result.shift], {
      enabled: true, thresholdMinutes: 60, multiplier: 1.5,
    });
    const totals = withPaidTime(wages, [createPaidTime(holiday)]);
    expect(totals.paidMinutes).toBe(480);
    expect(totals.holidayMinutes).toBe(480);
    expect(totals.holidayPayCents).toBe(20000);
    expect(totals.payCents).toBe(wages.payCents + 20000);
    expect(totals.overtimeMinutes).toBe(wages.overtimeMinutes);
  });

  it("includes holiday pay in the correct biweekly pay period", () => {
    const details = payPeriodDetails([], schedule, "2026-11-26", {
      paidTime: [createPaidTime(holiday)],
      employerId: "employer:one",
    });
    expect(details.totals.shiftCount).toBe(0);
    expect(details.totals.holidayCount).toBe(1);
    expect(details.totals.payCents).toBe(20000);
    expect(details.totals.paidMinutes).toBe(0);
    expect(details.weeks[0].totals.holidayCount).toBe(1);
    expect(details.weeks[1].totals.holidayCount).toBe(0);
  });

  it("preserves holiday entries in local backup storage", () => {
    const data = defaultWagezData();
    data.paidTime = [createPaidTime(holiday)];
    const map = new Map();
    const storage = {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
    };
    expect(saveWagezData(data, storage)).toBe(true);
    expect(loadWagezData(storage).paidTime).toEqual(data.paidTime);
    expect(loadWagezData(storage).shifts).toEqual([]);
  });

  it("never assumes a rate for holiday entries without one", () => {
    const item = createPaidTime({ ...holiday, hourlyRateCents: null });
    expect(sumPaidTime([item])).toMatchObject({
      holidayCount: 1, holidayMinutes: 480,
      holidayUnknownRates: 1, holidayPayCents: null,
    });
    expect(withPaidTime(summarizeShifts([]), [item]).payCents).toBeNull();
  });
});
