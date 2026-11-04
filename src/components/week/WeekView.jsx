"use client";

import { useEffect, useRef, useState } from "react";

import {
  DAYS_PER_WEEK,
  addDays,
  startOfWeek,
  todayIsoDate,
} from "@/lib/dates/isoDate";
import { formatWeekRange } from "@/lib/formatters/date";
import { formatWeekSummary } from "@/lib/share/weekSummary";
import {
  allocateShifts,
  groupShiftsByWeek,
  shiftsForWeek,
  summarizeAllocated,
} from "@/lib/shifts/week";

import OvertimeSettings from "@/components/settings/OvertimeSettings";
import { focusIfLost } from "@/components/ui/focus";

import SavedShiftCard from "./SavedShiftCard";
import { EDIT } from "./SavedShiftForm";
import ShareWeek from "./ShareWeek";
import WeekSummary from "./WeekSummary";

/** Where the keyboard goes when the shift it was on is no longer anywhere. */
const THE_WEEK = "week";

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
 *
 * One shift at a time is open — being edited, copied or asked about before it
 * is deleted. Which one is the only other thing this view remembers, and it is
 * forgotten as soon as the week moves on underneath it.
 */
export default function WeekView({
  shifts,
  employers = [],
  weekStartsOn,
  overtime,
  ready,
  onAdd,
  onUpdate,
  onDelete,
  onSetOvertime,
}) {
  const [chosenWeek, setChosenWeek] = useState(null);
  const [employerFilter, setEmployerFilter] = useState("all");
  const [open, setOpen] = useState(null);
  // The shift the keyboard should end up on once the week has redrawn itself,
  // or `THE_WEEK` when there is no longer a shift to end up on. A fresh value
  // each time, so moving the same shift twice reads as two moves.
  const [landing, setLanding] = useState(null);
  const headingRef = useRef(null);
  const listRef = useRef(null);

  /*
    An edit can move a shift into another week, a duplicate can put a copy
    there, and a delete takes one away entirely — in every case the card that
    was being worked on is gone from the screen by the time React is finished,
    and with it the button the keyboard was on.

    This runs after the cards have redrawn, so whatever they did with focus has
    already happened: a card that closed back into itself has taken its own
    focus back, and this finds the keyboard where the card left it and leaves it
    alone. It only acts when nothing has it — which is exactly the case where a
    shift has left the screen.
  */
  useEffect(() => {
    if (landing === null) return;

    const card = [...(listRef.current?.children ?? [])].find(
      (item) => item.dataset.shift === landing.on,
    );
    focusIfLost(
      landing.on === THE_WEEK
        ? headingRef.current
        : card?.querySelector(`[data-action="${EDIT}"]`),
    );
  }, [landing]);

  if (!ready) {
    return (
      <section className='wagez-week flex min-h-0 flex-1 flex-col'>
        <h2 className='sr-only' tabIndex={-1} ref={headingRef}>
          Week
        </h2>
      </section>
    );
  }

  const thisWeek = startOfWeek(todayIsoDate(), weekStartsOn);
  const weekStart = chosenWeek ?? thisWeek;
  const isThisWeek = weekStart === thisWeek;

  /** Go to another week, leaving nothing open behind. */
  function goToWeek(week) {
    setChosenWeek(week);
    setOpen(null);
  }

  /**
   * A shift the user has finished with. A duplicate arrives as a shift of its
   * own — new id and all — so what tells the two apart is simply whether this
   * is still the shift the card was opened on.
   *
   * A shift can be moved, or copied, onto a day in another week. The view goes
   * with it: what just happened should be visible where it happened, rather
   * than looking like a shift that vanished.
   */
  function save(shift, saved) {
    if (saved.id === shift.id) onUpdate?.(saved);
    else onAdd?.(saved);
    goToWeek(startOfWeek(saved.date, weekStartsOn));
    setLanding({ on: saved.id });
  }

  /**
   * A shift the user is finished with. The keyboard lands on the shift below
   * it, or above it where there is nothing below — and on the week itself when
   * that was the last one.
   */
  function remove(id) {
    const remaining = weekShifts
      .map(({ shift }) => shift.id)
      .filter((other) => other !== id);
    const gone = weekShifts.findIndex(({ shift }) => shift.id === id);
    const next = remaining[gone] ?? remaining[gone - 1] ?? THE_WEEK;

    onDelete?.(id);
    setOpen(null);
    setLanding({ on: next });
  }

  // Priced a week at a time, in the order the shifts were worked: with overtime
  // switched on, what a shift is worth depends on the hours that came before it.
  const allWeekShifts = allocateShifts(shiftsForWeek(shifts, weekStart), overtime);
  const weekShifts = allWeekShifts.filter(({ shift }) =>
    employerFilter === "all" || (employerFilter === "none" ? !shift.employerId : shift.employerId === employerFilter));
  const totals = summarizeAllocated(weekShifts);
  // Somewhere to go when this week is empty but the user's work is not.
  const [latestWeek] = groupShiftsByWeek(shifts, weekStartsOn);
  const elsewhere =
    weekShifts.length === 0 && latestWeek !== undefined ? latestWeek : null;

  return (
    <section className='wagez-week flex min-h-0 flex-1 flex-col gap-3'>
      {/* Focusable, so that a shift leaving the screen entirely has somewhere
          to hand the keyboard back to. */}
      <h2 className='sr-only' tabIndex={-1} ref={headingRef}>
        Week
      </h2>

      <nav className='wagez-week-nav' aria-label='Week'>
        <button
          type='button'
          className='wagez-quiet-button'
          aria-label='Previous week'
          onClick={() => goToWeek(addDays(weekStart, -DAYS_PER_WEEK))}
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
          onClick={() => goToWeek(addDays(weekStart, DAYS_PER_WEEK))}
        >
          ›
        </button>
      </nav>

      <div className='wagez-week-body'>
        <div className="flex flex-col gap-1 shrink-0">
          <label className="wagez-field-label" htmlFor="week-employer-filter">Filter by employer</label>
          <div className="wagez-field">
            <select id="week-employer-filter" className="w-full bg-transparent font-bold min-h-10"
              value={employerFilter} onChange={(event) => { setEmployerFilter(event.target.value); setOpen(null); }}>
              <option value="all">All employers</option>
              <option value="none">No employer</option>
              {employers.map((employer) => <option key={employer.id} value={employer.id}>{employer.name}</option>)}
            </select>
          </div>
        </div>
        {/* The totals and the one action that hands them to somebody else. */}
        <div className='wagez-week-totals'>
          <WeekSummary totals={totals} overtime={overtime} />
          <ShareWeek summary={formatWeekSummary(weekStart, totals, overtime)} />
        </div>

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
                  onClick={() => goToWeek(elsewhere.weekStart)}
                >
                  Go to {formatWeekRange(elsewhere.weekStart)}
                </button>
              </p>
            )}
          </div>
        ) : (
          <ul className='wagez-week-list' ref={listRef}>
            {weekShifts.map(({ shift, pay }) => (
              <SavedShiftCard
                key={shift.id}
                shift={shift}
                employers={employers}
                pay={pay}
                overtime={overtime}
                mode={open?.id === shift.id ? open.mode : null}
                onOpen={(mode) => setOpen({ id: shift.id, mode })}
                onClose={() => setOpen(null)}
                onSave={(saved) => save(shift, saved)}
                onDelete={() => remove(shift.id)}
              />
            ))}
          </ul>
        )}

        <OvertimeSettings overtime={overtime} onChange={onSetOvertime} />
      </div>
    </section>
  );
}
