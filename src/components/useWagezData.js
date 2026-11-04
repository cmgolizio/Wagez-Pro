"use client";

import { useCallback, useSyncExternalStore } from "react";

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

  const restoreData = useCallback((data) => {
    return updateWagezData(() => data);
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
  };
}
