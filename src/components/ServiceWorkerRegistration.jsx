"use client";

import { useEffect } from "react";

/** Where the worker lives. Served from `public/`, so it is scoped to the site. */
const WORKER = "/sw.js";

/**
 * Hands Wagez to the service worker that keeps it working offline.
 *
 * Renders nothing. Registration waits for the page to finish loading — the
 * worker's own install fetches the page again to keep a copy, and that is not
 * a fetch worth putting in front of the first Do Math.
 *
 * A browser with no service workers at all — an insecure origin, a private
 * window in some browsers, an older phone — simply has no offline copy.
 * Nothing else about Wagez depends on it.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    if (process.env.NODE_ENV === "development") {
      // The dev server and `npm start` share an origin, so a worker left
      // behind by the built app would answer for the one being worked on.
      navigator.serviceWorker.getRegistrations().then(
        (registrations) => {
          for (const registration of registrations) registration.unregister();
        },
        () => {},
      );
      return undefined;
    }

    const register = () => {
      // A failed registration is a Wagez without an offline copy, which is
      // still a working Wagez. There is nothing to tell the user.
      navigator.serviceWorker.register(WORKER).catch(() => {});
    };

    if (document.readyState === "complete") {
      register();
      return undefined;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
