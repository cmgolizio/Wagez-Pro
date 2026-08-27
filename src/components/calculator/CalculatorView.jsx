"use client";

import { useState } from "react";

import { calculateShift } from "@/lib/calculations/shift";
import { shiftSignature } from "@/lib/calculations/signature";
import { isIsoDate } from "@/lib/dates/isoDate";
import {
  createSavedShift,
  suggestShiftDate,
  updateSavedShift,
} from "@/lib/shifts/savedShift";

import CurrentInputDisplay, { currentValues } from "./CurrentInputDisplay";
import ResultDisplay from "./ResultDisplay";
import ShiftEditor from "./ShiftEditor";
import useFitToViewport from "./useFitToViewport";

/**
 * The shift the user is currently editing.
 *
 * Times are canonical `"HH:MM"` strings — the same representation the time
 * control speaks — and the rate stays raw text until a calculation turns it
 * into cents. Kept deliberately separate from the calculated result: editing
 * the draft never recalculates anything.
 *
 * There is no day in here. A day is not something the calculator needs — the
 * same hours pay the same money whichever day they were worked — it is where a
 * shift goes once it is saved, and that is where it is decided.
 */
const EMPTY_DRAFT = { startTime: "", endTime: "", hourlyRate: "" };

const NO_ERRORS = {};

/**
 * Which half of the screen is the headline.
 *
 * `EDITING` is the calculator: the inputs lead and any standing result waits
 * quietly to one side. `RESULT` is the answer: the money fills the screen and
 * the inputs step back out of its way. Whichever half has stepped back is a
 * single target that hands the screen back when it is clicked, so the two can
 * be swapped as often as the user likes.
 */
const EDITING = "editing";
const RESULT = "result";

