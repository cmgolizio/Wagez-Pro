/**
 * Duration display. Wagez says "7 hours + 32 min." — keep that voice.
 */

import { MINUTES_PER_HOUR } from "@/lib/calculations/time";

function split(minutes) {
  return {
    hours: Math.floor(minutes / MINUTES_PER_HOUR),
    minutes: minutes % MINUTES_PER_HOUR,
  };
}

function isDuration(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Long form for the result display: `"1 hour."`, `"45 min."`,
 * `"7 hours + 32 min."`.
 * @returns {string|null}
 */
export function formatDuration(totalMinutes) {
  if (!isDuration(totalMinutes)) return null;

  const { hours, minutes } = split(totalMinutes);
  if (hours === 0) return `${minutes} min.`;

  const hoursText = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return minutes === 0 ? `${hoursText}.` : `${hoursText} + ${minutes} min.`;
}

/**
 * Compact form for tight spaces such as weekly summaries: `"38h 45m"`.
 * @returns {string|null}
 */
export function formatDurationCompact(totalMinutes) {
  if (!isDuration(totalMinutes)) return null;

  const { hours, minutes } = split(totalMinutes);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
