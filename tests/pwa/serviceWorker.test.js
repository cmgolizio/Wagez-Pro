import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The service worker, driven the way a browser drives it.
 *
 * The worker is a script rather than a module — it registers its handlers
 * against the global scope it is loaded into — so the tests build a scope of
 * their own, load the real file into it, and then fire the events a browser
 * fires: install, activate, and a fetch for every kind of thing Wagez asks
 * for. Nothing here is a re-implementation of the worker; it is the shipped
 * file, running.
 */

const ORIGIN = "https://wagez.test";

const SHELL = `${ORIGIN}/`;

/** A hashed build file, i.e. one whose contents can never change. */
const CHUNK = `${ORIGIN}/_next/static/chunks/app.9f3c.js`;

/** The real `Request`, kept before the scoped one takes its place. */
const NativeRequest = Request;

/**
 * A `Request` that resolves relative URLs, which is what a worker's own
 * `Request` does and what the worker relies on for `new Request("/")`.
 */
class ScopedRequest extends NativeRequest {
  constructor(input, init) {
    super(
      typeof input === "string" ? new URL(input, ORIGIN).href : input,
      init,
    );
  }
}

/** The URL a cache entry is filed under. */
const key = (request) =>
  typeof request === "string" ? new URL(request, ORIGIN).href : request.url;

/**
 * `caches`, in memory. Kept deliberately literal — a name to a set of
 * responses — so what the tests assert about it is what the browser would
 * have stored.
 */
function fakeCaches() {
  const named = new Map();

  const open = async (name) => {
    if (!named.has(name)) named.set(name, new Map());
    const entries = named.get(name);

    return {
      async add(request) {
        const response = await fetch(request);
        if (!response.ok) throw new TypeError("failed to fetch");
        entries.set(key(request), response);
      },
      async put(request, response) {
        entries.set(key(request), response);
      },
      async match(request) {
        return entries.get(key(request))?.clone();
      },
    };
  };

  return {
    named,
    open,
    keys: async () => [...named.keys()],
    delete: async (name) => named.delete(name),
  };
}

