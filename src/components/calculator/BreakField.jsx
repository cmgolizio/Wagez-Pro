import { parseMinutes } from "@/lib/calculations/time";

/** The breaks worth a single tap. Any other length is still typeable. */
const QUICK_BREAKS = ["15", "30", "45", "60"];

/**
 * The unpaid part of a shift, in minutes.
 *
 * A break is time on the clock that nobody is paid for, so it comes off before
 * the money is worked out. Kept as raw text like the pay rate: a half-typed
 * "1" on the way to "15" is not a mistake, and the value is normalized at
 * calculation time.
 *
 * Blank means no break, which is also what a shift without this field means —
 * so there is no "none" to press. Taking the field away is `action`'s job, the
 * same small red X the pay rate has.
 *
 * `action` is an optional control belonging to the field itself, set at the end
 * of the label row.
 */
export default function BreakField({
  id,
  label,
  value,
  error,
  onChange,
  action,
  ref,
}) {
  const errorId = `${id}-error`;
  // Announced without the trailing colon, and with the unit the "min"
  // adornment carries visually.
  const name = `${label.replace(/:$/, "")} in minutes`;
  // What is typed, as a number — so a quick break reads as pressed whether it
  // was tapped or typed.
  const minutes = parseMinutes(value);

  return (
    <div className='flex flex-col gap-1'>
      <div className='wagez-field-head'>
        <label className='wagez-field-label' htmlFor={id}>
          {label}
        </label>
        {action === undefined ? null : (
          <div className='wagez-field-actions'>{action}</div>
        )}
      </div>
      <div className='wagez-field'>
        <input
          ref={ref}
          id={id}
          type='text'
          inputMode='numeric'
          autoComplete='off'
          placeholder='0'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={name}
          aria-invalid={error === undefined ? undefined : "true"}
          aria-describedby={error === undefined ? undefined : errorId}
        />
        <span aria-hidden='true' className='text-sm font-semibold'>
          min
        </span>
      </div>

      {/* One row of one-press lengths: the quarter hours up to a full hour. */}
      <div className='grid grid-cols-4 gap-1.5'>
        {QUICK_BREAKS.map((quick) => (
          <button
            key={quick}
            type='button'
            className='wagez-chip'
            aria-label={`${Number(quick)} minute break`}
            aria-pressed={minutes === Number(quick)}
            onClick={() => onChange(quick)}
          >
            {quick}
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
