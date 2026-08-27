import { useEffect, useRef } from "react";

import { PM } from "@/lib/calculations/time";

import RevealToggle from "@/components/ui/RevealToggle";

import RateField from "./RateField";
import TimeField from "./TimeField";

const RATE_FIELD = "hourly-rate";

/**
 * The center panel: the whole shift, editable, plus "Do Math."
 *
 * The panel owns nothing but its inputs' focus. The draft lives above it, and
 * calculating is a single call up to the parent.
 *
 * Only the two times are ever on screen to begin with, because only the two
 * times are required. A pay rate is one word away, and the same word takes it
 * away again when it is pressed a second time. Nothing else belongs here: the
 * day a shift was worked changes nothing about the answer, so it is settled
 * where it matters, at the point the shift is saved.
 *
 * Focus runs straight down that path: the start hour has it on arrival, and
 * each time hands it on the moment it is finished, so a whole shift can be
 * entered and calculated without ever reaching for the mouse.
 *
 * `entered` is how many values are already showing above the panel. The panel
 * publishes it as a data attribute and the stylesheet scales every size inside
 * from there, so the editor is at its largest with an empty screen to itself
 * and gives room back as the display above fills in.
 *
 * `steppedBack` means a result currently owns the screen. The panel has shrunk
 * well out of its way and behaves as a single target: a click anywhere on it —
 * or tabbing into it — hands the screen back rather than working one of the
 * shrunken controls by accident.
 */
export default function ShiftEditor({
  draft,
  entered,
  errors,
  steppedBack = false,
  showRate,
  onChange,
  onToggleRate,
  onCalculate,
  onReset,
  onRecall,
}) {
  const startRef = useRef(null);
  const endRef = useRef(null);
  const rateRef = useRef(null);
  const revealRef = useRef(null);
  const doMathRef = useRef(null);
  const rateWasOpen = useRef(showRate);

  /*
    Asking for a pay rate and then having to go and find it would be two acts
    where the user meant one, so the caret follows the field on and off screen:
    into the rate when it appears, and back onto the word that offers it again
    when it goes. Arrival is not a toggle, so nothing moves on first render.
  */
  useEffect(() => {
    if (showRate === rateWasOpen.current) return;
    rateWasOpen.current = showRate;

    if (showRate) {
      rateRef.current?.focus();
      rateRef.current?.select?.();
    } else {
      revealRef.current?.focus();
    }
  }, [showRate]);

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

  /** A finished start time hands over to the stop time, mid-keystroke. */
  function focusEnd() {
    endRef.current?.focus();
    endRef.current?.select();
  }

  /**
   * Both times are in. What is left is a pay rate the user asked for and has
   * not filled in yet; anything else means the shift is complete, so the answer
   * lands under the return key.
   */
  function focusAfterEnd() {
    const wantsRate = showRate && draft.hourlyRate === "";
    const next = wantsRate ? rateRef.current : doMathRef.current;
    next?.focus();
    next?.select?.();
  }

  const recall = steppedBack
    ? { onClick: onRecall, onFocusCapture: onRecall }
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
        onComplete={focusEnd}
        autoFocus
      />
      <TimeField
        ref={endRef}
        id='end-time'
        label='Stop:'
        value={draft.endTime}
        error={errors.endTime}
        onChange={(value) => onChange("endTime", value)}
        onComplete={focusAfterEnd}
        defaultMeridiem={PM}
      />

      {/* The optional half of a shift, kept to one word until it is wanted.
          Once it is, the word has been replaced by the field it revealed, so
          the way back out goes with that field rather than standing alone. */}
      {showRate ? null : (
        <div className='wagez-reveal-row'>
          <RevealToggle
            ref={revealRef}
            label='$/hour'
            removeLabel='Remove the pay rate'
            open={false}
            controls={RATE_FIELD}
            onToggle={onToggleRate}
          />
        </div>
      )}

      {showRate ? (
        <RateField
          ref={rateRef}
          id={RATE_FIELD}
          label='Pay Rate:'
          value={draft.hourlyRate}
          error={errors.hourlyRate}
          onChange={(value) => onChange("hourlyRate", value)}
          action={
            <RevealToggle
              ref={revealRef}
              label='$/hour'
              removeLabel='Remove the pay rate'
              open
              controls={RATE_FIELD}
              onToggle={onToggleRate}
            />
          }
        />
      ) : null}

      <div className='flex items-center gap-2'>
        <button ref={doMathRef} type='submit' className='wagez-do-math'>
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