/** The global scope a service worker runs in. */
function fakeScope() {
  const handlers = new Map();
  return {
    handlers,
    addEventListener: (type, handler) => handlers.set(type, handler),
    location: new URL(ORIGIN),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
}

/**
 * Load the worker into a fresh scope.
 *
 * `network` stands in for the internet: what it returns is what a fetch
 * returns, and a rejection is a device with no connection.
 */
async function loadWorker(network) {
  const scope = fakeScope();
  const caches = fakeCaches();
  const fetch = vi.fn(network);

  vi.stubGlobal("self", scope);
  vi.stubGlobal("caches", caches);
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("Request", ScopedRequest);

  vi.resetModules();
  await import("../../public/sw.js");

  const dispatch = async (type, event) => {
    const waited = [];
    await scope.handlers.get(type)({
      ...event,
      waitUntil: (promise) => waited.push(promise),
    });
    await Promise.all(waited);
  };

  return {
    caches,
    fetch,
    scope,

    install: () => dispatch("install", {}),
    activate: () => dispatch("activate", {}),

    /** What the worker answers a request with, or undefined if it passes. */
    async request(url, { mode = "same-origin", method = "GET" } = {}) {
      const request = new ScopedRequest(url, { method });
      // `navigate` cannot be asked for through the constructor, but it is what
      // the browser marks a page load with, so it is set directly.
      Object.defineProperty(request, "mode", { value: mode });

      let answer;
      scope.handlers.get("fetch")({
        request,
        respondWith: (value) => {
          answer = value;
        },
      });
      return answer;
    },

    /** Everything currently kept, as URL to body text. */
    async kept() {
      const [name] = await caches.keys();
      const entries = caches.named.get(name) ?? new Map();
      const stored = await Promise.all(
        [...entries].map(async ([url, response]) => [
          url,
          await response.clone().text(),
        ]),
      );
      return Object.fromEntries(stored);
    },
  };
}

/** A connection that serves `body` for anything asked of it. */
const serving = (body) => async () => new Response(body, { status: 200 });

/** A connection serving a site: a body per path, and 404 for anything else. */
const site = (bodies) => async (request) => {
  const { pathname } = new URL(key(request));
  return pathname in bodies
    ? new Response(bodies[pathname], { status: 200 })
    : new Response("not found", { status: 404 });
};

/** A Wagez page, naming the files a build gives it. */
const PAGE = `<!doctype html><html><head>
  <link rel="stylesheet" href="/_next/static/chunks/wagez.4b21.css"/>
  <link rel="preload" as="font" href="/_next/static/media/geist.9a1c.woff2"/>
  <script src="/_next/static/chunks/wagez.9f3c.js"></script>
  <script src="https://example.com/somewhere-else.js"></script>
  </head><body>Wagez</body></html>`;

/** Everything `PAGE` needs, as a site would serve it. */
const SITE = {
  "/": PAGE,
  "/_next/static/chunks/wagez.4b21.css": ".wagez{}",
  "/_next/static/media/geist.9a1c.woff2": "font",
  "/_next/static/chunks/wagez.9f3c.js": "wagez()",
};

/** No connection at all. */
const offline = async () => {
  throw new TypeError("Failed to fetch");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("service worker", () => {
  it("keeps a copy of Wagez as soon as it is installed", async () => {
    const worker = await loadWorker(site(SITE));

    await worker.install();

    expect(await worker.kept()).toEqual({
      [SHELL]: PAGE,
      [`${ORIGIN}/_next/static/chunks/wagez.4b21.css`]: ".wagez{}",
      [`${ORIGIN}/_next/static/media/geist.9a1c.woff2`]: "font",
      [`${ORIGIN}/_next/static/chunks/wagez.9f3c.js`]: "wagez()",
    });
    expect(worker.scope.skipWaiting).toHaveBeenCalled();
  });

  it("installs anyway when one of those files will not come back", async () => {
    const worker = await loadWorker(
      site({ ...SITE, "/_next/static/chunks/wagez.9f3c.js": undefined }),
    );

    await expect(worker.install()).resolves.not.toThrow();

    expect(Object.keys(await worker.kept())).toContain(
      `${ORIGIN}/_next/static/chunks/wagez.4b21.css`,
    );
  });

  it("throws away copies kept under an older name", async () => {
    const worker = await loadWorker(site(SITE));
    await worker.caches.open("wagez-v0");

    await worker.activate();

    expect(await worker.caches.keys()).not.toContain("wagez-v0");
    expect(worker.scope.clients.claim).toHaveBeenCalled();
  });

  it("serves the page from the network, and keeps what it served", async () => {
    const worker = await loadWorker(site(SITE));
    await worker.install();
    worker.fetch.mockImplementation(serving("<html>newest</html>"));

    const response = await worker.request(SHELL, { mode: "navigate" });

    expect(await response.text()).toBe("<html>newest</html>");
    expect((await worker.kept())[SHELL]).toBe("<html>newest</html>");
  });

  it("serves the kept page when there is no network", async () => {
    const worker = await loadWorker(site(SITE));
    await worker.install();
    worker.fetch.mockImplementation(offline);

    const response = await worker.request(SHELL, { mode: "navigate" });

    expect(await response.text()).toBe(PAGE);
  });

  it("has everything the kept page needs alongside it", async () => {
    const worker = await loadWorker(site(SITE));
    await worker.install();
    worker.fetch.mockImplementation(offline);

    const stylesheet = await worker.request(
      `${ORIGIN}/_next/static/chunks/wagez.4b21.css`,
    );

    expect(await stylesheet.text()).toBe(".wagez{}");
  });

  it("answers hashed build files from the copy it has", async () => {
    const worker = await loadWorker(serving("chunk()"));

    await worker.request(CHUNK);
    worker.fetch.mockImplementation(offline);
    const response = await worker.request(CHUNK);

    expect(await response.text()).toBe("chunk()");
    expect(worker.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to the copy it has for everything else", async () => {
    const worker = await loadWorker(serving("{}"));

    await worker.request(`${ORIGIN}/manifest.webmanifest`);
    worker.fetch.mockImplementation(offline);
    const response = await worker.request(`${ORIGIN}/manifest.webmanifest`);

    expect(await response.text()).toBe("{}");
    // Not a hashed file, so it is asked for again every time there is a
    // network to ask over.
    expect(worker.fetch).toHaveBeenCalledTimes(2);
  });

  it("fails like the network does when it has nothing to fall back on", async () => {
    const worker = await loadWorker(offline);

    await expect(worker.request(`${ORIGIN}/never-seen`)).rejects.toThrow(
      TypeError,
    );
  });

  it("leaves other origins alone", async () => {
    const worker = await loadWorker(serving("elsewhere"));

    expect(await worker.request("https://example.com/thing")).toBeUndefined();
  });

  it("never answers for anything but a read", async () => {
    const worker = await loadWorker(serving("ok"));

    expect(await worker.request(SHELL, { method: "POST" })).toBeUndefined();
  });
});
