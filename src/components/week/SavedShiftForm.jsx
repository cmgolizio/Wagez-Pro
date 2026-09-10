import { useEffect, useRef, useState } from "react";

import {
  createSavedShift,
  duplicateDraft,
  shiftDraft,
  updateSavedShift,
} from "@/lib/shifts/savedShift";

import BreakField from "@/components/calculator/BreakField";
import DateField from "@/components/calculator/DateField";
import RateField from "@/components/calculator/RateField";
import TimeField from "@/components/calculator/TimeField";

/** Editing a shift that is already in the week, or copying it into a new one. */
export const EDIT = "edit";
export const DUPLICATE = "duplicate";

const NO_ERRORS = {};

const TITLES = { [EDIT]: "Edit shift", [DUPLICATE]: "Duplicate shift" };

/**
 * A saved shift, open for changes.
 *
 * The same controls the calculator is entered with, so there is only one way to
 * type a time in Wagez. What the two modes differ in is only what becomes of
 * the values: editing keeps the shift it started from, id and all, while
 * duplicating leaves that shift exactly where it was and makes a new one.
 *
 * Nothing is written until the form is saved — a cancelled edit changes
 * nothing, and a cancelled duplicate creates nothing.
 *
 * The pay rate and the break are shown rather than hidden behind a word, unlike
 * the calculator: this is a shift somebody is coming back to fix, and a value
 * that needs correcting should not have to be found first. Left empty each
 * means what it always means — no money, and no break.
 */
export default function SavedShiftForm({ shift, mode, onSave, onCancel }) {
  const [draft, setDraft] = useState(() =>
    mode === DUPLICATE ? duplicateDraft(shift) : shiftDraft(shift),
  );
  const [errors, setErrors] = useState(NO_ERRORS);
  const formRef = useRef(null);
  const dateRef = useRef(null);
  const startRef = useRef(null);
  const endRef = useRef(null);
  const rateRef = useRef(null);
  const breakRef = useRef(null);

  // A card near the bottom of the week opens into a form taller than the room
  // left under it, so bring the whole of it into view — including the way out.
  useEffect(() => {
    formRef.current?.scrollIntoView?.({ block: "nearest" });
  }, []);

  // Both views stay mounted, so every field here needs an id of its own.
  const field = (name) => `shift-${shift.id}-${name}`;

  function updateDraft(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
    // Stop pointing at a mistake the user is already fixing.
    setErrors(NO_ERRORS);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const saved =
      mode === DUPLICATE
        ? createSavedShift(draft)
        : updateSavedShift(shift, draft);

    if (!saved.ok) {
      setErrors(saved.errors);
      // Put the user on the first thing that needs fixing, as the calculator
      // does — a form this tall can report a problem off the bottom of it.
      const firstInvalid = [
        [saved.errors.date, dateRef],
        [saved.errors.startTime, startRef],
        [saved.errors.endTime, endRef],
        [saved.errors.hourlyRate, rateRef],
        [saved.errors.breakMinutes, breakRef],
      ].find(([error]) => error !== undefined);
      firstInvalid?.[1].current?.focus();
      return;
    }
    onSave(saved.shift);
  }

  /** Escape is the way out of a form nobody meant to open. */
  function handleKeyDown(event) {
    if (event.key === "Escape") onCancel();
  }

  return (
    <form
      ref={formRef}
      className='wagez-shift-form'
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate
    >
      <h3 className='wagez-shift-form-title'>{TITLES[mode]}</h3>

      <DateField
        ref={dateRef}
        id={field("date")}
        label='Day:'
        value={draft.date}
        error={errors.date}
        onChange={(value) => updateDraft("date", value)}
        autoFocus
      />
      <TimeField
        ref={startRef}
        id={field("start")}
        label='Start:'
        value={draft.startTime}
        error={errors.startTime}
        onChange={(value) => updateDraft("startTime", value)}
      />
      <TimeField
        ref={endRef}
        id={field("end")}
        label='Stop:'
        value={draft.endTime}
        error={errors.endTime}
        onChange={(value) => updateDraft("endTime", value)}
      />
      <RateField
        ref={rateRef}
        id={field("rate")}
        label='Pay Rate:'
        value={draft.hourlyRate}
        error={errors.hourlyRate}
        onChange={(value) => updateDraft("hourlyRate", value)}
      />
      <BreakField
        ref={breakRef}
        id={field("break")}
        label='Break:'
        value={draft.breakMinutes}
        error={errors.breakMinutes}
        onChange={(value) => updateDraft("breakMinutes", value)}
      />

      <div className='wagez-shift-form-actions'>
        <button type='submit' className='wagez-do-math'>
          Save
        </button>
        <button
          type='button'
          className='wagez-quiet-button shrink-0'
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
