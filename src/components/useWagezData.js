"use client";

import { useCallback, useSyncExternalStore } from "react";
import { loadWagezData } from "@/lib/storage/wagezStorage";
import { createSavedShift } from "@/lib/shifts/savedShift";
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
    if (current.shifts.some((shift) => shift.employerId === id)) return false;
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
      return { ok: false, added: 0, message: "Choose at least one shift." };
    }
    if (employerId && !getWagezSnapshot().employers.some((e) => e.id === employerId)) {
      return { ok: false, added: 0, message: "Choose an existing employer." };
    }
    if (rateCents !== null && (!Number.isSafeInteger(rateCents) || rateCents < 0)) {
      return { ok: false, added: 0, message: "The hourly rate is invalid." };
    }

    const current = getWagezSnapshot();
    const existingKeys = new Set(current.shifts.map(shiftTimeKey));
    const existingDates = new Set(current.shifts.map((shift) => shift.date));
    const submitted = new Set();
    const additions = [];
    let skipped = 0;

    for (const entry of entries) {
      const key = shiftTimeKey(entry);
      if (submitted.has(key) || existingKeys.has(key) || existingDates.has(entry.date)) {
        skipped += 1;
        continue;
      }
      submitted.add(key);
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

    if (!additions.length) {
      return { ok: true, added: 0, skipped, message: "All selected shifts are already saved or conflict with existing dates." };
    }

    if (!updateWagezData((data) => ({
      ...data,
      shifts: [...data.shifts, ...additions],
    }))) {
      return { ok: false, added: 0, message: "The browser could not save these shifts. Your existing data is unchanged." };
    }

    const persisted = new Set(loadWagezData().shifts.map((shift) => shift.id));
    if (!additions.every((shift) => persisted.has(shift.id))) {
      return { ok: false, added: 0, message: "Import could not be verified in device storage. Check your saved shifts before retrying." };
    }
    const newestDate = additions.reduce(
      (max, shift) => shift.date > max ? shift.date : max,
      additions[0].date,
    );
    return { ok: true, added: additions.length, skipped, newestDate };
  }, []);

  const restoreData = useCallback((data) => {
    if (!updateWagezData(() => data)) return false;

    // Check the actual device storage, not only React's in-memory snapshot.
    // A confirmation must mean the shift records really survived the write.
    const saved = loadWagezData();
    if (saved.shifts.length !== data.shifts.length ||
        saved.employers.length !== data.employers.length) return false;

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

  const setOvertime = useCallback((changes) => {
    updateWagezData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        overtime: { ...current.settings.overtime, ...changes },
      },
    }));
  }, []);

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
    employers: data.employers,
    settings: data.settings,
    addShift,
    updateShift,
    removeShift,
    setDefaultRateCents,
    setOvertime,
    saveEmployer,
    deleteEmployer,
    setDefaultEmployer,
    restoreData,
    importAdpShifts,
  };
}
