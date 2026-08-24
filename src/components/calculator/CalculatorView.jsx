"use client";

import { useState } from "react";

import { calculateShift } from "@/lib/calculations/shift";
import { shiftSignature } from "@/lib/calculations/signature";

import CurrentInputDisplay, { currentValues } from "./CurrentInputDisplay";
import ResultDisplay from "./ResultDisplay";
import ShiftEditor from "./ShiftEditor";
import useFitToViewport from "./useFitToViewport";

/**
 * The shift the user is currently editing.
 *
 * Times are canonical `"HH:MM"` strings — the same representation the time
 * control speaks — while the rate stays raw text until a calculation turns it
 * into cents. Kept deliberately separate from the calculated result: editing
 * the draft never recalculates anything.
 */
const EMPTY_DRAFT = { startTime: "", endTime: "", hourlyRate: "" };

const NO_ERRORS = {};

/**
 * Which half of the screen is the headline.
 *
 * `EDITING` is the calculator: the inputs lead and any standing result waits
 * quietly below. `RESULT` is the answer: the money fills the screen and the
 * inputs step back out of its way until they are hovered or clicked.
 */
const EDITING = "editing";
const RESULT = "result";

export default function CalculatorView() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  // The last thing "Do Math." produced, plus the signature of the inputs it
  // was made from. Holding both together is what lets Wagez notice that the
  // draft has moved on without ever recalculating behind the user's back.
  const [calculation, setCalculation] = useState(null);
  const [stage, setStage] = useState(EDITING);
  // Hovering the stepped-back inputs brings them part of the way forward.
  const [peeking, setPeeking] = useState(false);
  const stageRef = useFitToViewport();

  /** Hand the screen back to the inputs. */
  function recallEditor() {
    setStage(EDITING);
    setPeeking(false);
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    // Stop pointing at a mistake the user is already fixing.
    setCalculation((current) =>
      current === null || current.ok ? current : null,
    );
    // Changing the shift is editing it, whatever the screen was showing —
    // this is the path for a keyboard that never left the panel.
    recallEditor();
  }

  /** "Do Math." — the only thing that produces a result. */
  function calculate() {
    // The math is local: validate, calculate and render in the same tick.
    const next = calculateShift(draft);
    setCalculation({ ...next, signature: shiftSignature(draft) });
    // An answer worth showing takes the screen; a complaint leaves it alone.
    if (next.ok) {
      setStage(RESULT);
      setPeeking(false);
    }
    return next;
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    setCalculation(null);
    recallEditor();
  }

  const failed = calculation !== null && !calculation.ok;
  const result = calculation?.ok ? calculation.result : null;
  // The inputs have moved on since the result was made, so the numbers below no
  // longer answer the question the display above is asking.
  const stale =
    result !== null && calculation.signature !== shiftSignature(draft);
  // How many values the display above is showing, which is what the editor
  // sizes itself against.
  const entered = currentValues(draft).length;
  const steppedBack = stage === RESULT;

  return (
    <main className='wagez-shell wagez-safe-area mx-auto flex w-full max-w-2xl flex-col gap-3'>
      <h1 className='wagez-brand shrink-0'>Wagez</h1>
      <div
        ref={stageRef}
        className='wagez-stage flex min-h-0 flex-1 flex-col items-center justify-center'
        data-stage={stage}
        data-peek={peeking ? "true" : undefined}
      >
        <CurrentInputDisplay
          draft={draft}
          steppedBack={steppedBack}
          onRecall={recallEditor}
          onPeek={setPeeking}
        />
        <ShiftEditor
          draft={draft}
          entered={entered}
          errors={failed ? calculation.errors : NO_ERRORS}
          steppedBack={steppedBack}
          onChange={updateDraft}
          onCalculate={calculate}
          onReset={reset}
          onRecall={recallEditor}
          onPeek={setPeeking}
        />
        <ResultDisplay result={result} stale={stale} />
      </div>
    </main>
  );
}
