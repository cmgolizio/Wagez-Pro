/**
 * The hourly rate, kept as raw text.
 *
 * Wagez never invents a rate: leaving this blank is a valid shift that reports
 * time worked and no money. The value is normalized into cents at calculation
 * time, so a half-typed "22." never fights the user.
 */
export default function RateField({ id, label, value, error, onChange, ref }) {
  const errorId = `${id}-error`;

  return (
    <div className='flex flex-col gap-1.5'>
      <label className='wagez-field-label' htmlFor={id}>
        {label}
        <span className='sr-only'> in dollars per hour</span>
      </label>
      <div className='wagez-field'>
        <span aria-hidden='true' className='text-xl font-semibold'>
          $
        </span>
        <input
          ref={ref}
          id={id}
          type='text'
          inputMode='decimal'
          autoComplete='off'
          placeholder='0.00'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error === undefined ? undefined : "true"}
          aria-describedby={error === undefined ? undefined : errorId}
        />
        <span aria-hidden='true' className='text-sm font-semibold'>
          /hour
        </span>
      </div>
      {error === undefined ? null : (
        <p className='wagez-alert' id={errorId} role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}
