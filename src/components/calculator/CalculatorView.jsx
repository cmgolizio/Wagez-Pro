"use client";

import { useState } from "react";

import { calculateShift } from "@/lib/calculations/shift";

import CurrentInputDisplay from "./CurrentInputDisplay";
import ResultDisplay from "./ResultDisplay";
import ShiftEditor from "./ShiftEditor";

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

export default function CalculatorView() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [calculation, setCalculation] = useState(null);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    // Stop pointing at a mistake the user is already fixing.
    setCalculation((current) =>
      current === null || current.ok ? current : null,
    );
  }

  /** "Do Math." — the only thing that produces a result. */
  function calculate() {
    // The math is local: validate, calculate and render in the same tick.
    const next = calculateShift(draft);
    setCalculation(next);
    return next;
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    setCalculation(null);
  }

  const failed = calculation !== null && !calculation.ok;

  return (
    <main className='wagez-safe-area mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4'>
      <h1 className='shrink-0 text-lg font-extrabold tracking-tight text-ink'>
        Wagez
      </h1>
      <CurrentInputDisplay draft={draft} />
      <ShiftEditor
        draft={draft}
        errors={failed ? calculation.errors : NO_ERRORS}
        onChange={updateDraft}
        onCalculate={calculate}
        onReset={reset}
      />
      <ResultDisplay result={calculation?.ok ? calculation.result : null} />
    </main>
  );
}
