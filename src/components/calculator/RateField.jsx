/**
 * The hourly rate, kept as raw text.
 *
 * Wagez never invents a rate: leaving this blank is a valid shift that reports
 * time worked and no money. The value is normalized into cents at calculation
 * time, so a half-typed "22." never fights the user.
 *
 * `action` is the field's own controls, set at the end of the label row — in
 * the calculator, the way to keep this rate as the default and the way to take
 * the field away again.
 */
export default function RateField({
  id,
  label,
  value,
  error,
  onChange,
  action,
  ref,
}) {
  const errorId = `${id}-error`;
  // Announced without the trailing colon, and with the unit the "$" and
  // "/hour" adornments carry visually.
  const name = `${label.replace(/:$/, "")} in dollars per hour`;

  return (
    <div className='flex flex-col gap-1'>
      <div className='wagez-field-head'>
        <label className='wagez-field-label' htmlFor={id}>
          {label}
        </label>
        {/* Whatever this field's own controls are — keeping the rate, and
            taking the field away again. */}
        {action === undefined ? null : (
          <div className='wagez-field-actions'>{action}</div>
        )}
      </div>
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
          aria-label={name}
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
