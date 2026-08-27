import { DAYS_PER_WEEK, addDays, todayIsoDate } from "@/lib/dates/isoDate";
import { formatShiftDay, formatWeekday } from "@/lib/formatters/date";

/**
 * The last seven days, one press each.
 *
 * A shift being given its day is nearly always a shift worked in the last day
 * or two, so the last week of days is the whole control: seven chips, oldest
 * first, today on the end. Each weekday appears exactly once in seven days, so
 * three letters is all a chip needs to say.
 *
 * Anything older than that is rarer and gets the date field underneath, which
 * is the only place in Wagez a calendar is ever needed.
 */
export default function DayStrip({ id, value, onChange }) {
  const today = todayIsoDate();
  const dateId = `${id}-date`;

  // Oldest first, so the row reads forwards and ends on today.
  const days = Array.from({ length: DAYS_PER_WEEK }, (_, index) =>
    addDays(today, index - (DAYS_PER_WEEK - 1)),
  );

  return (
    <div className='wagez-day-strip'>
      <div className='wagez-day-row' role='group' aria-label='Day'>
        {days.map((date) => (
          <button
            key={date}
            type='button'
            className='wagez-day'
            aria-label={formatShiftDay(date)}
            aria-pressed={date === value}
            onClick={() => onChange(date)}
          >
            {formatWeekday(date)}
          </button>
        ))}
      </div>

      <div className='wagez-field wagez-day-date'>
        <input
          id={dateId}
          type='date'
          value={value}
          aria-label='Or pick a day'
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
