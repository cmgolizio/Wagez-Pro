/**
 * A shift the user has saved into a week.
 *
 * A saved shift stores only what the user actually chose — date, start, end,
 * rate, break — plus an id and timestamps. Everything else (elapsed time, paid
 * time, pay) is derived on demand through the same calculation engine the
 * calculator uses, so a saved shift can never carry a derived value that has
 * drifted away from the inputs it came from.
 */

import { calculateShift } from "@/lib/calculations/shift";
import { validateShiftInput } from "@/lib/calculations/validation";
import { isIsoDate } from "@/lib/dates/isoDate";

/** The message shown when a shift is saved without the day it was worked. */
export const DATE_REQUIRED = "Which day was this shift?";

/**
 * A unique id for a saved shift.
 *
 * `crypto.randomUUID` is the right answer where it exists; it is missing in
 * insecure contexts, so there is a plain random fallback rather than a crash.
 *
 * @returns {string}
 */
export function createShiftId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `shift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Turn what the user has been editing into a saved shift.
 *
 * The shift is validated exactly as a calculation would be, and additionally
 * needs the day it was worked: a week is chronological, so a shift without a
 * date has nowhere to go.
 *
 * @param {object} input `date`, `startTime`, `endTime`, `hourlyRate` or
 *   `hourlyRateCents`, `breakMinutes`.
 * @returns {{ok: boolean, errors: object, message: string|null, shift: object|null}}
 */
export function createSavedShift(input = {}) {
  const { ok, errors, message, values } = validateShiftInput(input);

  if (values.date === null) {
    const dated = { ...errors, date: errors.date ?? DATE_REQUIRED };
    return {
      ok: false,
      errors: dated,
      message: message ?? dated.date,
      shift: null,
    };
  }
  if (!ok) return { ok: false, errors, message, shift: null };

  const timestamp = new Date().toISOString();

  return {
    ok: true,
    errors: {},
    message: null,
    shift: {
      id: createShiftId(),
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      hourlyRateCents: values.hourlyRateCents,
      breakMinutes: values.breakMinutes,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

/**
 * Everything a saved shift implies: elapsed time, paid time and pay.
 *
 * @returns {object|null} null when the stored shift no longer makes sense.
 */
export function deriveShift(shift) {
  if (shift === null || typeof shift !== "object") return null;
  const { ok, result } = calculateShift(shift);
  return ok ? result : null;
}

/**
 * Read a shift back out of storage, keeping only what is genuinely usable.
 *
 * Anything that fails here is dropped rather than repaired: a single corrupted
 * entry must not take the rest of the week down with it.
 *
 * @returns {object|null}
 */
export function normalizeSavedShift(value) {
  if (value === null || typeof value !== "object") return null;
  if (typeof value.id !== "string" || value.id === "") return null;
  if (!isIsoDate(value.date)) return null;

  const { ok, values } = validateShiftInput({
    date: value.date,
    startTime: value.startTime,
    endTime: value.endTime,
    hourlyRateCents: value.hourlyRateCents,
    breakMinutes: value.breakMinutes,
  });
  if (!ok) return null;

  const createdAt =
    typeof value.createdAt === "string" ? value.createdAt : undefined;
  const updatedAt =
    typeof value.updatedAt === "string" ? value.updatedAt : createdAt;

  return {
    id: value.id,
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    hourlyRateCents: values.hourlyRateCents,
    breakMinutes: values.breakMinutes,
    createdAt: createdAt ?? new Date(0).toISOString(),
    updatedAt: updatedAt ?? new Date(0).toISOString(),
  };
}
