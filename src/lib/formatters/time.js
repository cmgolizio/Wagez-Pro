/**
 * Time-of-day display.
 */

import { to12Hour } from "@/lib/calculations/time";

/**
 * Format a canonical time for the big display, e.g. `"16:15"` -> `"4:15 PM"`.
 * @returns {string|null}
 */
export function formatTime(value) {
  const parts = to12Hour(value);
  if (parts === null) return null;
  return `${parts.hour}:${String(parts.minute).padStart(2, "0")} ${parts.meridiem}`;
}
