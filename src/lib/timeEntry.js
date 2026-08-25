/**
 * Editing a time one segment at a time.
 *
 * The Wagez time control shows three segments — hour, minute, AM/PM — and the
 * user types straight into them. These helpers decide what a typed digit or an
 * arrow key means, and convert between the segments and the canonical
 * `"HH:MM"` time the rest of the app uses. They are pure: no React, no DOM.
 */

import { AM, PM, from12Hour, to12Hour } from "@/lib/calculations/time";

const NON_DIGITS = /\D/g;

/** The segments of a time nobody has entered yet. */
export const EMPTY_PARTS = { hour: "", minute: "", meridiem: AM };

/** The minutes worth a single tap. Any other minute is still typeable. */
export const QUICK_MINUTES = ["00", "15", "30", "45"];

function pad(value) {
  return String(value).padStart(2, "0");
}

/**
 * The digits of what is now in the segment. More than two means the user kept
 * typing past a full segment, which reads as starting over.
 */
function typedDigits(text) {
  const digits = typeof text === "string" ? text.replace(NON_DIGITS, "") : "";
  return digits.length > 2 ? digits.slice(-1) : digits;
}

/**
 * Split a canonical time into editable segments.
 *
 * `defaultMeridiem` is the half of the day an empty field opens on. A shift
 * usually stops in the afternoon, so the stop time starts on PM while the start
 * time keeps the AM it has always had.
 */
export function toParts(value, defaultMeridiem = AM) {
  const parts = to12Hour(value);
  if (parts === null) return { ...EMPTY_PARTS, meridiem: defaultMeridiem };
  return {
    hour: String(parts.hour),
    minute: pad(parts.minute),
    meridiem: parts.meridiem,
  };
}

/**
 * Compose segments back into a canonical time.
 * @returns {string} `"HH:MM"`, or `""` while the time is still incomplete.
 */
export function partsToTime(parts) {
  if (parts.hour === "" || parts.minute === "") return "";
  const time = from12Hour(
    Number(parts.hour),
    Number(parts.minute),
    parts.meridiem,
  );
  return time === null ? "" : time;
}

/**
 * Read what the user typed into the hour segment.
 *
 * A two-digit 24-hour value is welcome — typing `16` means 4 PM — because that
 * is what people reach for on a numeric keypad. `done` reports that the segment
 * cannot take another digit, which is when focus should move along.
 *
 * @returns {{hour: string, meridiem: string, done: boolean}}
 */
export function typeHour(text, meridiem) {
  const typed = typedDigits(text);
  if (typed === "") return { hour: "", meridiem, done: false };

  const value = Number(typed);
  // A lone 1 could still become 10, 11 or 12; a lone 0 could become 01–09.
  if (typed.length === 1) return { hour: typed, meridiem, done: value >= 2 };

  if (value === 0) return { hour: "12", meridiem: AM, done: true };
  if (value <= 12) return { hour: String(value), meridiem, done: true };
  if (value <= 23)
    return { hour: String(value - 12), meridiem: PM, done: true };

  const last = typed.slice(-1);
  return { hour: last, meridiem, done: Number(last) >= 2 };
}

/**
 * Read what the user typed into the minute segment. Every minute from 00 to 59
 * is reachable.
 *
 * @returns {{minute: string, done: boolean}}
 */
export function typeMinute(text) {
  const typed = typedDigits(text);
  if (typed === "") return { minute: "", done: false };

  const value = Number(typed);
  // A lone 0–5 could still become 00–59.
  if (typed.length === 1) return { minute: typed, done: value >= 6 };
  if (value <= 59) return { minute: typed, done: true };

  const last = typed.slice(-1);
  return { minute: last, done: Number(last) >= 6 };
}

/** Nudge the hour, wrapping around the 12-hour clock. */
export function stepHour(hour, delta) {
  if (hour === "") return delta > 0 ? "1" : "12";
  return String(((((Number(hour) + delta - 1) % 12) + 12) % 12) + 1);
}

/** Nudge the minute, wrapping around the hour. */
export function stepMinute(minute, delta) {
  if (minute === "") return delta > 0 ? "00" : "59";
  return pad((((Number(minute) + delta) % 60) + 60) % 60);
}

/** The half of the day this one is not. */
export function otherMeridiem(meridiem) {
  return meridiem === PM ? AM : PM;
}

/**
 * Tidy the segments once the user leaves the control: a lone 0 in the hour is
 * midnight's 12 AM, and a single-digit minute is really 0-something.
 */
export function normalizeParts(parts) {
  const midnightHour = parts.hour === "0";
  return {
    hour: midnightHour ? "12" : parts.hour,
    meridiem: midnightHour ? AM : parts.meridiem,
    minute: parts.minute.length === 1 ? pad(parts.minute) : parts.minute,
  };
}
