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

/** Sub-pixel layout should not start a shrinking spiral. */
const SLACK = 1;

/** How much a pass has to buy to be worth the size it costs. */
const PROGRESS = 0.5;

/**
 * How small a control may get, largest first.
 *
 * Controls stop shrinking before the type does, so that a shift can still be
 * tapped on a small screen — but a floor that does not fit is no kindness
 * either. So the region is fitted at the first of these that the screen can
 * actually hold, and a screen that can hold none of them keeps the smallest and
 * scrolls. 2.25rem is a comfortable target; 1.5rem is the smallest anyone
 * should be asked to hit, and is reached only by a phone on its side.
 */
const TAP_FLOORS = ["2.25rem", "1.75rem", "1.5rem"];

/** How far the contents of a region overrun it, in pixels, in either direction. */
function overflowOf(node) {
  return Math.max(
    node.scrollHeight - node.clientHeight,
    node.scrollWidth - node.clientWidth,
  );
}

/**
 * Keep a region's contents inside the space it has been given.
 *
 * Everything inside the calculator is sized off `--wagez-scale`, so fitting is
 * a matter of finding the multiplier at which the content stops overflowing.
 * This measures that after every render — and on resize, including a phone's
 * keyboard opening — and writes it to `--wagez-fit`, which the scales all
 * multiply by.
 *
 * Both dimensions count. Height is what usually runs out, but the giant money
 * on a result is easily wider than the screen it is on, and a value that runs
 * off the side is no more readable than one that runs off the bottom.
 *
 * Shrinking is not always the answer, though. Controls stop shrinking at a size
 * a thumb can still hit, so on a short screen there comes a point where a
 * smaller multiplier buys nothing but smaller type — the region overflows
 * either way. A pass that fails to reduce the overflow is therefore undone, and
 * the region is left at the largest size that was actually doing something;
 * what will not fit is reachable by scrolling, which is the stage's own affair.
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

    const apply = (value) =>
      node.style.setProperty("--wagez-fit", String(value));

    /**
     * Shrink until the region stops overflowing, and report what is left over.
     */
    const converge = () => {
      // Start from full size: the room available may have grown since last time.
      let scale = 1;
      apply(scale);
      let overflow = overflowOf(node);

      for (let pass = 0; pass < MAX_PASSES; pass += 1) {
        if (overflow <= SLACK || scale <= MIN_FIT) break;

        const height = node.scrollHeight;
        const width = node.scrollWidth;
        const ratio = Math.min(
          height > node.clientHeight ? node.clientHeight / height : 1,
          width > node.clientWidth ? node.clientWidth / width : 1,
        );
        // Type set in viewport units and the readability floors do not shrink
        // with the multiplier, so one division rarely lands it — iterate.
        const next = Math.max(MIN_FIT, scale * Math.min(ratio, MAX_STEP));
        apply(next);

        const remaining = overflowOf(node);
        if (remaining > overflow - PROGRESS) {
          // This pass cost size and bought nothing. Put the size back.
          apply(scale);
          return overflow;
        }

        scale = next;
        overflow = remaining;
      }

      return overflow;
    };

    // The largest touch target the screen can be fitted around. An ordinary
    // screen fits at the first one and stops there, so the smaller floors are
    // only ever measured on a screen the larger has been shown not to suit.
    for (const floor of TAP_FLOORS) {
      node.style.setProperty("--wagez-tap-floor", floor);
      if (converge() <= SLACK) break;
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
