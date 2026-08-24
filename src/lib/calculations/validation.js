/**
 * Shift input rules.
 *
 * Every rule that decides whether a shift can be calculated lives here, along
 * with the message the user sees. Validation also normalizes what it accepts,
 * so callers receive canonical values and never re-parse raw input themselves.
 */

import { isIsoDate } from "@/lib/dates/isoDate";

import { calculateElapsedMinutes, parseMinutes, parseTime } from "./time";
import { parseRateCents } from "./wages";

export const MESSAGES = {
  startMissing: "What is the start time?",
  startInvalid: "That start time doesn't look right.",
  endMissing: "What is the stop time?",
  endInvalid: "That stop time doesn't look right.",
  sameTime: "Start and stop time can't be the same.",
  rateNegative: "A pay rate can't be negative.",
  rateInvalid: "That pay rate doesn't look right.",
  breakNegative: "A break can't be negative.",
  breakInvalid: "That break doesn't look right.",
  breakTooLong: "That break is longer than the shift.",
  dateInvalid: "That date doesn't look right.",
};

/** Order used to pick the single headline message from several errors. */
const FIELD_ORDER = [
  "startTime",
  "endTime",
  "hourlyRate",
  "breakMinutes",
  "date",
];

/** True when the raw input is a negative value rather than merely unreadable. */
function isNegativeInput(value) {
  if (typeof value === "number") return value < 0;
  if (typeof value !== "string") return false;
  return value.trim().replace(/[$\s]/g, "").startsWith("-");
}

/** True for values the user simply hasn't filled in. */
export function isBlank(value) {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.trim() === "";
}

function validateTime(value, missingMessage, invalidMessage) {
  if (isBlank(value)) return { value: null, error: missingMessage };
  const time = parseTime(value);
  if (time === null) return { value: null, error: invalidMessage };
  return { value: time, error: null };
}

/**
 * An hourly rate is optional: a blank rate means "duration only", never zero.
 * `hourlyRateCents` wins over the raw `hourlyRate` when both are supplied, so
 * an already-normalized shift can be revalidated without a round trip through
 * display text.
 */
function validateRate({ hourlyRate, hourlyRateCents }) {
  if (!isBlank(hourlyRateCents)) {
    if (!Number.isInteger(hourlyRateCents) || hourlyRateCents < 0) {
      return {
        value: null,
        error:
          hourlyRateCents < 0 ? MESSAGES.rateNegative : MESSAGES.rateInvalid,
      };
    }
    return { value: hourlyRateCents, error: null };
  }

  if (isBlank(hourlyRate)) return { value: null, error: null };

  const cents = parseRateCents(hourlyRate);
  if (cents === null) {
    return {
      value: null,
      error: isNegativeInput(hourlyRate)
        ? MESSAGES.rateNegative
        : MESSAGES.rateInvalid,
    };
  }
  return { value: cents, error: null };
}

/** A break is optional and defaults to none. */
function validateBreak(value) {
  if (isBlank(value)) return { value: 0, error: null };

  const minutes = parseMinutes(value);
  if (minutes === null) {
    return {
      value: null,
      error: isNegativeInput(value)
        ? MESSAGES.breakNegative
        : MESSAGES.breakInvalid,
    };
  }
  return { value: minutes, error: null };
}

/** A date is optional; a standalone calculation never needs one. */
function validateDate(value) {
  if (isBlank(value)) return { value: null, error: null };
  if (!isIsoDate(value)) return { value: null, error: MESSAGES.dateInvalid };
  return { value, error: null };
}

/**
 * Validate and normalize the inputs of a single shift.
 *
 * @param {object} input
 * @param {*} [input.startTime] required, anything `parseTime` accepts
 * @param {*} [input.endTime] required
 * @param {*} [input.hourlyRate] optional raw rate, e.g. `"22.50"`
 * @param {*} [input.hourlyRateCents] optional normalized rate, e.g. `2250`
 * @param {*} [input.breakMinutes] optional unpaid break, defaults to none
 * @param {*} [input.date] optional `"YYYY-MM-DD"` start date
 * @returns {{ok: boolean, errors: object, message: string|null, values: object}}
 */
export function validateShiftInput(input = {}) {
  const errors = {};

  const start = validateTime(
    input.startTime,
    MESSAGES.startMissing,
    MESSAGES.startInvalid,
  );
  if (start.error) errors.startTime = start.error;

  const end = validateTime(
    input.endTime,
    MESSAGES.endMissing,
    MESSAGES.endInvalid,
  );
  if (end.error) errors.endTime = end.error;

  // A zero-length shift is a mistake, not a 24-hour shift.
  if (!start.error && !end.error && start.value === end.value) {
    errors.endTime = MESSAGES.sameTime;
  }

  const rate = validateRate(input);
  if (rate.error) errors.hourlyRate = rate.error;

  const unpaidBreak = validateBreak(input.breakMinutes);
  if (unpaidBreak.error) errors.breakMinutes = unpaidBreak.error;

  const date = validateDate(input.date);
  if (date.error) errors.date = date.error;

  // The break can only be measured against a shift that itself makes sense.
  if (!errors.startTime && !errors.endTime && !errors.breakMinutes) {
    const elapsedMinutes = calculateElapsedMinutes(start.value, end.value);
    if (unpaidBreak.value >= elapsedMinutes) {
      errors.breakMinutes = MESSAGES.breakTooLong;
    }
  }

  const headline = FIELD_ORDER.find((field) => errors[field]);

  return {
    ok: headline === undefined,
    errors,
    message: headline === undefined ? null : errors[headline],
    values: {
      startTime: start.value,
      endTime: end.value,
      hourlyRateCents: rate.value,
      breakMinutes: unpaidBreak.value,
      date: date.value,
    },
  };
}
