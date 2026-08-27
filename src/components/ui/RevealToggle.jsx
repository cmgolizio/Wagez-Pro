/**
 * A text-only switch for an optional field.
 *
 * Closed, it is just its own name — no box, no background, nothing competing
 * with the shift itself. Open, the name has been replaced by the field it
 * revealed, so the control shrinks to a small red X: the field below says what
 * it is, and all this has left to say is "take it away again".
 *
 * Closed, the visible name is the accessible name. Open there is no text to
 * read, so the X carries one of its own.
 *
 * Open, it belongs beside the field it revealed rather than off on its own —
 * an X with nothing next to it is a mark, not a control.
 */
export default function RevealToggle({
  id,
  label,
  removeLabel,
  open,
  controls,
  onToggle,
  ref,
}) {
  return (
    <button
      ref={ref}
      type='button'
      id={id}
      className='wagez-reveal'
      data-open={open ? "true" : undefined}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? removeLabel : undefined}
      onClick={onToggle}
    >
      {open ? (
        <svg
          className='wagez-reveal-x'
          viewBox='0 0 100 100'
          aria-hidden='true'
          focusable='false'
        >
          <line x1='8' y1='8' x2='92' y2='92' />
          <line x1='92' y1='8' x2='8' y2='92' />
        </svg>
      ) : (
        label
      )}
    </button>
  );
}
