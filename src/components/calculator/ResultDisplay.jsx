import { useEffect, useRef } from "react";

import { formatCents } from "@/lib/formatters/currency";
import { formatShiftDay } from "@/lib/formatters/date";
import { formatDuration } from "@/lib/formatters/duration";

import { focusIfLost } from "@/components/ui/focus";

import DayStrip from "./DayStrip";

const DAY_STRIP = "saved-day-strip";

/**
 * The bottom region: the last thing "Do Math." produced.
 *
 * Shows money only when a rate was given — a shift without a rate still reports
 * the time worked. Once there is a result it becomes the largest thing on
 * screen and stays that way until the user goes back to the inputs.
 *
 * With no result the region stays in the document but out of the layout: it is
 * the live region that announces the answer, and a live region has to be there
 * before the answer arrives for the announcement to be made.
 *
 * When `stale` is set the inputs have changed since this result was made. It
 * stays on screen, dimmed and labelled, rather than disappearing or quietly
 * recalculating: the old numbers are still true of the old shift.
 *
 * `steppedBack` means the editor currently owns the screen and this answer has
 * shrunk out of its way. Clicking it hands the screen back to the answer, which
 * is the exact arrangement a fresh calculation arrives in — so the two halves
 * can be swapped as often as the user likes. Clicks that land on a control in
 * here are that control's, not the swap's.
 *
 * "Add to week" lives here because saving is something you do to an answer, and
 * only to one that still matches the shift on screen. Calculating never saves
 * anything on its own — but once the user does ask, that is the whole of it:
 * one press, and Wagez works out the day rather than stopping to ask for it.
 * The day it settled on is then the largest thing in the confirmation and is
 * itself the way to change it, with the way back out beside it. Nothing here
 * asks a question, because nothing here is worth interrupting somebody for:
 * saving is undoable, so it is simply done.
 */
export default function ResultDisplay({
  result,
  active = true,
  stale = false,
  steppedBack = false,
  onRecall,
  savedDate = null,
  dayOpen = false,
  onAddToWeek,
  onToggleDay,
  onChangeDay,
  onUndo,
  onShowWeek,
}) {
  const addRef = useRef(null);
  const savedDayRef = useRef(null);

  /*
    Saving, undoing and choosing a day all replace the control that was pressed
    with the next thing to do. Focus follows that, so the keyboard is never left
    on the body after a press — see `focusIfLost` for why only then.

    Only while this screen is the one on show, though. Deleting the shift over
    in the week takes the confirmation here down with it, and the keyboard
    belongs to the week that press was made in.
  */
  const isSaved = savedDate !== null;
  useEffect(() => {
    if (active) focusIfLost(isSaved ? savedDayRef.current : addRef.current);
  }, [active, isSaved]);
  useEffect(() => {
    if (active && !dayOpen) focusIfLost(savedDayRef.current);
  }, [active, dayOpen, savedDate]);

  /** A press on one of the buttons in here is not a press on the answer. */
  function handleClick(event) {
    if (event.target.closest("button") === null) onRecall();
  }

  const recall =
    steppedBack && result !== null
      ? {
          className: "wagez-result wagez-recallable flex flex-col text-center",
          onClick: handleClick,
        }
      : { className: "wagez-result flex flex-col text-center" };

  return (
    <section
      {...recall}
      data-empty={result === null ? "true" : undefined}
      aria-live='polite'
    >
      <h2 className='sr-only'>Result</h2>
      {result === null ? null : (
        <>
          {stale ? (
            <p>
              <span className='wagez-stale-note'>
                Inputs changed — Do Math. again.
              </span>
            </p>
          ) : null}
          <div className={stale ? "wagez-stale" : undefined}>
            <p className='wagez-caption'>You worked:</p>
            <p className='wagez-duration'>
              {formatDuration(result.paidMinutes)}
            </p>
            {result.basePayCents === null ? null : (
              <>
                <p className='wagez-caption mt-2'>and made:</p>
                {/* Money keeps its green only while it is the live answer:
                    dimmed green would not survive the gradient behind it. */}
                <p
                  className={`wagez-money${stale ? " wagez-money-muted" : ""}`}
                >
                  {formatCents(result.basePayCents)}
                </p>
              </>
            )}
          </div>

          {/* A stale answer is not this shift, so there is nothing to save. */}
          {stale ? null : (
            <div className='wagez-result-actions'>
              {savedDate === null ? (
                <button
                  ref={addRef}
                  type='button'
                  className='wagez-quiet-button'
                  onClick={onAddToWeek}
                >
                  + Add to week
                </button>
              ) : (
                <>
                  <p className='wagez-saved'>
                    <span className='wagez-caption'>Added to</span>
                    <button
                      ref={savedDayRef}
                      type='button'
                      className='wagez-saved-day'
                      aria-expanded={dayOpen}
                      aria-controls={dayOpen ? DAY_STRIP : undefined}
                      onClick={onToggleDay}
                    >
                      {formatShiftDay(savedDate)}
                    </button>
                  </p>

                  {dayOpen ? (
                    <DayStrip
                      id={DAY_STRIP}
                      value={savedDate}
                      onChange={onChangeDay}
                    />
                  ) : null}

                  <p className='wagez-result-note'>
                    <button
                      type='button'
                      className='wagez-inline-button'
                      onClick={onUndo}
                    >
                      Undo
                    </button>
                    <span aria-hidden='true'> · </span>
                    <button
                      type='button'
                      className='wagez-inline-button'
                      onClick={onShowWeek}
                    >
                      See week
                    </button>
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
