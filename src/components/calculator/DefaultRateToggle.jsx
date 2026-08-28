/**
 * The rate Wagez opens on.
 *
 * Most people earn the same thing every shift, so Wagez will remember one rate
 * and start every new shift with it. This is the whole of that feature: press
 * it and the rate on screen is the one Wagez opens on; press it again and it
 * goes back to opening on nothing.
 *
 * It is deliberately a toggle rather than a "save" button, because the state it
 * shows is the useful part: pressed means the rate in the field is the saved
 * one, so overriding a shift's rate visibly turns it off — which is exactly
 * what has happened. Nothing here changes the shift, and nothing about the
 * shift changes this: a rate typed over the default is that shift's business.
 *
 * With no readable rate to remember there is nothing to press, so it is
 * disabled rather than quietly doing nothing.
 */
export default function DefaultRateToggle({ pressed, disabled, onToggle }) {
  return (
    <button
      type='button'
      className='wagez-default-rate'
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onToggle}
    >
      Default
    </button>
  );
}
