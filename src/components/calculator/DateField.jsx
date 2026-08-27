/**
 * The day a shift was worked.
 *
 * A shift already in the week, being put on a different day than the one it
 * was saved with. That is a calendar question and it gets a calendar: the
 * recent days one press each are `DayStrip`'s job, at the point a shift is
 * first saved.
 *
 * The value is an ISO `"YYYY-MM-DD"` string throughout — the same thing the
 * native date control speaks — so nothing has to be parsed back out of a
 * display format.
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
      {error === undefined ? null : (
        <p className='wagez-alert' id={errorId} role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}
