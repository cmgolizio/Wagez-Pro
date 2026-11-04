import { describe, expect, it } from "vitest";

import { DEFAULT_OVERTIME } from "@/lib/calculations/overtime";
import { SUNDAY } from "@/lib/dates/isoDate";
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  clearWagezData,
  defaultWagezData,
  loadWagezData,
  migrateStoredData,
  saveWagezData,
  validateStoredData,
} from "@/lib/storage/wagezStorage";

/** A stand-in for the browser's local storage, including the ways it fails. */
function fakeStorage(initial = {}, { throwOnWrite = false } = {}) {
  const entries = new Map(Object.entries(initial));

  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => {
      if (throwOnWrite) throw new Error("QuotaExceededError");
      entries.set(key, String(value));
    },
    removeItem: (key) => entries.delete(key),
    has: (key) => entries.has(key),
    raw: (key) => entries.get(key),
  };
}

const SHIFT = {
  id: "abc",
  date: "2026-08-17",
  startTime: "16:00",
  endTime: "23:30",
  hourlyRateCents: 2000,
  breakMinutes: 0,
  createdAt: "2026-08-17T23:35:00.000Z",
  updatedAt: "2026-08-17T23:35:00.000Z",
};

function stored(data) {
  return { [STORAGE_KEY]: JSON.stringify(data) };
}

describe("defaults", () => {
  it("starts empty, at the current version", () => {
    expect(defaultWagezData()).toEqual({
      version: STORAGE_VERSION,
      // No rate of its own: Wagez opens on nothing until it is told otherwise,
      // and overtime is off until somebody asks for it.
      settings: {
        defaultHourlyRateCents: null,
        weekStartsOn: SUNDAY,
        overtime: DEFAULT_OVERTIME,
        defaultEmployerId: null,
      },
      employers: [],
      shifts: [],
    });
  });

  it("loads defaults when nothing has ever been saved", () => {
    expect(loadWagezData(fakeStorage())).toEqual(defaultWagezData());
  });

  it("loads defaults when there is no storage at all", () => {
    expect(loadWagezData(null)).toEqual(defaultWagezData());
  });
});

describe("loading", () => {
  it("reads back what was saved", () => {
    const storage = fakeStorage(
      stored({
        version: STORAGE_VERSION,
        settings: { weekStartsOn: "monday" },
        shifts: [SHIFT],
      }),
    );

    const data = loadWagezData(storage);

    expect(data.settings.weekStartsOn).toBe("monday");
    expect(data.shifts).toEqual([SHIFT]);
  });

  it("does not crash on malformed JSON", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: "{not json" });

    expect(loadWagezData(storage)).toEqual(defaultWagezData());
  });

  it("does not crash on a version it cannot read", () => {
    const storage = fakeStorage(stored({ version: 99, shifts: [SHIFT] }));

    expect(loadWagezData(storage)).toEqual(defaultWagezData());
  });

  it("does not crash on the wrong shape entirely", () => {
    expect(loadWagezData(fakeStorage({ [STORAGE_KEY]: '"hello"' }))).toEqual(
      defaultWagezData(),
    );
    expect(loadWagezData(fakeStorage({ [STORAGE_KEY]: "null" }))).toEqual(
      defaultWagezData(),
    );
  });

  it("does not crash when reading throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
    };

    expect(loadWagezData(storage)).toEqual(defaultWagezData());
  });

  it("keeps the good shifts and drops the broken one", () => {
    const storage = fakeStorage(
      stored({
        version: STORAGE_VERSION,
        settings: {},
        shifts: [SHIFT, { id: "bad", date: "Monday" }, null],
      }),
    );

    expect(loadWagezData(storage).shifts).toEqual([SHIFT]);
  });
});

describe("saving", () => {
  it("writes data that loads back identically", () => {
    const storage = fakeStorage();
    const data = { ...defaultWagezData(), shifts: [SHIFT] };

    expect(saveWagezData(data, storage)).toBe(true);
    expect(loadWagezData(storage)).toEqual(data);
  });

  it("never writes a shift it would refuse to read", () => {
    const storage = fakeStorage();
    saveWagezData(
      { ...defaultWagezData(), shifts: [SHIFT, { id: "bad" }] },
      storage,
    );

    expect(JSON.parse(storage.raw(STORAGE_KEY)).shifts).toEqual([SHIFT]);
  });

  it("says so, rather than throwing, when the device refuses", () => {
    const storage = fakeStorage({}, { throwOnWrite: true });

    expect(saveWagezData(defaultWagezData(), storage)).toBe(false);
  });

  it("says so when there is no storage at all", () => {
    expect(saveWagezData(defaultWagezData(), null)).toBe(false);
  });
});

describe("clearing", () => {
  it("removes everything Wagez has saved", () => {
    const storage = fakeStorage(
      stored({ version: STORAGE_VERSION, settings: {}, shifts: [SHIFT] }),
    );

    expect(clearWagezData(storage)).toBe(true);
    expect(storage.has(STORAGE_KEY)).toBe(false);
    expect(loadWagezData(storage)).toEqual(defaultWagezData());
  });
});

