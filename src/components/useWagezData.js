"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  clearWagez,
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
    updateWagezData((current) => ({
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
    updateWagezData((current) => ({
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
  const setOvertime = useCallback((changes) => {
    updateWagezData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        overtime: { ...current.settings.overtime, ...changes },
      },
    }));
  }, []);

  /**
   * Change which day a week begins on.
   *
   * Nothing saved moves: a shift belongs to the day it was worked, and the
   * weeks are only ever the lines drawn around those days as they are read.
   *
   * @param {string} day `"sunday"` or `"monday"`.
   */
  const setWeekStartsOn = useCallback((day) => {
    updateWagezData((current) => ({
      ...current,
      settings: { ...current.settings, weekStartsOn: day },
    }));
  }, []);

  /** Take a shift out of the week for good. */
  const removeShift = useCallback((id) => {
    updateWagezData((current) => ({
      ...current,
      shifts: current.shifts.filter((entry) => entry.id !== id),
    }));
  }, []);

  /** Forget everything this device has saved. */
  const clearData = useCallback(() => {
    clearWagez();
  }, []);

  return {
    ready: data.ready,
    shifts: data.shifts,
    settings: data.settings,
    addShift,
    updateShift,
    removeShift,
    setDefaultRateCents,
    setWeekStartsOn,
    setOvertime,
    clearData,
  };
}
