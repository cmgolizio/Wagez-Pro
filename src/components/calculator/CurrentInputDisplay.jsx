import { parseMinutes } from "@/lib/calculations/time";
import { parseRateCents } from "@/lib/calculations/wages";
import { formatHourlyRate } from "@/lib/formatters/currency";
import { formatDurationCompact } from "@/lib/formatters/duration";
import { formatTime } from "@/lib/formatters/time";

/**
 * The entered values, in display order, with the empty ones left out.
 *
 * A value the user has not set has nothing to say, so it contributes neither a
 * label nor a line: an untouched Wagez shows the editor alone. The editor sizes
 * itself from how many of these there are, which is why this lives next to the
 * display that renders them rather than inside it.
 *
 * @returns {{key: string, label: string, value: string}[]}
 */
export function currentValues(draft) {
  const rateCents = parseRateCents(draft.hourlyRate);
  const breakMinutes = parseMinutes(draft.breakMinutes);

  return [
    {
      key: "startTime",
      label: "Start:",
      value: formatTime(draft.startTime),
    },
    { key: "endTime", label: "Stop:", value: formatTime(draft.endTime) },
    {
      key: "hourlyRate",
      label: "Pay Rate:",
      value: rateCents === null ? null : formatHourlyRate(rateCents),
    },
    {
      // A break of no minutes is the same as no break, so it says nothing —
      // and the result below has to be explicable from what is up here, which
      // is why a break that does come off the clock says so.
      key: "breakMinutes",
      label: "Break:",
      value:
        breakMinutes === null || breakMinutes === 0
          ? null
          : formatDurationCompact(breakMinutes),
    },
  ].filter((entry) => entry.value !== null);
}

/**
 * The top region: what the user has entered right now.
 *
 * This follows the draft immediately — no button press required. The result
 * below it is a separate thing entirely.
 *
 * `steppedBack` means a result currently owns the screen and these values have
 * shrunk out of its way. Clicking hands the screen to the editor again.
 */
export default function CurrentInputDisplay({
  draft,
  steppedBack = false,
  onRecall,
}) {
  const entered = currentValues(draft);
  if (entered.length === 0) return null;

  const recall = steppedBack
    ? {
        className: "wagez-entered wagez-recallable flex flex-col text-center",
        onClick: onRecall,
      }
    : { className: "wagez-entered flex flex-col text-center" };

  return (
    <section {...recall}>
      <h2 className='sr-only'>Current shift</h2>
      {/* One value per line, in the order the shift is entered. */}
      <dl className='wagez-entered-list'>
        {entered.map(({ key, label, value }) => (
          <div key={key}>
            <dt className='wagez-caption'>{label}</dt>
            <dd className='wagez-value'>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
