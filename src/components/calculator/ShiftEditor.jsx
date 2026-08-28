import { useEffect, useRef } from "react";

import { PM } from "@/lib/calculations/time";

import RevealToggle from "@/components/ui/RevealToggle";

import BreakField from "./BreakField";
import DefaultRateToggle from "./DefaultRateToggle";
import RateField from "./RateField";
import TimeField from "./TimeField";

const RATE_FIELD = "hourly-rate";
const BREAK_FIELD = "break-minutes";

/**
 * Follow an optional field on and off screen.
 *
 * Asking for a field and then having to go and find it would be two acts where
 * the user meant one, so the caret goes with it: into the field when it
 * appears, and back onto the word that offers it again when it goes.
 *
 * Only when it was asked for, though. A field that simply arrives — a saved pay
 * rate on opening Wagez, or that same rate again after a reset — is nobody's
 * request, and a caret that jumps into it takes the user off the clock-in time
 * they were about to type. `asked` is that distinction: a fresh value each time
 * this field is the one the user pressed, and null for every other reason it
 * might have appeared.
 */
function useAskedFocus(asked, open, fieldRef, toggleRef) {
  useEffect(() => {
    if (asked === null) return;

    if (open) {
      fieldRef.current?.focus();
      fieldRef.current?.select?.();
    } else {
      toggleRef.current?.focus();
    }
  }, [asked, open, fieldRef, toggleRef]);
}

/**
 * The center panel: the whole shift, editable, plus "Do Math."
 *
 * The panel owns nothing but its inputs' focus. The draft lives above it, and
 * calculating is a single call up to the parent.
 *
 * Only the two times are ever on screen to begin with, because only the two
 * times are required. A pay rate and an unpaid break are one word each, and the
 * same word takes each away again when it is pressed a second time. Nothing
 * else belongs here: the day a shift was worked changes nothing about the
 * answer, so it is settled where it matters, at the point the shift is saved.
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
  showBreak,
  asked = null,
  rateIsDefault,
  canBeDefault,
  onChange,
  onToggleRate,
  onToggleBreak,
  onToggleDefaultRate,
  onCalculate,
  onReset,
  onRecall,
}) {
  const startRef = useRef(null);
  const endRef = useRef(null);
  const rateRef = useRef(null);
  const breakRef = useRef(null);
  const rateRevealRef = useRef(null);
  const breakRevealRef = useRef(null);
  const doMathRef = useRef(null);

  useAskedFocus(
    asked?.field === "hourlyRate" ? asked : null,
    showRate,
    rateRef,
    rateRevealRef,
  );
  useAskedFocus(
    asked?.field === "breakMinutes" ? asked : null,
    showBreak,
    breakRef,
    breakRevealRef,
  );

  function handleSubmit(event) {
    event.preventDefault();

    const calculation = onCalculate();
    if (calculation.ok) return;

    // Put the user on the first thing that needs fixing.
    const firstInvalid = [
      [calculation.errors.startTime, startRef],
      [calculation.errors.endTime, endRef],
      [calculation.errors.hourlyRate, rateRef],
      [calculation.errors.breakMinutes, breakRef],
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
   * lands under the return key. An empty break is not left over in the same
   * way — a break nobody has typed is no break, which is a whole shift.
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

  /** Keeping this rate as the one Wagez opens on. Only ever the rate's own. */
  const defaultRateToggle = (
    <DefaultRateToggle
      pressed={rateIsDefault}
      disabled={!rateIsDefault && !canBeDefault}
      onToggle={onToggleDefaultRate}
    />
  );

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

      {showRate ? (
        <RateField
          ref={rateRef}
          id={RATE_FIELD}
          label='Pay Rate:'
          value={draft.hourlyRate}
          error={errors.hourlyRate}
          onChange={(value) => onChange("hourlyRate", value)}
          action={
            <>
              {defaultRateToggle}
              <RevealToggle
                ref={rateRevealRef}
                label='$/Hr'
                removeLabel='Remove the pay rate'
                open
                controls={RATE_FIELD}
                onToggle={onToggleRate}
              />
            </>
          }
        />
      ) : null}

      {showBreak ? (
        <BreakField
          ref={breakRef}
          id={BREAK_FIELD}
          label='Break:'
          value={draft.breakMinutes}
          error={errors.breakMinutes}
          onChange={(value) => onChange("breakMinutes", value)}
          action={
            <RevealToggle
              ref={breakRevealRef}
              label='Break'
              removeLabel='Remove the break'
              open
              controls={BREAK_FIELD}
              onToggle={onToggleBreak}
            />
          }
        />
      ) : null}

      {/* The optional half of a shift, each kept to one word until it is
          wanted. Whatever is still on offer stays here, together, on the last
          line before the button — revealing one lifts it out of the row and
          into a field above, taking the way back out with it. */}
      {showRate && showBreak ? null : (
        <div className='wagez-reveal-row'>
          {showRate ? null : (
            <RevealToggle
              ref={rateRevealRef}
              label='$/Hr'
              removeLabel='Remove the pay rate'
              open={false}
              controls={RATE_FIELD}
              onToggle={onToggleRate}
            />
          )}
          {showBreak ? null : (
            <RevealToggle
              ref={breakRevealRef}
              label='Break'
              removeLabel='Remove the break'
              open={false}
              controls={BREAK_FIELD}
              onToggle={onToggleBreak}
            />
          )}
        </div>
      )}

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
