import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

/** Where `public/` is served from, so the icons can be looked for on disk. */
const publicFile = (path) =>
  fileURLToPath(new URL(`../../public${path}`, import.meta.url));

/**
 * A manifest is only worth having if a device will install from it: a name to
 * put under the icon, an icon big enough to draw, somewhere to start, and a
 * window of its own. These are the parts a browser actually checks.
 */
describe("web app manifest", () => {
  const contents = manifest();

  it("names the application", () => {
    expect(contents.name).toBe("Wagez");
    expect(contents.short_name).toBe("Wagez");
    expect(contents.description).toMatch(/Do Math\./);
  });

  it("opens the calculator in a window of its own", () => {
    expect(contents.start_url).toBe("/");
    expect(contents.scope).toBe("/");
    expect(contents.display).toBe("standalone");
  });

  it("is painted in the Wagez gradient's own colours", () => {
    expect(contents.theme_color).toBe("#00ffd0");
    expect(contents.background_color).toBe("#00ffd0");
  });

  it("offers an icon large enough to install with", () => {
    const installable = contents.icons.filter(
      (icon) =>
        icon.purpose === "any" &&
        icon.sizes.split("x").every((side) => Number(side) >= 192),
    );

    expect(installable.length).toBeGreaterThan(0);
  });

  it("offers an icon a device may crop to its own shape", () => {
    const maskable = contents.icons.find((icon) => icon.purpose === "maskable");

    expect(maskable).toBeDefined();
    expect(maskable.sizes).toBe("512x512");
  });

  it("points at icons that are actually there", () => {
    for (const icon of contents.icons) {
      expect(existsSync(publicFile(icon.src)), icon.src).toBe(true);
    }

    expect(existsSync(publicFile("/icons/apple-touch-icon.png"))).toBe(true);
  });
});
