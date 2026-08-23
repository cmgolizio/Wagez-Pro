/**
 * Single-shift calculation.
 *
 * `calculateShift` is the one entry point the UI needs: give it what the user
 * typed, get back either friendly errors or a fully derived shift. Nothing in
 * here touches React, the DOM or storage.
 */

import { addDays } from "@/lib/dates/isoDate";

import { calculateElapsedMinutes, crossesMidnight } from "./time";
import { validateShiftInput } from "./validation";
import { calculatePayCents } from "./wages";

/**
 * Paid time is elapsed time minus the unpaid break.
 * @returns {number|null} null when the numbers cannot produce paid time.
 */
export function calculatePaidMinutes(elapsedMinutes, breakMinutes = 0) {
  if (!Number.isInteger(elapsedMinutes) || elapsedMinutes < 0) return null;
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0) return null;
  if (breakMinutes > elapsedMinutes) return null;
  return elapsedMinutes - breakMinutes;
}

/**
 * Calculate one shift.
 *
 * @param {object} input see {@link validateShiftInput} for accepted fields.
 * @returns {{ok: boolean, errors: object, message: string|null, result: object|null}}
 *   On success `result` holds canonical inputs plus every derived value:
 *   `elapsedMinutes`, `paidMinutes`, `crossesMidnight`, `endDate` and
 *   `basePayCents` — which stays null when no rate was given, because Wagez
 *   never invents an hourly rate.
 */
export function calculateShift(input = {}) {
  const { ok, errors, message, values } = validateShiftInput(input);
  if (!ok) {
    return { ok: false, errors, message, result: null };
  }

  const { startTime, endTime, hourlyRateCents, breakMinutes, date } = values;
  const elapsedMinutes = calculateElapsedMinutes(startTime, endTime);
  const paidMinutes = calculatePaidMinutes(elapsedMinutes, breakMinutes);
  const overnight = crossesMidnight(startTime, endTime);

  return {
    ok: true,
    errors: {},
    message: null,
    result: {
      startTime,
      endTime,
      date,
      // An overnight shift finishes on the following calendar day.
      endDate: date === null ? null : overnight ? addDays(date, 1) : date,
      crossesMidnight: overnight,
      hourlyRateCents,
      breakMinutes,
      elapsedMinutes,
      paidMinutes,
      basePayCents:
        hourlyRateCents === null
          ? null
          : calculatePayCents(paidMinutes, hourlyRateCents),
    },
  };
}
