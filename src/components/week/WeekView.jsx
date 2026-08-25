"use client";

import { useState } from "react";

import {
  DAYS_PER_WEEK,
  addDays,
  startOfWeek,
  todayIsoDate,
} from "@/lib/dates/isoDate";
import { formatWeekRange } from "@/lib/formatters/date";
import {
  groupShiftsByWeek,
  shiftsForWeek,
  summarizeShifts,
} from "@/lib/shifts/week";

import SavedShiftCard from "./SavedShiftCard";
import WeekSummary from "./WeekSummary";

/**
 * The saved shifts of one seven-day week, in order.
 *
 * Which week is on screen is the only state here, and it stays empty until the
 * user goes looking: the week Wagez opens on is simply the week it is now.
 * Everything else — the order, the totals, what belongs in this week at all —
 * is derived from the saved shifts every time they are drawn, so nothing can be
 * shown that the stored shifts do not actually say.
 *
 * Nothing is drawn until the device has been read. "Today" is where the user
 * is, not where the server is, and a week is worth waiting a beat to get right.
 */
export default function WeekView({ shifts, weekStartsOn, ready }) {
  const [chosenWeek, setChosenWeek] = useState(null);

  if (!ready) {
    return (
      <section className='wagez-week flex min-h-0 flex-1 flex-col'>
        <h2 className='sr-only'>Week</h2>
      </section>
    );
  }

  const thisWeek = startOfWeek(todayIsoDate(), weekStartsOn);
  const weekStart = chosenWeek ?? thisWeek;
  const isThisWeek = weekStart === thisWeek;

  const weekShifts = shiftsForWeek(shifts, weekStart);
  const totals = summarizeShifts(weekShifts);
  // Somewhere to go when this week is empty but the user's work is not.
  const [latestWeek] = groupShiftsByWeek(shifts, weekStartsOn);
  const elsewhere =
    weekShifts.length === 0 && latestWeek !== undefined ? latestWeek : null;

  return (
    <section className='wagez-week flex min-h-0 flex-1 flex-col gap-3'>
      <h2 className='sr-only'>Week</h2>

      <nav className='wagez-week-nav' aria-label='Week'>
        <button
          type='button'
          className='wagez-quiet-button'
          aria-label='Previous week'
          onClick={() => setChosenWeek(addDays(weekStart, -DAYS_PER_WEEK))}
        >
          ‹
        </button>
        <p className='wagez-week-label'>
          <span className='wagez-week-name'>
            {isThisWeek ? "This week" : formatWeekRange(weekStart)}
          </span>
          <span className='wagez-week-range'>
            {isThisWeek ? formatWeekRange(weekStart) : null}
          </span>
        </p>
        <button
          type='button'
          className='wagez-quiet-button'
          aria-label='Next week'
          onClick={() => setChosenWeek(addDays(weekStart, DAYS_PER_WEEK))}
        >
          ›
        </button>
      </nav>

      <div className='wagez-week-body'>
        <WeekSummary totals={totals} />

        {weekShifts.length === 0 ? (
          <div className='wagez-week-empty'>
            <p>
              Nothing saved this week yet. Do the math on a shift, give it a
              day, then add it to your week.
            </p>
            {elsewhere === null ? null : (
              <p className='mt-3'>
                <button
                  type='button'
                  className='wagez-inline-button'
                  onClick={() => setChosenWeek(elsewhere.weekStart)}
                >
                  Go to {formatWeekRange(elsewhere.weekStart)}
                </button>
              </p>
            )}
          </div>
        ) : (
          <ul className='wagez-week-list'>
            {weekShifts.map((shift) => (
              <SavedShiftCard key={shift.id} shift={shift} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
