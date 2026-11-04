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
import { parseTime, timeToMinutes } from "@/lib/calculations/time";
import { validateShiftInput } from "@/lib/calculations/validation";
import { addDays, isIsoDate, todayIsoDate } from "@/lib/dates/isoDate";
import { formatRateInput } from "@/lib/formatters/currency";

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
 * The day a shift was worked, worked out rather than asked for.
 *
 * Wagez is written in the past tense: a shift is something you have finished,
 * not something you are planning. So the answer is simply the last time this
 * shift could have happened — today if it has already started today, and
 * yesterday if it has not.
 *
 * That one rule covers the whole of it, overnight shifts included. Logging
 * 10 PM → 3 AM at half past three in the morning gives yesterday, because ten
 * last night is the only ten there has been. Logging a nine-to-five over
 * breakfast gives yesterday for the same reason. Logging either one an hour
 * after finishing gives today.
 *
 * It is a suggestion, never a decision: whatever comes back is shown to the
 * user and is one press away from being changed.
 *
 * @param {object} shift anything carrying a `startTime`.
 * @param {Date} [now]
 * @returns {string} `"YYYY-MM-DD"`
 */
export function suggestShiftDate(shift = {}, now = new Date()) {
  const today = todayIsoDate(now);
  const startMinutes = timeToMinutes(parseTime(shift.startTime));
  if (startMinutes === null) return today;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // The shift has not started yet today, so today is not when it happened.
  return nowMinutes < startMinutes ? addDays(today, -1) : today;
}

/**
 * What a shift must be to be worth saving.
 *
 * Everything a calculation asks for, plus the day it was worked: a week is
 * chronological, so a shift without a date has nowhere to go.
 */
function validateSavedShiftInput(input) {
  const { ok, errors, message, values } = validateShiftInput(input);

  if (values.date === null) {
    const dated = { ...errors, date: errors.date ?? DATE_REQUIRED };
    return {
      ok: false,
      errors: dated,
      message: message ?? dated.date,
      values,
    };
  }

  return { ok, errors, message, values };
}

/** The source-of-truth fields, taken from validated input. */
function shiftValues(values) {
  return {
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    hourlyRateCents: values.hourlyRateCents,
    breakMinutes: values.breakMinutes,
  };
}

/**
 * Turn what the user has been editing into a saved shift.
 *
 * @param {object} input `date`, `startTime`, `endTime`, `hourlyRate` or
 *   `hourlyRateCents`, `breakMinutes`.
 * @returns {{ok: boolean, errors: object, message: string|null, shift: object|null}}
 */
export function createSavedShift(input = {}) {
  const { ok, errors, message, values } = validateSavedShiftInput(input);
  if (!ok) return { ok: false, errors, message, shift: null };

  const timestamp = new Date().toISOString();

  return {
    ok: true,
    errors: {},
    message: null,
    shift: {
      id: createShiftId(),
      ...shiftValues(values),
      ...(input.employerId ? { employerId: input.employerId } : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

/**
 * Change a shift that is already in a week.
 *
 * The shift keeps its identity: the same id, and the same record of when it
 * was first saved. Only the values the user actually edited move, and they are
 * validated exactly as a new shift would be — there is no such thing as a saved
 * shift that would not calculate. Nothing derived is stored, so the week
 * recalculates itself from the new values the moment they land.
 *
 * @param {object} shift the shift as it currently stands.
 * @param {object} input the same shape {@link createSavedShift} accepts.
 * @returns {{ok: boolean, errors: object, message: string|null, shift: object|null}}
 */
export function updateSavedShift(shift, input = {}) {
  const { ok, errors, message, values } = validateSavedShiftInput(input);
  if (!ok) return { ok: false, errors, message, shift: null };

  return {
    ok: true,
    errors: {},
    message: null,
    shift: {
      ...shift,
      ...shiftValues(values),
      employerId: input.employerId || null,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * A saved shift as an editor's fields: the rate and the break become the text
 * they were typed as, and everything else is already in the form the controls
 * speak. A shift with no break has an empty break field, which is what the
 * calculator's own empty field means.
 */
export function shiftDraft(shift) {
  return {
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    hourlyRate: formatRateInput(shift.hourlyRateCents),
    employerId: shift.employerId ?? "",
    breakMinutes: shift.breakMinutes === 0 ? "" : String(shift.breakMinutes),
  };
}

/**
 * The same shift again, a day later.
 *
 * Duplicating is for the shift somebody works again tomorrow, so that is the
 * day it opens on — a suggestion the user can change before saving, not a
 * decision. Nothing is created here: the copy only becomes a shift of its own,
 * with an id of its own, once it is saved.
 */
export function duplicateDraft(shift) {
  return { ...shiftDraft(shift), date: addDays(shift.date, 1) ?? shift.date };
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
    ...(typeof value.employerId === "string" && value.employerId !== "" ? { employerId: value.employerId } : {}),
    createdAt: createdAt ?? new Date(0).toISOString(),
    updatedAt: updatedAt ?? new Date(0).toISOString(),
  };
}