export default function CalculatorView({
  active = true,
  shifts = [],
  onSave,
  onUpdate,
  onDelete,
  onShowWeek,
}) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  // The last thing "Do Math." produced, plus the signature of the inputs it
  // was made from. Holding both together is what lets Wagez notice that the
  // draft has moved on without ever recalculating behind the user's back.
  const [calculation, setCalculation] = useState(null);
  const [stage, setStage] = useState(EDITING);
  // The only optional part of a shift: a rate. Out of the way until asked for.
  const [showRate, setShowRate] = useState(false);
  // Which shift this answer was saved as, and the signature it was saved at.
  // Only the id is held: the shift itself is read back out of the week every
  // time, so a shift edited or deleted over there can never leave a
  // confirmation here saying something that is no longer true.
  const [savedId, setSavedId] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [dayOpen, setDayOpen] = useState(false);
  const stageRef = useFitToViewport(active);

  // The shift this answer was saved as, as the week has it right now — gone
  // entirely if it was deleted over there.
  const saved =
    savedId === null
      ? null
      : (shifts.find((shift) => shift.id === savedId) ?? null);

  /** Hand the screen back to the inputs. */
  function recallEditor() {
    setStage(EDITING);
  }

  /** Hand the screen back to the answer. */
  function recallResult() {
    setStage(RESULT);
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    // Stop pointing at a mistake the user is already fixing.
    setCalculation((current) =>
      current === null || current.ok ? current : null,
    );
    setDayOpen(false);
    // Changing the shift is editing it, whatever the screen was showing —
    // this is the path for a keyboard that never left the panel.
    recallEditor();
  }

  /**
   * Show or hide the pay rate.
   *
   * Hiding takes the rate with it. A rate that is off screen but still earning
   * money would make the answer disagree with the shift the user can see.
   */
  function toggleRate() {
    const next = !showRate;
    setShowRate(next);
    if (!next && draft.hourlyRate !== "") updateDraft("hourlyRate", "");
  }

  /**
   * The shift as the calculator currently means it.
   *
   * A pay rate is optional in Wagez, but a pay rate field the user has opened
   * and left empty is not: it is a question they started. The engine is told
   * which of the two this is rather than being asked to guess from the panel.
   */
  function shiftInput() {
    return { ...draft, rateRequired: showRate };
  }

  /** "Do Math." — the only thing that produces a result. */
  function calculate() {
    // The math is local: validate, calculate and render in the same tick.
    const input = shiftInput();
    const next = calculateShift(input);
    setCalculation({ ...next, signature: shiftSignature(input) });
    // An answer worth showing takes the screen; a complaint leaves it alone.
    if (next.ok) setStage(RESULT);
    return next;
  }

  /**
   * Save the shift on screen into the week.
   *
   * Deliberately separate from calculating: Wagez calculates all day without
   * keeping anything. But once the user has asked, that is the whole of it —
   * the day is worked out rather than demanded, and what gets saved is the
   * very numbers the answer above was made from, so the two can never differ.
   */
  function addToWeek() {
    const values = calculation?.result;
    if (values === null || values === undefined) return;

    const { ok, shift } = createSavedShift({
      ...values,
      date: suggestShiftDate(values),
    });
    // Unreachable: these values already calculated. Belt and braces.
    if (!ok) return;

    onSave?.(shift);
    setSavedId(shift.id);
    setSavedKey(calculation.signature);
    setDayOpen(false);
  }

  /** Move the saved shift to another day. It stays the same shift. */
  function changeDay(date) {
    if (saved === null || !isIsoDate(date) || date === saved.date) return;

    const { ok, shift } = updateSavedShift(saved, { ...saved, date });
    if (!ok) return;

    onUpdate?.(shift);
    setDayOpen(false);
  }

  /** Take it back out of the week, as though it was never added. */
  function undoSave() {
    if (saved === null) return;

    onDelete?.(saved.id);
    setSavedId(null);
    setSavedKey(null);
    setDayOpen(false);
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    setCalculation(null);
    setShowRate(false);
    setSavedId(null);
    setSavedKey(null);
    setDayOpen(false);
    recallEditor();
  }

  const failed = calculation !== null && !calculation.ok;
  const result = calculation?.ok ? calculation.result : null;
  const signature = shiftSignature(shiftInput());
  // The inputs have moved on since the result was made, so the numbers below no
  // longer answer the question the display above is asking.
  const stale = result !== null && calculation.signature !== signature;
  // How many values the display above is showing, which is what the editor
  // sizes itself against.
  const entered = currentValues(draft).length;
  // Which half has the screen. Whichever half does not is stepped back, and a
  // click on it takes the screen the other way.
  const answerLeads = stage === RESULT;
  // The answer on screen is still the one that was saved, so it is still the
  // one that can be taken back — and the day it says is the week's own.
  const savedDate =
    saved !== null && savedKey === signature ? saved.date : null;

  return (
    <div
      ref={stageRef}
      className='wagez-stage flex min-h-0 flex-1 flex-col items-center justify-center'
      data-stage={stage}
      data-answered={result === null ? undefined : "true"}
    >
      <CurrentInputDisplay
        draft={draft}
        steppedBack={answerLeads}
        onRecall={recallEditor}
      />
      <ShiftEditor
        draft={draft}
        entered={entered}
        errors={failed ? calculation.errors : NO_ERRORS}
        steppedBack={answerLeads}
        showRate={showRate}
        onChange={updateDraft}
        onToggleRate={toggleRate}
        onCalculate={calculate}
        onReset={reset}
        onRecall={recallEditor}
      />
      <ResultDisplay
        result={result}
        stale={stale}
        steppedBack={!answerLeads}
        onRecall={recallResult}
        savedDate={savedDate}
        dayOpen={dayOpen}
        onAddToWeek={addToWeek}
        onToggleDay={() => setDayOpen((open) => !open)}
        onChangeDay={changeDay}
        onUndo={undoSave}
        onShowWeek={onShowWeek}
      />
    </div>
  );
}
