/**
 * The one copy of Wagez's saved data the running application reads from.
 *
 * Local storage is an external store: it exists outside React, it is already
 * there when the application starts, and it is not there at all while the page
 * is being rendered on the server. This wraps it as something React can
 * subscribe to, which keeps reading it out of effects — the device is read once
 * on demand, kept in memory, and written back whenever it changes.
 *
 * `ready` is how a caller tells the two apart: false on the snapshot the server
 * renders, true on every snapshot that actually came from the device. Anything
 * that would otherwise announce an empty week that isn't empty should wait for
 * it.
 */

import {
  defaultWagezData,
  loadWagezData,
  saveWagezData,
  validateStoredData,
} from "./wagezStorage";

/**
 * The snapshot the server renders with, and the one the client hydrates
 * against. Its identity must never change: React compares snapshots by
 * reference to decide whether anything has moved.
 */
const SERVER_SNAPSHOT = Object.freeze({ ready: false, ...defaultWagezData() });

let snapshot = null;
let lastSaveFailed = false;

const listeners = new Set();

/** What Wagez has saved on this device, read on first ask and kept after. */
export function getWagezSnapshot() {
  if (snapshot === null) {
    snapshot = { ready: true, ...loadWagezData() };
  }
  return snapshot;
}

/** What Wagez looks like where there is no device: empty, and not yet ready. */
export function getWagezServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function subscribeToWagez(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Change the saved data, write it to the device and tell everyone watching.
 *
 * @param {function} updater receives the current data and returns the next.
 */
export function updateWagezData(updater) {
  const current = getWagezSnapshot();
  // Held in memory exactly as it will be found on the device next time, so what
  // is on screen can never be something a reload would quietly drop.
  const next = { ready: true, ...validateStoredData(updater(current)) };

  if (!saveWagezData(next)) {
    lastSaveFailed = true;
    for (const listener of listeners) listener();
    return false;
  }
  snapshot = next;
  lastSaveFailed = false;
  for (const listener of listeners) listener();
  return true;
}

export function wagezSaveFailed() { return lastSaveFailed; }

/**
 * Forget what has been read, so the device is read again on the next ask.
 * Tests need this; the application never does.
 */
export function resetWagezStore() {
  snapshot = null;
  lastSaveFailed = false;
}
