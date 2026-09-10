"use client";

import { useEffect, useRef, useState } from "react";

import { focusIfLost } from "@/components/ui/focus";

/**
 * Forget everything Wagez has saved on this device.
 *
 * This is the one action in Wagez that cannot be undone — every saved shift and
 * every setting, gone — so it asks first, and the question names what it is
 * about to take. The way out comes first and is what the keyboard lands on, the
 * same as deleting a single shift.
 *
 * It is deliberately the last line of the settings and says nothing until it is
 * pressed: this is not something anyone should reach by accident.
 *
 * Either answer puts the words back that offered it, so the keyboard is handed
 * on rather than dropped on the page body — as it is everywhere else in Wagez
 * that a control is replaced in place.
 */
export default function ClearDataAction({ onClear }) {
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef(null);
  const clearRef = useRef(null);
  const wasAsking = useRef(false);

  useEffect(() => {
    if (asking) cancelRef.current?.focus();
    else if (wasAsking.current) focusIfLost(clearRef.current);
    wasAsking.current = asking;
  }, [asking]);

  function confirm() {
    setAsking(false);
    onClear?.();
  }

  if (!asking) {
    return (
      <div className='wagez-settings'>
        <div className='wagez-setting-row'>
          <button
            ref={clearRef}
            type='button'
            className='wagez-quiet-button wagez-danger'
            onClick={() => setAsking(true)}
          >
            Clear Wagez data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='wagez-settings'>
      <div className='wagez-setting-row wagez-setting-confirm'>
        <p className='wagez-shift-question' id='clear-data-question'>
          Delete every saved shift and setting?
        </p>
        <div
          className='wagez-setting-choice-actions'
          role='group'
          aria-labelledby='clear-data-question'
        >
          <button
            ref={cancelRef}
            type='button'
            className='wagez-quiet-button'
            onClick={() => setAsking(false)}
          >
            Cancel
          </button>
          <button
            type='button'
            className='wagez-quiet-button wagez-danger'
            onClick={confirm}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
