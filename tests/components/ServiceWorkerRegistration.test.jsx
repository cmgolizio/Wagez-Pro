// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

/** Say what this browser can do about service workers, and put it back after. */
function withServiceWorker(value) {
  Object.defineProperty(navigator, "serviceWorker", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("service worker registration", () => {
  it("hands Wagez to the worker that keeps it working offline", () => {
    const register = vi.fn(() => Promise.resolve());
    withServiceWorker({ register });

    render(<ServiceWorkerRegistration />);

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("waits for the page to finish loading first", () => {
    const register = vi.fn(() => Promise.resolve());
    withServiceWorker({ register });
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");

    render(<ServiceWorkerRegistration />);
    expect(register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("load"));
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("carries on where the browser will not register one", async () => {
    const register = vi.fn(() => Promise.reject(new Error("nope")));
    withServiceWorker({ register });

    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
    await expect(register.mock.results[0].value).rejects.toThrow();
  });

  it("does nothing at all in a browser without service workers", () => {
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });
});
