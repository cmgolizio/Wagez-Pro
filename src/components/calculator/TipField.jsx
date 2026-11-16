/**
 * Optional cash/card tips recorded for a single shift.
 * Styled like the existing break and pay-rate fields.
 */
export default function TipField({
  id,
  label = "Tip:",
  value,
  error,
  onChange,
  action,
  ref,
}) {
  const errorId = `${id}-error`;
  return (
    <div className='flex flex-col gap-1'>
      <div className='wagez-field-head'>
        <label className='wagez-field-label' htmlFor={id}>{label}</label>
        {action === undefined ? null : (
          <div className='wagez-field-actions'>{action}</div>
        )}
      </div>
      <div className='wagez-field'>
        <span aria-hidden='true' className='text-xl font-semibold'>$</span>
        <input
          ref={ref}
          id={id}
          type='text'
          inputMode='decimal'
          autoComplete='off'
          placeholder='0.00'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label='Tip in dollars'
          aria-invalid={error === undefined ? undefined : "true"}
          aria-describedby={error === undefined ? undefined : errorId}
        />
        <span aria-hidden='true' className='text-sm font-semibold'>tip</span>
      </div>
      {error === undefined ? null : (
        <p className='wagez-alert' id={errorId} role='alert'>{error}</p>
      )}
    </div>
  );
}
