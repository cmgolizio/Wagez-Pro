import { MONDAY, SUNDAY } from "@/lib/dates/isoDate";

const DAYS = [
  { id: SUNDAY, label: "Sun", name: "Sunday" },
  { id: MONDAY, label: "Mon", name: "Monday" },
];

/**
 * Which day a week begins on.
 *
 * A seven-day week has to start somewhere, and where it starts decides which
 * shifts are counted together. Sunday is the default; a week that runs Monday
 * to Sunday is one press away.
 *
 * Nothing saved moves when it changes: a shift belongs to the day it was
 * worked, and the weeks are only the lines drawn around those days. So the
 * choice is made here, at the foot of the week it draws, rather than anywhere
 * near entering a shift.
 */
export default function WeekStartSetting({ weekStartsOn, onChange }) {
  return (
    <div className='wagez-settings'>
      <div className='wagez-setting-row'>
        <span id='week-start-label'>Week starts</span>
        <div
          className='wagez-setting-choice'
          role='group'
          aria-labelledby='week-start-label'
        >
          {DAYS.map(({ id, label, name }) => (
            <button
              key={id}
              type='button'
              aria-label={name}
              aria-pressed={weekStartsOn === id}
              onClick={() => onChange?.(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
