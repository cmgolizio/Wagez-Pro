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
 */
export default function ResultDisplay({ result, stale = false }) {
  return (
    <section
      className='wagez-result flex flex-col text-center'
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
        </>
      )}
    </section>
  );
}
