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

  /** Take a shift out of the week for good. */
  const removeShift = useCallback((id) => {
    updateWagezData((current) => ({
      ...current,
      shifts: current.shifts.filter((entry) => entry.id !== id),
    }));
  }, []);

  return {
    ready: data.ready,
    shifts: data.shifts,
    settings: data.settings,
    addShift,
    updateShift,
    removeShift,
  };
}
