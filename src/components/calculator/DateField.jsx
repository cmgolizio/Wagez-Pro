import { addDays, todayIsoDate } from "@/lib/dates/isoDate";

/**
 * The day a shift was worked.
 *
 * Optional, and only mounted once the user has asked for it: a shift that is
 * never saved never needs a date. The value is an ISO `"YYYY-MM-DD"` string
 * throughout — the same thing the native date control speaks — so nothing has
 * to be parsed back out of a display format.
 *
 * Most shifts being dated here were worked today or finished in the small
 * hours of it, so those two days are one press each.
 */
export default function DateField({
  id,
  label,
  value,
  error,
  onChange,
  autoFocus = false,
}) {
  const errorId = `${id}-error`;
  const name = label.replace(/:$/, "");
  const today = todayIsoDate();

  const quickDays = [
    { key: "today", label: "Today", date: today },
    { key: "yesterday", label: "Yesterday", date: addDays(today, -1) },
  ];

  return (
    <div className='flex flex-col gap-1'>
      <label className='wagez-field-label' htmlFor={id}>
        {label}
      </label>
      <div className='wagez-field'>
        <input
          id={id}
          type='date'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={name}
          aria-invalid={error === undefined ? undefined : "true"}
          aria-describedby={error === undefined ? undefined : errorId}
          // Mounted by an explicit user action, which is where focus belongs.
          autoFocus={autoFocus}
        />
      </div>
      <div className='grid grid-cols-2 gap-1.5'>
        {quickDays.map((day) => (
          <button
            key={day.key}
            type='button'
            className='wagez-chip'
            // aria-pressed={value === day.date}
            onClick={() => onChange(day.date)}
          >
            {day.label}
          </button>
        ))}
      </div>
      {error === undefined ? null : (
        <p className='wagez-alert' id={errorId} role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}
