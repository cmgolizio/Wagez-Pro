import { useRef } from "react";

import RateField from "./RateField";
import TimeField from "./TimeField";

/**
 * The center panel: the whole shift, editable, plus "Do Math."
 *
 * The panel owns nothing but its inputs' focus. The draft lives above it, and
 * calculating is a single call up to the parent.
 */
export default function ShiftEditor({
  draft,
  errors,
  onChange,
  onCalculate,
  onReset,
}) {
  const startRef = useRef(null);
  const endRef = useRef(null);
  const rateRef = useRef(null);

  function handleSubmit(event) {
    event.preventDefault();

    const calculation = onCalculate();
    if (calculation.ok) return;

    // Put the user on the first thing that needs fixing.
    const firstInvalid = [
      [calculation.errors.startTime, startRef],
      [calculation.errors.endTime, endRef],
      [calculation.errors.hourlyRate, rateRef],
    ].find(([error]) => error !== undefined);
    firstInvalid?.[1].current?.focus();
  }

  return (
    <form
      className='wagez-panel flex shrink-0 flex-col gap-3 p-4 sm:p-5'
      onSubmit={handleSubmit}
      noValidate
    >
      <h2 className='sr-only'>Shift</h2>
      <div className='grid gap-3 md:grid-cols-2'>
        <TimeField
          ref={startRef}
          id='start-time'
          label='Clocked-in'
          value={draft.startTime}
          error={errors.startTime}
          onChange={(value) => onChange("startTime", value)}
        />
        <TimeField
          ref={endRef}
          id='end-time'
          label='Clocked-out'
          value={draft.endTime}
          error={errors.endTime}
          onChange={(value) => onChange("endTime", value)}
        />
      </div>
      <RateField
        ref={rateRef}
        id='hourly-rate'
        label='Pay rate'
        value={draft.hourlyRate}
        error={errors.hourlyRate}
        onChange={(value) => onChange("hourlyRate", value)}
      />
      <div className='flex items-center gap-2'>
        <button type='submit' className='wagez-do-math'>
          Do Math.
        </button>
        <button
          type='button'
          className='wagez-quiet-button shrink-0'
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
