/*
  Wagez offline.

  Wagez does its arithmetic on the device and keeps its shifts there, so the
  only thing a network is ever needed for is fetching the application itself.
  This worker holds a copy of it, which is the whole of the offline story: once
  Wagez has loaded, it keeps working on a train, in a basement, or on a phone
  with the data switched off.

  The copy is taken when the worker installs, on the first visit, and kept up
  to date by ordinary use afterwards:

    the page          network first, falling back to the copy that was kept
    hashed files      cache first — a changed file arrives under a new name
    everything else   network first, keeping what comes back

  Network first for the page means an update is picked up the moment there is a
  connection to pick it up over: the cached copy is a fallback, never the first
  answer.
*/

/** Bump this to throw away everything kept under the old name. */
const CACHE = "wagez-v1";

/** The application. Wagez is one page, so this is all of it. */
const APP_SHELL = "/";

/** Files the build fingerprints. A given URL's contents never change. */
const IMMUTABLE = "/_next/static/";

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(takeOver());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only Wagez's own reads are ours to answer. A POST changes something
  // somewhere and must never be replayed from a cache, and another origin's
  // response is that origin's business.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(page(request));
  } else if (url.pathname.startsWith(IMMUTABLE)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

/**
 * Take a copy of Wagez as soon as the worker is installed, so the first time
 * it is opened offline is not also the first time it has been asked for
 * offline.
 *
 * A copy of the page on its own is a picture of Wagez rather than Wagez: the
 * markup names the stylesheet, the font and the scripts that make it work, and
 * without them an offline visit gets an empty screen. So the page is read for
 * the files it names and those are kept too.
 *
 * `reload` skips the browser's own HTTP cache: a reinstall happens because
 * something changed, and the point is to pick that change up.
 */
async function precache() {
  const cache = await caches.open(CACHE);
  const response = await fetch(new Request(APP_SHELL, { cache: "reload" }));
  if (!response.ok) throw new TypeError(`${APP_SHELL} came back not ok`);

  await cache.put(new Request(APP_SHELL), response.clone());
  await keepAssetsNamedBy(await response.text(), cache);

  // Wagez is small and self-contained; there is no half-updated state to wait
  // out, so a new worker takes over rather than queueing behind the old one.
  await self.skipWaiting();
}

/**
 * Keep the build's own files, as named by the page that needs them.
 *
 * Their names carry a hash the build chose, so they cannot be known ahead of
 * time and have to be read off the page itself. Only fingerprinted files are
 * taken — everything else on a page is either another origin's or something
 * that can be fetched when it is wanted.
 *
 * One that will not come back is left out rather than failing the install: a
 * Wagez missing one file offline is worth more than no offline Wagez, and the
 * request will be made again, and kept, the next time it is asked for.
 */
async function keepAssetsNamedBy(html, cache) {
  const named = new Set(
    [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map(([, url]) => url)
      .filter((url) => url.startsWith(IMMUTABLE)),
  );

  await Promise.allSettled([...named].map((url) => cache.add(url)));
}

/** Drop anything kept under an older name, and take over the open pages. */
async function takeOver() {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
  );
  await self.clients.claim();
}

/** Keep a response, if it is one worth keeping. */
async function keep(request, response) {
  if (!response.ok || response.type === "opaque") return;
  const cache = await caches.open(CACHE);
  await cache.put(request, response.clone());
}

async function match(request) {
  const cache = await caches.open(CACHE);
  return cache.match(request);
}

/**
 * The page. Kept under the one key whatever URL asked for it: Wagez has a
 * single page, so any way into it offline is a way into that copy.
 */
async function page(request) {
  try {
    const response = await fetch(request);
    await keep(new Request(APP_SHELL), response);
    return response;
  } catch (error) {
    const cached = await match(APP_SHELL);
    if (cached !== undefined) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await match(request);
  if (cached !== undefined) return cached;

  const response = await fetch(request);
  await keep(request, response);
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await keep(request, response);
    return response;
  } catch (error) {
    const cached = await match(request);
    if (cached !== undefined) return cached;
    throw error;
  }
}
