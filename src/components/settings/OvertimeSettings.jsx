"use client";

import { useEffect, useRef, useState } from "react";

import {
  parseMultiplier,
  parseThresholdMinutes,
} from "@/lib/calculations/overtime";
import { formatDurationCompact } from "@/lib/formatters/duration";
import {
  formatHoursInput,
  formatMultiplier,
  formatMultiplierInput,
} from "@/lib/formatters/overtime";

const THRESHOLD_FIELD = "overtime-threshold";
const MULTIPLIER_FIELD = "overtime-multiplier";

const THRESHOLD_ERROR = "A week's worth of hours is 1 to 168.";
const MULTIPLIER_ERROR = "Overtime pays 1× to 10× the rate.";

/**
 * How Wagez works out overtime.
 *
 * Off unless somebody turns it on, and folded away behind a single line until
 * somebody goes looking: this is a setting, not part of entering a shift.
 *
 * The two numbers are the whole of the feature — after how many hours in a
 * week, and at what multiple of the shift's own rate. They are the user's
 * assumptions, and Wagez applies them exactly. It does not decide who is owed
 * overtime, and the panel says so.
 *
 * Both fields keep what is typed and save what parses, the same way the pay
 * rate does, so a half-typed number never fights the user. Leaving a field that
 * doesn't parse puts back the value that is actually in force, rather than
 * leaving a number on screen that isn't the one being used.
 */
export default function OvertimeSettings({ overtime, onChange }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(() =>
    formatHoursInput(overtime.thresholdMinutes),
  );
  const [multiplier, setMultiplier] = useState(() =>
    formatMultiplierInput(overtime.multiplier),
  );
  const bodyRef = useRef(null);

  // The setting lives at the foot of the week, so on a short screen it opens
  // below the fold. Bring it up to where it was opened from.
  useEffect(() => {
    if (open) bodyRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [open]);

  const thresholdError =
    parseThresholdMinutes(hours) === null ? THRESHOLD_ERROR : undefined;
  const multiplierError =
    parseMultiplier(multiplier) === null ? MULTIPLIER_ERROR : undefined;

  function changeHours(text) {
    setHours(text);
    const minutes = parseThresholdMinutes(text);
    if (minutes !== null) onChange({ thresholdMinutes: minutes });
  }

  function changeMultiplier(text) {
    setMultiplier(text);
    const value = parseMultiplier(text);
    if (value !== null) onChange({ multiplier: value });
  }

  /** Put back the number actually in force, once the user has moved on. */
  function restore() {
    if (thresholdError !== undefined) {
      setHours(formatHoursInput(overtime.thresholdMinutes));
    }
    if (multiplierError !== undefined) {
      setMultiplier(formatMultiplierInput(overtime.multiplier));
    }
  }

  return (
    <div className='wagez-settings'>
      <button
        type='button'
        className='wagez-settings-toggle'
        aria-expanded={open}
        aria-controls='overtime-settings'
        onClick={() => setOpen((current) => !current)}
      >
        <span>Overtime</span>
        {/* Closed, the line says what is actually in force. */}
        <span className='wagez-settings-state'>
          {overtime.enabled ? (
            <>
              {formatMultiplier(overtime.multiplier)} after{" "}
              {formatDurationCompact(overtime.thresholdMinutes)}
            </>
          ) : (
            "Off"
          )}
        </span>
      </button>

      {open ? (
        <div
          ref={bodyRef}
          className='wagez-settings-body'
          id='overtime-settings'
        >
          <button
            type='button'
            role='switch'
            aria-checked={overtime.enabled}
            className='wagez-setting-switch'
            onClick={() => onChange({ enabled: !overtime.enabled })}
          >
            <span>Calculate overtime</span>
            <span aria-hidden='true' className='wagez-setting-value'>
              {overtime.enabled ? "On" : "Off"}
            </span>
          </button>

          {overtime.enabled ? (
            <div className='wagez-settings-fields' onBlur={restore}>
              <div className='flex flex-col gap-1'>
                <label className='wagez-field-label' htmlFor={THRESHOLD_FIELD}>
                  After:
                </label>
                <div className='wagez-field'>
                  <input
                    id={THRESHOLD_FIELD}
                    type='text'
                    inputMode='decimal'
                    autoComplete='off'
                    value={hours}
                    onChange={(event) => changeHours(event.target.value)}
                    aria-label='Overtime after, in hours a week'
                    aria-invalid={
                      thresholdError === undefined ? undefined : "true"
                    }
                    aria-describedby={
                      thresholdError === undefined
                        ? undefined
                        : `${THRESHOLD_FIELD}-error`
                    }
                  />
                  <span aria-hidden='true' className='text-sm font-semibold'>
                    hrs/week
                  </span>
                </div>
                {thresholdError === undefined ? null : (
                  <p
                    className='wagez-alert'
                    id={`${THRESHOLD_FIELD}-error`}
                    role='alert'
                  >
                    {thresholdError}
                  </p>
                )}
              </div>

              <div className='flex flex-col gap-1'>
                <label className='wagez-field-label' htmlFor={MULTIPLIER_FIELD}>
                  Paid at:
                </label>
                <div className='wagez-field'>
                  <input
                    id={MULTIPLIER_FIELD}
                    type='text'
                    inputMode='decimal'
                    autoComplete='off'
                    value={multiplier}
                    onChange={(event) => changeMultiplier(event.target.value)}
                    aria-label='Overtime multiplier'
                    aria-invalid={
                      multiplierError === undefined ? undefined : "true"
                    }
                    aria-describedby={
                      multiplierError === undefined
                        ? undefined
                        : `${MULTIPLIER_FIELD}-error`
                    }
                  />
                  <span aria-hidden='true' className='text-sm font-semibold'>
                    × rate
                  </span>
                </div>
                {multiplierError === undefined ? null : (
                  <p
                    className='wagez-alert'
                    id={`${MULTIPLIER_FIELD}-error`}
                    role='alert'
                  >
                    {multiplierError}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <p className='wagez-settings-note'>
            Wagez counts a week&rsquo;s paid hours and applies the threshold and
            multiplier you set here. It doesn&rsquo;t decide who is owed
            overtime.
          </p>
        </div>
      ) : null}
    </div>
  );
}
