import { formatCents } from "@/lib/formatters/currency";
import { formatDuration } from "@/lib/formatters/duration";

/**
 * The bottom third: the last thing "Do Math." produced.
 *
 * Stays empty until there is a real result, and shows money only when a rate
 * was given — a shift without a rate still reports the time worked.
 */
export default function ResultDisplay({ result }) {
  return (
    <section className='flex flex-1 flex-col justify-center' aria-live='polite'>
      <h2 className='sr-only'>Result</h2>
      {result === null ? null : (
        <>
          <p className='wagez-caption'>You worked:</p>
          <p className='text-result font-extrabold leading-none tracking-tight text-ink'>
            {formatDuration(result.paidMinutes)}
          </p>
          {result.basePayCents === null ? null : (
            <>
              <p className='wagez-caption mt-3'>and made:</p>
              <p className='text-display font-extrabold leading-none tracking-tight text-money'>
                {formatCents(result.basePayCents)}
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
