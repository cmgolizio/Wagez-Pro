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
  if (!Number.isSafeInteger(value.minutes) || value.minutes < 0 || value.minutes > 1440) return null;
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
  const result = {
    holidayCount: 0, holidayMinutes: 0, holidayPayCents: null, holidayUnknownRates: 0,
    vacationCount: 0, vacationMinutes: 0, vacationPayCents: null, vacationUnknownRates: 0,
    paidTimeCount: entries.length, paidTimeMinutes: 0,
    paidTimePayCents: null, paidTimeUnknownRates: 0, categories: [],
  };
  const groups = new Map();
  for (const entry of entries) {
    const group = groups.get(entry.type) ?? {
      type: entry.type, count: 0, minutes: 0, payCents: null, unknownRates: 0,
    };
    group.count += 1;
    group.minutes += entry.minutes;
    result.paidTimeMinutes += entry.minutes;
    if (entry.hourlyRateCents === null) {
      group.unknownRates += 1;
      result.paidTimeUnknownRates += 1;
    } else {
      const pay = calculatePayCents(entry.minutes, entry.hourlyRateCents);
      group.payCents = (group.payCents ?? 0) + pay;
      result.paidTimePayCents = (result.paidTimePayCents ?? 0) + pay;
    }
    groups.set(entry.type, group);
  }
  result.categories = [...groups.values()].sort((a, b) => a.type.localeCompare(b.type));
  for (const type of ["holiday", "vacation"]) {
    const group = groups.get(type);
    if (!group) continue;
    result[`${type}Count`] = group.count;
    result[`${type}Minutes`] = group.minutes;
    result[`${type}PayCents`] = group.payCents;
    result[`${type}UnknownRates`] = group.unknownRates;
  }
  return result;
}

export function withPaidTime(totals, entries = []) {
  const paid = sumPaidTime(entries);
  return {
    ...totals,
    ...paid,
    payCents: paid.paidTimePayCents === null
      ? totals.payCents
      : (totals.payCents ?? 0) + paid.paidTimePayCents,
  };
}
