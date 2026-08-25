import { formatCents } from "@/lib/formatters/currency";
import { formatDuration } from "@/lib/formatters/duration";

/**
 * What the week came to.
 *
 * Bold and short: a count, a duration and an amount. Money only appears when
 * some shift in the week actually carried a rate — Wagez never invents one, so
 * a week of undated-rate shifts reports its hours and stops there.
 */
export default function WeekSummary({ totals }) {
  const { shiftCount, paidMinutes, payCents } = totals;

  return (
    <section className='wagez-week-summary'>
      <h3 className='wagez-caption'>Week total</h3>
      <p className='wagez-week-count'>
        {shiftCount} {shiftCount === 1 ? "shift" : "shifts"}
      </p>
      <p className='wagez-week-total'>{formatDuration(paidMinutes)}</p>
      {payCents === null ? null : (
        <p className='wagez-week-money'>{formatCents(payCents)}</p>
      )}
    </section>
  );
}
