/**
 * Paid non-worked time (currently ADP HOLIDAY).
 * No clock punches are invented. Minutes are paid but NOT worked or overtime
 * eligible. A saved hourly rate is copied at import, like worked shifts.
 */
import { isIsoDate } from "@/lib/dates/isoDate";
import { calculatePayCents } from "@/lib/calculations/wages";

export function normalizePaidTime(value) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.id !== "string" || !value.id || !isIsoDate(value.date)) return null;
  if (value.type !== "holiday") return null;
  if (!Number.isSafeInteger(value.minutes) || value.minutes <= 0 || value.minutes > 1440) return null;
  if (value.hourlyRateCents !== null &&
      (!Number.isSafeInteger(value.hourlyRateCents) || value.hourlyRateCents < 0)) return null;
  return {
    id: value.id,
    date: value.date,
    type: "holiday",
    minutes: value.minutes,
    hourlyRateCents: value.hourlyRateCents,
    ...(typeof value.employerId === "string" && value.employerId
      ? { employerId: value.employerId } : {}),
  };
}

export function createPaidTime(input) {
  const draft = normalizePaidTime({
    ...input,
    id: `paid-${typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
  });
  return draft;
}

export function paidTimeKey(entry) {
  return `${entry.type}|${entry.date}|${entry.employerId ?? ""}`;
}

export function sumPaidTime(entries = []) {
  const minutes = entries.reduce((total, entry) => total + entry.minutes, 0);
  const known = entries.filter((entry) => entry.hourlyRateCents !== null);
  return {
    holidayCount: entries.length,
    holidayMinutes: minutes,
    holidayPayCents: known.length ? known.reduce(
      (total, entry) => total + calculatePayCents(entry.minutes, entry.hourlyRateCents),
      0,
    ) : null,
    holidayUnknownRates: entries.length - known.length,
  };
}

export function withPaidTime(totals, entries = []) {
  const paid = sumPaidTime(entries);
  return {
    ...totals,
    ...paid,
    payCents: paid.holidayPayCents === null
      ? totals.payCents
      : (totals.payCents ?? 0) + paid.holidayPayCents,
  };
}
