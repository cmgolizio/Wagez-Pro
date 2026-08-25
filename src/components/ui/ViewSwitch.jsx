/**
 * Shift / Week.
 *
 * Wagez has two screens, so its navigation is two words. Both stay visible and
 * the current one is pressed, which is the whole of the model: there is nowhere
 * else to go.
 */
export default function ViewSwitch({ view, views, onChange }) {
  return (
    <nav className='wagez-switch' aria-label='Views'>
      {views.map(({ id, label }) => (
        <button
          key={id}
          type='button'
          aria-pressed={view === id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
