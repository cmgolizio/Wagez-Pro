/**
 * What a device needs to know to install Wagez.
 *
 * Next serves this at `/manifest.webmanifest` and links it from every page.
 *
 * Installed Wagez is the same Wagez: one screen, no navigation of its own, no
 * network. `standalone` drops the browser chrome so the gradient runs to the
 * edges of the phone, and the colours are the gradient's own — the splash
 * screen a device paints before the app appears is the middle of it.
 */
export default function manifest() {
  return {
    id: "/",
    name: "Wagez",
    short_name: "Wagez",
    description:
      "Enter a shift, press Do Math., and see how long you worked and what you made.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#00ffd0",
    theme_color: "#00ffd0",
    lang: "en-US",
    dir: "ltr",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android crops icons to its own shape, so this one keeps the mark
      // inside the safe zone and lets the gradient take the cropping.
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
