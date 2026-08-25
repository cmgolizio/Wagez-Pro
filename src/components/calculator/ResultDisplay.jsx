import { formatCents } from "@/lib/formatters/currency";
import { formatDuration } from "@/lib/formatters/duration";

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
 * anything on its own.
 */
export default function ResultDisplay({
  result,
  stale = false,
  steppedBack = false,
  onRecall,
  saved = false,
  savedDay = null,
  hint = null,
  onAddToWeek,
  onShowWeek,
}) {
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
              {saved ? (
                <p className='wagez-result-note'>
                  Added to {savedDay}.{" "}
                  <button
                    type='button'
                    className='wagez-inline-button'
                    onClick={onShowWeek}
                  >
                    See week
                  </button>
                </p>
              ) : (
                <button
                  type='button'
                  className='wagez-quiet-button'
                  onClick={onAddToWeek}
                >
                  + Add to week
                </button>
              )}
              {hint === null ? null : (
                <p className='wagez-result-note'>{hint}</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
