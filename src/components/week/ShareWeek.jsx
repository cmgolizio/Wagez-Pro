"use client";

import { useEffect, useRef, useState } from "react";

import { SHARE_TITLE } from "@/lib/share/weekSummary";

/** Nothing has been shared yet, which is where this always starts. */
const IDLE = "idle";
/** The device's own share sheet took it. */
const SHARED = "shared";
/** No share sheet, so it went to the clipboard instead. */
const COPIED = "copied";
/** Neither was available, so the text is on screen to be copied by hand. */
const MANUAL = "manual";

/** Long enough to read "Copied.", short enough not to linger. */
const CONFIRMATION_MS = 3000;

/**
 * Share the week.
 *
 * One button, and three ways it can go. A phone hands the text to its own share
 * sheet, which is what people already know how to use. A desktop browser has no
 * sheet, so the text goes to the clipboard and the button says so. A browser
 * that will not do either — an insecure origin, a locked-down permission —
 * still has to be useful, so the text itself appears, selected, ready to be
 * copied by hand. There is no path where pressing Share does nothing.
 *
 * Closing the share sheet is an answer rather than a failure: the user meant
 * not to share, so nothing is copied behind their back.
 *
 * Nothing leaves the device that the user did not send: the summary is built
 * here, from shifts that never left the device either.
 */
export default function ShareWeek({ summary }) {
  // What the last press came to, and the text it came to it about: a
  // confirmation belongs to the week it confirmed, so a week that changes
  // underneath it is simply a week nothing has been done with yet.
  const [done, setDone] = useState(null);
  const textRef = useRef(null);

  const state = done !== null && done.summary === summary ? done.state : IDLE;

  // The clock runs from the press, not from what happens to be on screen: a
  // confirmation the user has already walked away from has been seen.
  useEffect(() => {
    if (done === null || done.state === MANUAL) return undefined;
    const timer = setTimeout(() => setDone(null), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [done]);

  // Shown because it has to be copied by hand, so it arrives ready to be —
  // and is put back that way if it is asked for again.
  useEffect(() => {
    if (state === MANUAL) textRef.current?.select();
  }, [state, done]);

  if (summary === null) return null;

  function finish(result) {
    setDone({ state: result, summary });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      finish(COPIED);
    } catch {
      finish(MANUAL);
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: SHARE_TITLE, text: summary });
        finish(SHARED);
        return;
      } catch (error) {
        // Dismissing the sheet is a decision. Anything else is the sheet
        // failing, and the clipboard is the way through.
        if (error?.name === "AbortError") return;
      }
    }
    await copy();
  }

  return (
    <div className='wagez-week-share'>
      <button type='button' className='wagez-quiet-button' onClick={share}>
        Share
      </button>

      {/* Present before it has anything to say, so that what it says is read
          out when it says it. */}
      <p className='wagez-share-state' role='status'>
        {state === SHARED ? "Shared." : null}
        {state === COPIED ? "Copied." : null}
        {state === MANUAL ? "Copy this:" : null}
      </p>

      {state === MANUAL ? (
        <textarea
          ref={textRef}
          className='wagez-share-text'
          readOnly
          rows={summary.split("\n").length}
          value={summary}
          aria-label='Week summary'
        />
      ) : null}
    </div>
  );
}
