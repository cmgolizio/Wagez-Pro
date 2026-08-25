"use client";

import { useState } from "react";

import { calculateShift } from "@/lib/calculations/shift";
import { shiftSignature } from "@/lib/calculations/signature";
import { todayIsoDate } from "@/lib/dates/isoDate";
import { formatShiftDay } from "@/lib/formatters/date";
import { createSavedShift } from "@/lib/shifts/savedShift";

import CurrentInputDisplay, { currentValues } from "./CurrentInputDisplay";
import ResultDisplay from "./ResultDisplay";
import ShiftEditor from "./ShiftEditor";
import useFitToViewport from "./useFitToViewport";

/**
 * The shift the user is currently editing.
 *
 * Times are canonical `"HH:MM"` strings — the same representation the time
 * control speaks — the date is an ISO `"YYYY-MM-DD"` string, and the rate stays
 * raw text until a calculation turns it into cents. Kept deliberately separate
 * from the calculated result: editing the draft never recalculates anything.
 */
const EMPTY_DRAFT = { startTime: "", endTime: "", hourlyRate: "", date: "" };

const NO_ERRORS = {};

/** Shown when saving is waiting on the one thing a week needs: a day. */
const PICK_A_DAY = "Which day was this? Then add it to your week.";

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

/**
 * What a saved shift would be made of, as one comparable string.
 *
 * The calculation signature covers the numbers; the date is the one thing a
 * saved shift carries that the answer on screen does not. Together they are how
 * Wagez knows the shift in front of the user is still the one it just saved.
 */
function saveKey(input) {
  return `${input.date}|${shiftSignature(input)}`;
}

export default function CalculatorView({ active = true, onSave, onShowWeek }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  // The last thing "Do Math." produced, plus the signature of the inputs it
  // was made from. Holding both together is what lets Wagez notice that the
  // draft has moved on without ever recalculating behind the user's back.
  const [calculation, setCalculation] = useState(null);
  const [stage, setStage] = useState(EDITING);
  // The optional half of a shift. Both start out of the way: a shift needs two
  // times, and nothing else.
  const [showRate, setShowRate] = useState(false);
  const [showDate, setShowDate] = useState(false);
  // The shift last added to the week, and what to say about it.
  const [savedKey, setSavedKey] = useState(null);
  const [savedDay, setSavedDay] = useState(null);
  const [saveHint, setSaveHint] = useState(null);
  const stageRef = useFitToViewport(active);

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
    setSaveHint(null);
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
   * Show or hide the day, which most often is today — so that is what it opens
   * on, already filled in and ready to be changed.
   */
  function toggleDate() {
    const next = !showDate;
    setShowDate(next);
    if (next) {
      if (draft.date === "") updateDraft("date", todayIsoDate());
    } else if (draft.date !== "") {
      updateDraft("date", "");
    }
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
   * keeping anything. A week is chronological, so this is also the point at
   * which an undated shift has to be given its day.
   */
  function addToWeek() {
    if (draft.date === "") {
      setShowDate(true);
      updateDraft("date", todayIsoDate());
      setSaveHint(PICK_A_DAY);
      return;
    }

    const { ok, shift, message } = createSavedShift(shiftInput());
    if (!ok) {
      setSaveHint(message);
      return;
    }

    onSave?.(shift);
    setSavedKey(saveKey(shiftInput()));
    setSavedDay(formatShiftDay(shift.date));
    setSaveHint(null);
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    setCalculation(null);
    setShowRate(false);
    setShowDate(false);
    setSavedKey(null);
    setSavedDay(null);
    setSaveHint(null);
    recallEditor();
  }

  const failed = calculation !== null && !calculation.ok;
  const result = calculation?.ok ? calculation.result : null;
  // The inputs have moved on since the result was made, so the numbers below no
  // longer answer the question the display above is asking.
  const stale =
    result !== null && calculation.signature !== shiftSignature(shiftInput());
  // How many values the display above is showing, which is what the editor
  // sizes itself against.
  const entered = currentValues(draft).length;
  // Which half has the screen. Whichever half does not is stepped back, and a
  // click on it takes the screen the other way.
  const answerLeads = stage === RESULT;

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
        showDate={showDate}
        onChange={updateDraft}
        onToggleRate={toggleRate}
        onToggleDate={toggleDate}
        onCalculate={calculate}
        onReset={reset}
        onRecall={recallEditor}
      />
      <ResultDisplay
        result={result}
        stale={stale}
        steppedBack={!answerLeads}
        onRecall={recallResult}
        saved={savedKey !== null && savedKey === saveKey(shiftInput())}
        savedDay={savedDay}
        hint={saveHint}
        onAddToWeek={addToWeek}
        onShowWeek={onShowWeek}
      />
    </div>
  );
}
