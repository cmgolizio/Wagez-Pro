"use client";

import { useCallback, useSyncExternalStore } from "react";
import { loadWagezData } from "@/lib/storage/wagezStorage";
import { createSavedShift } from "@/lib/shifts/savedShift";
import { createPaidTime, paidTimeKey } from "@/lib/shifts/paidTime";
import { shiftTimeKey } from "@/lib/adp/timecard";

import {
  getWagezServerSnapshot,
  getWagezSnapshot,
  subscribeToWagez,
  updateWagezData,
} from "@/lib/storage/wagezStore";

/**
 * Everything Wagez remembers, for as long as this browser remembers it.
 *
 * The store underneath is the device itself, so the first render — the one the
 * server produced and the client hydrates against — sees an empty Wagez, and
 * the real one arrives as soon as there is a browser to read it from. `ready`
 * says which of the two is on screen.
 */
export default function useWagezData() {
  const data = useSyncExternalStore(
    subscribeToWagez,
    getWagezSnapshot,
    getWagezServerSnapshot,
  );

  /** Add a shift to the week. */
  const addShift = useCallback((shift) => {
    return updateWagezData((current) => ({
      ...current,
      shifts: [...current.shifts, shift],
    }));
  }, []);

  /**
   * Replace a shift with an edited version of itself, found by its id — the
   * week is drawn in the order it was worked, never the order it is stored in,
   * so where a shift sits in this array means nothing.
   */
  const updateShift = useCallback((shift) => {
    return updateWagezData((current) => ({
      ...current,
      shifts: current.shifts.map((entry) =>
        entry.id === shift.id ? shift : entry,
      ),
    }));
  }, []);

  /**
   * Remember, or forget, the rate this Wagez opens on.
   *
   * Only ever what the user asked for: editing one shift's rate is that
   * shift's business, and never quietly becomes everybody's.
   *
   * @param {number|null} cents null to go back to having no default at all.
   */
  const setDefaultRateCents = useCallback((cents) => {
    updateWagezData((current) => ({
      ...current,
      settings: { ...current.settings, defaultHourlyRateCents: cents },
    }));
  }, []);

  /**
   * Change how overtime is worked out — switched on or off, or given a
   * different threshold or multiplier.
   *
   * Only what is named moves; the rest of the settings stay as they were.
   *
   * @param {object} changes any of `enabled`, `thresholdMinutes`, `multiplier`.
   */
  const saveEmployer = useCallback((employer) => {
    updateWagezData((current) => ({
      ...current,
      employers: current.employers.some((e) => e.id === employer.id)
        ? current.employers.map((e) => e.id === employer.id ? employer : e)
        : [...current.employers, employer],
    }));
  }, []);

  const deleteEmployer = useCallback((id) => {
    const current = getWagezSnapshot();
    if (current.shifts.some((shift) => shift.employerId === id) ||
        (current.paidTime ?? []).some((entry) => entry.employerId === id)) return false;
    updateWagezData((data) => ({
      ...data,
      employers: data.employers.filter((e) => e.id !== id),
      settings: {
        ...data.settings,
        defaultEmployerId: data.settings.defaultEmployerId === id
          ? null : data.settings.defaultEmployerId,
      },
    }));
    return true;
  }, []);

  const setDefaultEmployer = useCallback((id) => {
    updateWagezData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        defaultEmployerId: id,
      },
    }));
  }, []);

  /**
   * Append reviewed ADP punches in one validated storage transaction.
   * Never overwrite user-entered shifts or recalculate historical pay rates.
   */
  const importAdpShifts = useCallback((entries, employerId, rateCents) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return { ok: false, added: 0, message: "Choose at least one entry." };
    }
    const current = getWagezSnapshot();
    if (employerId && !current.employers.some((e) => e.id === employerId)) {
      return { ok: false, added: 0, message: "Choose an existing employer." };
    }
    if (rateCents !== null && (!Number.isSafeInteger(rateCents) || rateCents < 0)) {
      return { ok: false, added: 0, message: "The hourly rate is invalid." };
    }

    const existingKeys = new Set(current.shifts.map(shiftTimeKey));
    const existingDates = new Set(current.shifts.map((shift) => shift.date));
    const existingPaidKeys = new Set((current.paidTime ?? []).map(paidTimeKey));
    const submittedKeys = new Set();
    const additions = [];
    const holidays = [];
    let skipped = 0;

    for (const entry of entries) {
      if (entry.type === "holiday") {
        const candidate = createPaidTime({
          type: "holiday",
          date: entry.date,
          minutes: entry.minutes,
          hourlyRateCents: rateCents,
          employerId,
        });
        if (!candidate) {
          return { ok: false, added: 0, message: "Invalid paid holiday hours." };
        }
        const key = paidTimeKey(candidate);
        if (existingPaidKeys.has(key) || submittedKeys.has(key)) {
          skipped += 1;
          continue;
        }
        submittedKeys.add(key);
        holidays.push(candidate);
        continue;
      }
      const key = shiftTimeKey(entry);
      if (submittedKeys.has(key) || existingKeys.has(key) || existingDates.has(entry.date)) {
        skipped += 1;
        continue;
      }
      submittedKeys.add(key);
      const result = createSavedShift({
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        hourlyRateCents: rateCents,
        breakMinutes: 0,
        employerId,
      });
      if (!result.ok) {
        return { ok: false, added: 0, message: result.message ?? "A shift is invalid." };
      }
      additions.push(result.shift);
    }

    const imported = [...additions, ...holidays];
    if (!imported.length) {
      return { ok: true, added: 0, skipped, message: "All entries already exist or conflict." };
    }
    if (!updateWagezData((data) => ({
      ...data,
      shifts: [...data.shifts, ...additions],
      paidTime: [...(data.paidTime ?? []), ...holidays],
    }))) {
      return { ok: false, added: 0, message: "The browser could not save the entries." };
    }
    const persisted = loadWagezData();
    const shiftIds = new Set(persisted.shifts.map((shift) => shift.id));
    const holidayIds = new Set(persisted.paidTime.map((entry) => entry.id));
    if (!additions.every((shift) => shiftIds.has(shift.id)) ||
        !holidays.every((entry) => holidayIds.has(entry.id))) {
      return { ok: false, added: 0, message: "Import could not be verified in device storage." };
    }
    const newestDate = imported.reduce(
      (latest, entry) => entry.date > latest ? entry.date : latest,
      imported[0].date,
    );
    return { ok: true, added: imported.length, skipped, newestDate };
  }, []);

  const restoreData = useCallback((data) => {
    if (!updateWagezData(() => data)) return false;

    // Check the actual device storage, not only React's in-memory snapshot.
    // A confirmation must mean the shift records really survived the write.
    const saved = loadWagezData();
    if (saved.shifts.length !== data.shifts.length ||
        saved.employers.length !== data.employers.length ||
        saved.paidTime.length !== (data.paidTime?.length ?? 0)) return false;

    const byId = new Map(saved.shifts.map((shift) => [shift.id, shift]));
    return data.shifts.every((shift) => {
      const persisted = byId.get(shift.id);
      return persisted !== undefined &&
        persisted.date === shift.date &&
        persisted.startTime === shift.startTime &&
        persisted.endTime === shift.endTime &&
        persisted.hourlyRateCents === shift.hourlyRateCents &&
        persisted.breakMinutes === shift.breakMinutes;
    });
  }, []);

  /** Save the recurring pay period and payday, without touching any shift. */
  const setPayPeriod = useCallback((schedule) => {
    return updateWagezData((current) => ({
      ...current,
      settings: { ...current.settings, payPeriod: schedule },
    }));
  }, []);

  const setOvertime = useCallback((changes) => {
    updateWagezData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        overtime: { ...current.settings.overtime, ...changes },
      },
    }));
  }, []);

  /** Remove a paid holiday without changing worked shifts. */
  const removePaidTime = useCallback((id) => updateWagezData((current) => ({
    ...current,
    paidTime: (current.paidTime ?? []).filter((entry) => entry.id !== id),
  })), []);

  /** Take a shift out of the week for good. */
  const removeShift = useCallback((id) => {
    updateWagezData((current) => ({
      ...current,
      shifts: current.shifts.filter((entry) => entry.id !== id),
    }));
  }, []);

  return {
    ready: data.ready,
    saveFailed: data.saveFailed ?? false,
    shifts: data.shifts,
    paidTime: data.paidTime ?? [],
    employers: data.employers,
    settings: data.settings,
    addShift,
    updateShift,
    removeShift,
    removePaidTime,
    setDefaultRateCents,
    setOvertime,
    setPayPeriod,
    saveEmployer,
    deleteEmployer,
    setDefaultEmployer,
    restoreData,
    importAdpShifts,
  };
}
