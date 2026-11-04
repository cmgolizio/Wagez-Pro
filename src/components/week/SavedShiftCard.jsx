import { useEffect, useRef } from "react";

import { formatCents } from "@/lib/formatters/currency";
import { formatShiftDay } from "@/lib/formatters/date";
import { formatDurationCompact } from "@/lib/formatters/duration";
import { formatMultiplier } from "@/lib/formatters/overtime";
import { formatTime } from "@/lib/formatters/time";
import { deriveShift } from "@/lib/shifts/savedShift";

import SavedShiftForm, { DUPLICATE, EDIT } from "./SavedShiftForm";

/** Asking to delete a shift, which is the one thing that needs asking. */
export const DELETE = "delete";

/**
 * One saved shift, as a week reads it: the day, the hours it covered, how long
 * that was and what it came to.
 *
 * Every number here is derived from the shift's own start, end, rate and break
 * as it is drawn, so a card can never show a total that has drifted away from
 * the shift it belongs to. That is also why an edit needs nothing more than
 * changing those values: the card, and the week under it, redraw themselves.
 *
 * `mode` is what this card is currently being asked to do — the week lets only
 * one card be open at a time, so an editor is never lost behind another. The
 * card gives focus back to the action that opened it when it closes, so the
 * keyboard ends up where it started.
 *
 * `pay` is how the week priced this shift. It is the week's business rather
 * than the shift's, because overtime depends on the hours worked before it: the
 * same eight hours are worth one thing on a Monday and another on the Friday
 * that crosses the threshold. Without it the card falls back to the shift's own
 * base pay, which is the same number whenever overtime is switched off.
 */
export default function SavedShiftCard({
  shift,
  employers = [],
  pay = null,
  overtime = null,
  mode = null,
  onOpen,
  onClose,
  onSave,
  onDelete,
}) {
  const actionsRef = useRef(null);
  const cancelRef = useRef(null);
  // Which action the card was last opened by, so closing can hand focus back.
  const openedBy = useRef(null);

  useEffect(() => {
    if (mode === DELETE) {
      // Deleting is not undoable, so the way out is what the keyboard lands on.
      cancelRef.current?.focus();
    } else if (mode === null && openedBy.current !== null) {
      actionsRef.current
        ?.querySelector(`[data-action="${openedBy.current}"]`)
        ?.focus();
    }
    openedBy.current = mode;
  }, [mode]);

  const derived = deriveShift(shift);
  if (derived === null) return null;

  const day = formatShiftDay(shift.date);
  // What this shift was actually paid, which is the week's answer where it has
  // one — a shift can be part regular and part overtime.
  const payCents = pay === null ? derived.basePayCents : pay.payCents;
  // Overtime is only ever named where the week has both priced this shift and
  // been told how it prices overtime.
  const overtimeMinutes =
    pay === null || overtime === null ? 0 : pay.overtimeMinutes;
  // Every card offers the same three words, so each says which shift it means.
  const name = `${day}, ${formatTime(shift.startTime)}`;
  const questionId = `shift-${shift.id}-confirm`;

  if (mode === EDIT || mode === DUPLICATE) {
    return (
      <li className='wagez-shift-card' data-shift={shift.id}>
        <SavedShiftForm
          shift={shift}
          employers={employers}
          mode={mode}
          onSave={onSave}
          onCancel={onClose}
        />
      </li>
    );
  }

  return (
    // The week finds a card by the shift it holds, so that a shift moved into
    // another week can be handed the keyboard once it is drawn there.
    <li className='wagez-shift-card' data-shift={shift.id}>
      <p className='wagez-shift-day'>{day}{shift.employerId ? ` · ${employers.find((e) => e.id === shift.employerId)?.name ?? "Former employer"}` : ""}</p>
      <p className='wagez-shift-times'>
        {formatTime(shift.startTime)} → {formatTime(shift.endTime)}
        {derived.crossesMidnight ? (
          <span className='wagez-shift-overnight'> +1 day</span>
        ) : null}
        {/* The hours below are what was paid for, so a shift that lost some of
            them to an unpaid break says where they went. */}
        {derived.breakMinutes === 0 ? null : (
          <span className='wagez-shift-break'>
            {" "}
            − {formatDurationCompact(derived.breakMinutes)} break
          </span>
        )}
      </p>
      <p className='wagez-shift-totals'>
        <span className='wagez-shift-hours'>
          <span className='wagez-shift-duration'>
            {formatDurationCompact(derived.paidMinutes)}
          </span>
          {/* Where the week's threshold fell, said on the shift it fell in. */}
          {overtimeMinutes === 0 ? null : (
            <span className='wagez-shift-overtime'>
              {" "}
              {formatDurationCompact(overtimeMinutes)} at{" "}
              {formatMultiplier(overtime.multiplier)}
            </span>
          )}
        </span>
        {payCents === null ? null : (
          <span className='wagez-shift-pay'>{formatCents(payCents)}</span>
        )}
      </p>

      {mode === DELETE ? (
        <div className='wagez-shift-confirm'>
          <p className='wagez-shift-question' id={questionId}>
            Delete this shift?
          </p>
          {/* The way out comes first: it is where the keyboard is put, so the
              answer the user came for is the very next thing they reach. The
              question names the pair, so it is read out with whichever of the
              two the user lands on. */}
          <div
            className='wagez-shift-actions'
            role='group'
            aria-labelledby={questionId}
          >
            <button
              ref={cancelRef}
              type='button'
              className='wagez-quiet-button'
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type='button'
              className='wagez-quiet-button wagez-danger'
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div ref={actionsRef} className='wagez-shift-actions'>
          <button
            type='button'
            className='wagez-quiet-button'
            data-action={EDIT}
            aria-label={`Edit ${name}`}
            onClick={() => onOpen(EDIT)}
          >
            Edit
          </button>
          <button
            type='button'
            className='wagez-quiet-button'
            data-action={DUPLICATE}
            aria-label={`Duplicate ${name}`}
            onClick={() => onOpen(DUPLICATE)}
          >
            Duplicate
          </button>
          <button
            type='button'
            className='wagez-quiet-button'
            data-action={DELETE}
            aria-label={`Delete ${name}`}
            onClick={() => onOpen(DELETE)}
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
