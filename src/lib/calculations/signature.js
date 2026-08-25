/**
 * A deterministic key for everything a calculation depends on.
 *
 * Two drafts share a signature exactly when "Do Math." would put the same
 * numbers on screen for both. Retyping `$20` as `$20.00` is therefore not a
 * change, while blanking a time is — and two rates Wagez cannot read are the
 * same change, because both produce the same complaint.
 *
 * Comparing the current draft against the signature taken when a result was
 * made is how Wagez knows the result on screen has gone stale. Nothing here
 * calculates: it only asks the validator what it makes of the input.
 */

import { validateShiftInput } from "./validation";

/**
 * Fixed order, so the same shift always spells the same key.
 *
 * The date is deliberately absent. Dating a shift changes nothing the result
 * says — the same hours for the same money — so a result made before the day
 * was chosen is still a true answer to the question on screen. Including it
 * would stale a perfectly good result the moment the user reached for
 * "Add to week", which is exactly when the day gets chosen.
 */
const VALUE_FIELDS = [
  "startTime",
  "endTime",
  "hourlyRateCents",
  "breakMinutes",
];

/**
 * Reduce shift input to a comparable string.
 *
 * @param {object} input the same shape {@link validateShiftInput} accepts.
 * @returns {string}
 */
export function shiftSignature(input = {}) {
  const { errors, values } = validateShiftInput(input);

  const normalized = VALUE_FIELDS.map((field) =>
    values[field] === null ? `${field}=` : `${field}=${values[field]}`,
  );
  const complaints = Object.keys(errors)
    .sort()
    .map((field) => `${field}!${errors[field]}`);

  return [...normalized, ...complaints].join("|");
}
