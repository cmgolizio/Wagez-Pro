import { parseRateCents } from "@/lib/calculations/wages";
import { formatHourlyRate } from "@/lib/formatters/currency";
import { formatShiftDay } from "@/lib/formatters/date";
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
    { key: "date", label: "Day:", value: formatShiftDay(draft.date) },
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
