/**
 * Wagez on the device.
 *
 * Everything Wagez remembers lives under one versioned key in local storage.
 * There is no account, no backend and nothing to sync: saved shifts and
 * settings belong to the browser they were entered in.
 *
 * Reading is defensive by design. Local storage is shared, editable and easy to
 * corrupt, so anything unreadable, out of date or malformed falls back to clean
 * defaults instead of taking the application down with it.
 */

import { SUNDAY, MONDAY } from "@/lib/dates/isoDate";
import { normalizeSavedShift } from "@/lib/shifts/savedShift";

export const STORAGE_KEY = "wagez:v2";

export const STORAGE_VERSION = 1;

/**
 * A Wagez nobody has configured: no rate of its own, and a week that begins on
 * a Sunday. `defaultHourlyRateCents` is null rather than zero — zero is a rate
 * somebody could mean, and Wagez never invents one.
 */
export const DEFAULT_SETTINGS = {
  defaultHourlyRateCents: null,
  weekStartsOn: SUNDAY,
};

const WEEK_STARTS = [SUNDAY, MONDAY];

/** A fresh, empty Wagez. */
export function defaultWagezData() {
  return {
    version: STORAGE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    shifts: [],
  };
}

/**
 * The browser's local storage, or null where there isn't one.
 *
 * Server rendering has no storage at all, and a browser with site data blocked
 * throws on the property itself rather than on the call.
 */
function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * The rate new shifts open on, in whole cents.
 *
 * Anything else — a decimal, a string, a negative — is not a rate Wagez wrote,
 * so it is read as no default at all rather than repaired into one.
 */
function normalizeDefaultRate(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function normalizeSettings(value) {
  const settings = value === null || typeof value !== "object" ? {} : value;
  return {
    defaultHourlyRateCents: normalizeDefaultRate(
      settings.defaultHourlyRateCents,
    ),
    weekStartsOn: WEEK_STARTS.includes(settings.weekStartsOn)
      ? settings.weekStartsOn
      : DEFAULT_SETTINGS.weekStartsOn,
  };
}

/**
 * Coerce anything into usable Wagez data.
 *
 * Valid shifts survive alongside broken ones; a shift that cannot be read is
 * dropped, as is a second shift claiming an id that is already taken.
 *
 * @returns {{version: number, settings: object, shifts: object[]}}
 */
export function validateStoredData(value) {
  if (value === null || typeof value !== "object") return defaultWagezData();

  const seen = new Set();
  const shifts = [];

  for (const entry of Array.isArray(value.shifts) ? value.shifts : []) {
    const shift = normalizeSavedShift(entry);
    if (shift === null || seen.has(shift.id)) continue;
    seen.add(shift.id);
    shifts.push(shift);
  }

  return {
    version: STORAGE_VERSION,
    settings: normalizeSettings(value.settings),
    shifts,
  };
}

/**
 * Bring stored data up to the current schema version.
 *
 * There is only one version so far, so this is a gate rather than a migration:
 * data from a version Wagez does not know how to read is refused, and the
 * caller starts clean instead of guessing at its shape.
 *
 * A setting that is merely absent is not a different version: settings are
 * normalized to their defaults on the way in, so adding one costs nobody the
 * week they had already saved.
 *
 * @returns {object|null} null when the data cannot be brought forward.
 */
export function migrateStoredData(value) {
  if (value === null || typeof value !== "object") return null;
  if (value.version !== STORAGE_VERSION) return null;
  return value;
}

/**
 * Everything Wagez has saved on this device.
 *
 * @param {Storage} [storage] injectable for tests; defaults to local storage.
 * @returns {{version: number, settings: object, shifts: object[]}} clean
 *   defaults whenever there is nothing readable to load.
 */
export function loadWagezData(storage = browserStorage()) {
  if (storage === null) return defaultWagezData();

  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return defaultWagezData();
  }
  if (raw === null || raw === undefined) return defaultWagezData();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultWagezData();
  }

  const migrated = migrateStoredData(parsed);
  if (migrated === null) return defaultWagezData();

  return validateStoredData(migrated);
}

/**
 * Write Wagez data back to the device.
 *
 * @returns {boolean} whether it was actually stored — a full or unavailable
 *   store is worth knowing about, but never worth crashing over.
 */
export function saveWagezData(data, storage = browserStorage()) {
  if (storage === null) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(validateStoredData(data)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Forget everything: saved shifts and settings both.
 * @returns {boolean} whether the key was actually removed.
 */
export function clearWagezData(storage = browserStorage()) {
  if (storage === null) return false;

  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
