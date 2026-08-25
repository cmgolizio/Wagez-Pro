import { formatCents } from "@/lib/formatters/currency";
import { formatShiftDay } from "@/lib/formatters/date";
import { formatDurationCompact } from "@/lib/formatters/duration";
import { formatTime } from "@/lib/formatters/time";
import { deriveShift } from "@/lib/shifts/savedShift";

/**
 * One saved shift, as a week reads it: the day, the hours it covered, how long
 * that was and what it came to.
 *
 * Every number here is derived from the shift's own start, end, rate and break
 * as it is drawn, so a card can never show a total that has drifted away from
 * the shift it belongs to.
 */
export default function SavedShiftCard({ shift }) {
  const derived = deriveShift(shift);
  if (derived === null) return null;

  return (
    <li className='wagez-shift-card'>
      <p className='wagez-shift-day'>{formatShiftDay(shift.date)}</p>
      <p className='wagez-shift-times'>
        {formatTime(shift.startTime)} → {formatTime(shift.endTime)}
        {derived.crossesMidnight ? (
          <span className='wagez-shift-overnight'> +1 day</span>
        ) : null}
      </p>
      <p className='wagez-shift-totals'>
        <span className='wagez-shift-duration'>
          {formatDurationCompact(derived.paidMinutes)}
        </span>
        {derived.basePayCents === null ? null : (
          <span className='wagez-shift-pay'>
            {formatCents(derived.basePayCents)}
          </span>
        )}
      </p>
    </li>
  );
}
