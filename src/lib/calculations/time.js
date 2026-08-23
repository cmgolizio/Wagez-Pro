/**
 * The Wagez time model.
 *
 * A time of day is always stored as a 24-hour `"HH:MM"` string, e.g. `"16:15"`.
 * Anything a user or component might supply — `"4:15 PM"`, `{ hour, minute }`,
 * a loose `"9:05"` — is converted here so the rest of the app only ever deals
 * with one representation.
 *
 * This module also owns arithmetic between two times of day, including the
 * overnight wrap. Display strings live in `lib/formatters/time.js`.
 */

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export const AM = "AM";
export const PM = "PM";

const CANONICAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const LOOSE_24_HOUR = /^(\d{1,2}):([0-5]\d)$/;
const TWELVE_HOUR = /^(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?m\.?$/i;
const WHOLE_NUMBER = /^\d+$/;

function pad(value) {
  return String(value).padStart(2, "0");
}

/** True when `value` is already a canonical `"HH:MM"` string. */
export function isTime(value) {
  return typeof value === "string" && CANONICAL_TIME.test(value);
}

/**
 * Build a canonical time from 24-hour parts.
 * @returns {string|null} `"HH:MM"`, or null when the parts are out of range.
 */
export function createTime(hour, minute) {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

function normalizeMeridiem(value) {
  if (typeof value !== "string") return null;
  const first = value.trim().toLowerCase().charAt(0);
  if (first === "a") return AM;
  if (first === "p") return PM;
  return null;
}

/**
 * Build a canonical time from 12-hour parts, e.g. `(4, 15, "PM")` -> `"16:15"`.
 * @returns {string|null}
 */
export function from12Hour(hour, minute, meridiem) {
  const period = normalizeMeridiem(meridiem);
  if (period === null) return null;
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
  const hour24 = (hour % 12) + (period === PM ? 12 : 0);
  return createTime(hour24, minute);
}

/**
 * Split a time into the 12-hour parts a time control edits.
 * @returns {{hour: number, minute: number, meridiem: string}|null}
 */
export function to12Hour(value) {
  const minutes = timeToMinutes(value);
  if (minutes === null) return null;
  const hour24 = Math.floor(minutes / MINUTES_PER_HOUR);
  return {
    hour: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute: minutes % MINUTES_PER_HOUR,
    meridiem: hour24 < 12 ? AM : PM,
  };
}

/**
 * Normalize any supported time input into a canonical `"HH:MM"` string.
 * @returns {string|null} null when the value cannot be understood.
 */
export function parseTime(value) {
  if (typeof value === "object" && value !== null) {
    return "meridiem" in value
      ? from12Hour(value.hour, value.minute, value.meridiem)
      : createTime(value.hour, value.minute);
  }

  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "") return null;

  const twelveHour = TWELVE_HOUR.exec(text);
  if (twelveHour) {
    const minute = twelveHour[2] === undefined ? 0 : Number(twelveHour[2]);
    return from12Hour(Number(twelveHour[1]), minute, twelveHour[3]);
  }

  const twentyFourHour = LOOSE_24_HOUR.exec(text);
  if (twentyFourHour) {
    return createTime(Number(twentyFourHour[1]), Number(twentyFourHour[2]));
  }

  return null;
}

/**
 * Minutes since midnight for a time of day.
 * @returns {number|null}
 */
export function timeToMinutes(value) {
  const time = parseTime(value);
  if (time === null) return null;
  const [hour, minute] = time.split(":");
  return Number(hour) * MINUTES_PER_HOUR + Number(minute);
}

/**
 * Inverse of {@link timeToMinutes}. Values outside a single day wrap around.
 * @returns {string|null}
 */
export function minutesToTime(minutes) {
  if (!Number.isInteger(minutes)) return null;
  const wrapped =
    ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return createTime(
    Math.floor(wrapped / MINUTES_PER_HOUR),
    wrapped % MINUTES_PER_HOUR,
  );
}

/**
 * Parse a whole-minute duration such as a break length.
 * @returns {number|null} a non-negative integer, or null.
 */
export function parseMinutes(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!WHOLE_NUMBER.test(text)) return null;
  return Number(text);
}

/**
 * Time worked between two times of day. When the end time is earlier than the
 * start time the shift is assumed to end the following day, so the result is
 * never negative. Identical times produce 0 — the caller decides whether that
 * is valid, Wagez never reads it as a 24-hour shift.
 * @returns {number|null}
 */
export function calculateElapsedMinutes(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return null;
  return (end - start + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** True when the shift runs past midnight into the next calendar day. */
export function crossesMidnight(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return false;
  return end < start;
}
