import { parseRateCents } from "@/lib/calculations/wages";
import { formatHourlyRate } from "@/lib/formatters/currency";
import { formatTime } from "@/lib/formatters/time";

/** One label/value pair of the live input state. */
function CurrentValue({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className='wagez-caption'>{label}</dt>
      <dd className='text-value font-extrabold leading-none tracking-tight text-ink'>
        {value === null ? (
          <>
            <span aria-hidden='true'>—</span>
            <span className='sr-only'>Not set</span>
          </>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/**
 * The top third: what the user has entered right now.
 *
 * This region follows the draft immediately — no button press required. The
 * result below it is a separate thing entirely.
 */
export default function CurrentInputDisplay({ draft }) {
  const rateCents = parseRateCents(draft.hourlyRate);

  return (
    <section className='flex flex-1 flex-col justify-center'>
      <h2 className='sr-only'>Current shift</h2>
      {/* The two times sit side by side, like the controls that set them. */}
      <dl className='grid grid-cols-2 gap-3'>
        <CurrentValue label='Clocked-in:' value={formatTime(draft.startTime)} />
        <CurrentValue label='Clocked-out:' value={formatTime(draft.endTime)} />
        <CurrentValue
          className='col-span-2'
          label='Pay rate:'
          value={rateCents === null ? null : formatHourlyRate(rateCents)}
        />
      </dl>
    </section>
  );
}
