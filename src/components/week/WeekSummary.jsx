import { formatCents } from "@/lib/formatters/currency";
import {
  formatDuration,
  formatDurationCompact,
} from "@/lib/formatters/duration";
import { formatMultiplier } from "@/lib/formatters/overtime";

/**
 * What the week came to.
 *
 * Bold and short: a count, a duration and an amount. Money only appears when
 * some shift in the week actually carried a rate — Wagez never invents one, so
 * a week of rateless shifts reports its hours and stops there.
 *
 * Overtime is the one thing that can add a line, and only when there is
 * overtime to report: the hours split into the regular ones and the ones paid
 * at the user's multiplier, so the amount underneath is legible without a
 * calculator. A week that never reached the threshold reads exactly as it does
 * with overtime switched off.
 */
export default function WeekSummary({ totals, overtime }) {
  const { shiftCount, paidMinutes, payCents, regularMinutes, overtimeMinutes } =
    totals;
  const split = overtime.enabled && overtimeMinutes > 0;

  return (
    <section className='wagez-week-summary'>
      <h3 className='wagez-caption'>Week total</h3>
      <p className='wagez-week-count'>
        {shiftCount} {shiftCount === 1 ? "shift" : "shifts"}
      </p>
      <p className='wagez-week-total'>{formatDuration(paidMinutes)}</p>
      {split ? (
        <p className='wagez-week-split'>
          <span>Regular {formatDurationCompact(regularMinutes)}</span>
          <span>
            Overtime {formatDurationCompact(overtimeMinutes)} at{" "}
            {formatMultiplier(overtime.multiplier)}
          </span>
        </p>
      ) : null}
      {payCents === null ? null : (
        <p className='wagez-week-money'>{formatCents(payCents)}</p>
      )}
    </section>
  );
}
