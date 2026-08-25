"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * A floor, only so a bad measurement cannot shrink the app to nothing. It is
 * set below anything a real viewport asks for: fitting the screen is the
 * promise, and a clipped calculator would break it.
 */
const MIN_FIT = 0.3;

/** Shrinking changes what has to fit, so converge rather than divide once. */
const MAX_PASSES = 8;

/** Guarantees progress when the overflow is small enough to round away. */
const MAX_STEP = 0.995;

/**
 * Keep a region's contents inside the space it has been given.
 *
 * Wagez never scrolls: whatever is on screen has to fit on screen. Everything
 * inside the calculator is sized off `--wagez-scale`, so fitting is a matter of
 * finding the multiplier at which the content stops overflowing. This measures
 * that after every render — and on resize, including a phone's keyboard opening
 * — and writes it to `--wagez-fit`, which the scales all multiply by.
 *
 * Both dimensions count. Height is what usually runs out, but the giant money
 * on a result is easily wider than the screen it is on, and a value that runs
 * off the side is no more readable than one that runs off the bottom.
 *
 * Every measurement here has to be of final geometry, which is why nothing that
 * affects layout is transitioned: a size caught mid-animation would be fitted
 * against the size it was leaving rather than the one it was going to.
 *
 * @param {boolean} [active] false while the region is off screen, where there
 *   is nothing to measure — the last fit is kept until it comes back.
 * @returns {object} a ref to attach to the element that must not overflow.
 */
export default function useFitToViewport(active = true) {
  const ref = useRef(null);

  const fit = useCallback(() => {
    const node = ref.current;
    if (node === null || !active) return;

    // Start from full size: the room available may have grown since last time.
    let scale = 1;
    node.style.setProperty("--wagez-fit", "1");

    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
      // A pixel of slack: sub-pixel layout should not start a shrinking spiral.
      const tall = node.scrollHeight > node.clientHeight + 1;
      const wide = node.scrollWidth > node.clientWidth + 1;
      if ((!tall && !wide) || scale <= MIN_FIT) break;

      const ratio = Math.min(
        tall ? node.clientHeight / node.scrollHeight : 1,
        wide ? node.clientWidth / node.scrollWidth : 1,
      );
      // Type set in viewport units and the readability floors do not shrink
      // with the multiplier, so one division rarely lands it — iterate.
      scale = Math.max(MIN_FIT, scale * Math.min(ratio, MAX_STEP));
      node.style.setProperty("--wagez-fit", String(scale));
    }
  }, [active]);

  // Any render can change what is on screen, so re-fit after all of them.
  useLayoutEffect(fit);

  useLayoutEffect(() => {
    window.addEventListener("resize", fit);
    // The visual viewport is what shrinks when a phone's keyboard appears.
    window.visualViewport?.addEventListener("resize", fit);

    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [fit]);

  return ref;
}