describe("settings", () => {
  it("keeps a saved default rate through a round trip", () => {
    const storage = fakeStorage();

    saveWagezData(
      { ...defaultWagezData(), settings: { defaultHourlyRateCents: 2250 } },
      storage,
    );

    expect(loadWagezData(storage).settings.defaultHourlyRateCents).toBe(2250);
  });

  it("allows a rate of nothing, which somebody could mean", () => {
    expect(
      validateStoredData({ settings: { defaultHourlyRateCents: 0 } }).settings
        .defaultHourlyRateCents,
    ).toBe(0);
  });

  it("reads a rate it did not write as no default at all", () => {
    for (const value of [-1, 22.5, "2200", null, {}]) {
      expect(
        validateStoredData({ settings: { defaultHourlyRateCents: value } })
          .settings.defaultHourlyRateCents,
      ).toBeNull();
    }
  });

  it("costs nobody their week when a setting is simply not there yet", () => {
    const data = loadWagezData(
      fakeStorage(
        stored({
          version: STORAGE_VERSION,
          settings: { weekStartsOn: SUNDAY },
          shifts: [SHIFT],
        }),
      ),
    );

    expect(data.settings.defaultHourlyRateCents).toBeNull();
    // Overtime arrived after this week was saved, and the week is untouched.
    expect(data.settings.overtime).toEqual(DEFAULT_OVERTIME);
    expect(data.shifts).toHaveLength(1);
  });
});

describe("overtime settings", () => {
  const overtime = { enabled: true, thresholdMinutes: 2250, multiplier: 2 };

  it("is switched off on a Wagez nobody has configured", () => {
    expect(defaultWagezData().settings.overtime.enabled).toBe(false);
  });

  it("keeps a threshold and a multiplier through a round trip", () => {
    const storage = fakeStorage();

    saveWagezData({ ...defaultWagezData(), settings: { overtime } }, storage);

    expect(loadWagezData(storage).settings.overtime).toEqual(overtime);
  });

  it("reads settings it did not write as the defaults", () => {
    for (const value of [null, "on", { enabled: true, multiplier: 0 }]) {
      const settings = validateStoredData({ settings: { overtime: value } })
        .settings.overtime;

      expect(settings.thresholdMinutes).toBe(DEFAULT_OVERTIME.thresholdMinutes);
      expect(settings.multiplier).toBe(DEFAULT_OVERTIME.multiplier);
    }
  });
});

describe("validateStoredData", () => {
  it("falls back to the default week start for anything unrecognised", () => {
    expect(
      validateStoredData({ settings: { weekStartsOn: "tuesday" } }),
    ).toEqual(defaultWagezData());
    expect(validateStoredData({ settings: null }).settings.weekStartsOn).toBe(
      SUNDAY,
    );
  });

  it("refuses a second shift claiming an id that is taken", () => {
    const data = validateStoredData({
      shifts: [SHIFT, { ...SHIFT, startTime: "09:00" }],
    });

    expect(data.shifts).toHaveLength(1);
    expect(data.shifts[0].startTime).toBe("16:00");
  });

  it("copes with shifts that are not a list", () => {
    expect(validateStoredData({ shifts: "none" }).shifts).toEqual([]);
    expect(validateStoredData(undefined)).toEqual(defaultWagezData());
  });
});

describe("migrateStoredData", () => {
  it("passes through data at the current version", () => {
    const data = { version: STORAGE_VERSION, settings: {}, shifts: [] };

    expect(migrateStoredData(data)).toBe(data);
  });

  it("refuses data from a version it does not know", () => {
    expect(migrateStoredData({ version: 0 })).toBeNull();
    expect(migrateStoredData({ shifts: [] })).toBeNull();
    expect(migrateStoredData(null)).toBeNull();
  });
});

describe("employer data is backwards compatible", () => {
  it("preserves all historical shifts with no employer and the same key", () => {
    const old = { version: 1, settings: { weekStartsOn: SUNDAY }, shifts: [SHIFT] };
    const storage = fakeStorage(stored(old));
    const loaded = loadWagezData(storage);
    expect(STORAGE_KEY).toBe("wagez:v2");
    expect(loaded.shifts).toEqual([SHIFT]);
    expect(loaded.employers).toEqual([]);
    expect(loaded.settings.defaultEmployerId).toBeNull();
  });

  it("round-trips employers and a selected default without changing rates", () => {
    const employer = { id: "a", name: "Bistro", hourlyRateCents: 2450 };
    const shifts = [{ ...SHIFT, employerId: "a" }];
    const storage = fakeStorage();
    expect(saveWagezData({
      ...defaultWagezData(),
      employers: [employer],
      shifts,
      settings: { defaultEmployerId: "a", defaultHourlyRateCents: null },
    }, storage)).toBe(true);
    const loaded = loadWagezData(storage);
    expect(loaded.employers).toEqual([employer]);
    expect(loaded.settings.defaultEmployerId).toBe("a");
    expect(loaded.shifts[0].hourlyRateCents).toBe(2000);
    expect(loaded.shifts[0].employerId).toBe("a");
  });

  it("does not invent a default when the referenced employer is absent", () => {
    const data = validateStoredData({
      employers: [], settings: { defaultEmployerId: "missing" }, shifts: [SHIFT],
    });
    expect(data.settings.defaultEmployerId).toBeNull();
    expect(data.shifts).toEqual([SHIFT]);
  });

  it("rejects duplicate and malformed employers without deleting shifts", () => {
    const data = validateStoredData({
      employers: [
        { id: "x", name: "Cafe", hourlyRateCents: 1300 },
        { id: "x", name: "Duplicate", hourlyRateCents: 999 },
        { id: "y", name: "", hourlyRateCents: 1200 },
        { id: "z", name: "Bad rate", hourlyRateCents: -1 },
      ],
      shifts: [SHIFT],
    });
    expect(data.employers).toEqual([{ id: "x", name: "Cafe", hourlyRateCents: 1300 }]);
    expect(data.shifts).toEqual([SHIFT]);
  });
});
