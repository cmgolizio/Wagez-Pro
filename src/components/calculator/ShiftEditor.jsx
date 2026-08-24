import { useRef } from "react";

import RateField from "./RateField";
import TimeField from "./TimeField";

/**
 * The center panel: the whole shift, editable, plus "Do Math."
 *
 * The panel owns nothing but its inputs' focus. The draft lives above it, and
 * calculating is a single call up to the parent.
 *
 * `entered` is how many values are already showing above the panel. The panel
 * publishes it as a data attribute and the stylesheet scales every size inside
 * from there, so the editor is at its largest with an empty screen to itself
 * and gives room back as the display above fills in.
 *
 * `steppedBack` means a result currently owns the screen. The panel has shrunk
 * well out of its way and behaves as a single target: hovering brings it part
 * of the way back, and a click anywhere on it — or tabbing into it — hands the
 * screen back rather than working one of the shrunken controls by accident.
 */
export default function ShiftEditor({
  draft,
  entered,
  errors,
  steppedBack = false,
  onChange,
  onCalculate,
  onReset,
  onRecall,
  onPeek,
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

  const recall = steppedBack
    ? {
        onClick: onRecall,
        onFocusCapture: onRecall,
        onMouseEnter: () => onPeek(true),
        onMouseLeave: () => onPeek(false),
      }
    : {};

  return (
    <form
      className={`wagez-panel flex flex-col${steppedBack ? " wagez-recallable" : ""}`}
      data-entered={entered}
      onSubmit={handleSubmit}
      noValidate
      {...recall}
    >
      <h2 className='sr-only'>Shift</h2>
      <TimeField
        ref={startRef}
        id='start-time'
        label='Start:'
        value={draft.startTime}
        error={errors.startTime}
        onChange={(value) => onChange("startTime", value)}
        autoFocus
      />
      <TimeField
        ref={endRef}
        id='end-time'
        label='Stop:'
        value={draft.endTime}
        error={errors.endTime}
        onChange={(value) => onChange("endTime", value)}
      />
      <RateField
        ref={rateRef}
        id='hourly-rate'
        label='Pay Rate:'
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
