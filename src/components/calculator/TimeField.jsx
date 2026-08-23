/**
 * A single clock time.
 *
 * The browser's time control already speaks canonical `"HH:MM"`, so its value
 * goes straight into the draft with no conversion.
 */
export default function TimeField({ id, label, value, error, onChange, ref }) {
  const errorId = `${id}-error`;

  return (
    <div className='flex flex-col gap-1.5'>
      <label className='wagez-field-label' htmlFor={id}>
        {label}
      </label>
      <div className='wagez-field'>
        <input
          ref={ref}
          id={id}
          type='time'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error === undefined ? undefined : "true"}
          aria-describedby={error === undefined ? undefined : errorId}
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
