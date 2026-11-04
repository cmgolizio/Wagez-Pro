"use client";

import { useEffect, useRef, useState } from "react";

import { calculateShift } from "@/lib/calculations/shift";
import { shiftSignature } from "@/lib/calculations/signature";
import { parseRateCents } from "@/lib/calculations/wages";
import { isIsoDate } from "@/lib/dates/isoDate";
import { formatRateInput } from "@/lib/formatters/currency";
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
 * control speaks — and the rate and break stay raw text until a calculation
 * turns them into cents and minutes. Kept deliberately separate from the
 * calculated result: editing the draft never recalculates anything.
 *
 * There is no day in here. A day is not something the calculator needs — the
 * same hours pay the same money whichever day they were worked — it is where a
 * shift goes once it is saved, and that is where it is decided.
 *
 * A new shift opens on the rate Wagez has been told to remember, if it has been
 * told one. That is the only thing that carries over from the last shift: the
 * times and the break start empty every time.
 */
function newDraft(defaultRate, employer = null) {
  return {
    startTime: "",
    endTime: "",
    hourlyRate: employer ? formatRateInput(employer.hourlyRateCents) : defaultRate,
    employerId: employer?.id ?? "",
    breakMinutes: "",
  };
}

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
  ready = true,
  shifts = [],
  defaultRateCents = null,
  employers = [],
  defaultEmployerId = null,
  onSave,
  onUpdate,
  onDelete,
  onSetDefaultRate,
  onShowWeek,
  onManageEmployers,
}) {
  // The saved rate as the field would have it typed — "" when there isn't one.
  const defaultRate = formatRateInput(defaultRateCents);
  const defaultEmployer = employers.find((employer) => employer.id === defaultEmployerId) ?? null;
  const [draft, setDraft] = useState(() => newDraft(defaultRate, defaultEmployer));
  // The last thing "Do Math." produced, plus the signature of the inputs it
  // was made from. Holding both together is what lets Wagez notice that the
  // draft has moved on without ever recalculating behind the user's back.
  const [calculation, setCalculation] = useState(null);
  const [stage, setStage] = useState(EDITING);
  // The optional parts of a shift: a rate, and an unpaid break. Both out of the
  // way until they are asked for.
  const [showRate, setShowRate] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  // Whether the saved default rate has been put into the shift on screen yet.
  const manualEmployerSelection = useRef(false);
  const manualRateEntry = useRef(false);
  const lastAppliedDefault = useRef({ ready: false, id: null });
  // Which optional field the user has just asked for, or asked to be rid of.
  // A fresh value each time, so asking twice reads as two asks — and null for
  // every field that appeared without being asked for.
  const [asked, setAsked] = useState(null);
  // Which shift this answer was saved as, and the signature it was saved at.
  // Only the id is held: the shift itself is read back out of the week every
  // time, so a shift edited or deleted over there can never leave a
  // confirmation here saying something that is no longer true.
  const [savedId, setSavedId] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [dayOpen, setDayOpen] = useState(false);
  const stageRef = useFitToViewport(active);

  /*
    The app loads settings after its first render, and the Shift view remains
    mounted while Settings is open. Apply the default the first time local
    storage is ready AND whenever the user changes their default employer.

    A deliberate employer choice or typed hourly rate always wins. This also
    keeps "No employer" an explicit, respected choice, while Reset starts
    a genuinely fresh shift using the latest defaults.
  */
  useEffect(() => {
    if (!ready) return;

    const previous = lastAppliedDefault.current;
    if (previous.ready && previous.id === defaultEmployerId) return;
    lastAppliedDefault.current = { ready: true, id: defaultEmployerId };

    if (manualEmployerSelection.current) return;

    const employerId = defaultEmployer?.id ?? "";
    const rate = defaultEmployer
      ? formatRateInput(defaultEmployer.hourlyRateCents)
      : defaultRate;

    setDraft((current) => {
      const hourlyRate = manualRateEntry.current ? current.hourlyRate : rate;
      if (
        current.employerId === employerId &&
        current.hourlyRate === hourlyRate
      ) {
        return current;
      }
      return { ...current, employerId, hourlyRate };
    });

    if (!manualRateEntry.current) setShowRate(rate !== "");
  }, [ready, defaultEmployerId, defaultEmployer, defaultRate]);

  // The rate on screen, as cents — null while it is blank or unreadable, which
  // is also when there is nothing that could be kept as a default.
  const rateCents = parseRateCents(draft.hourlyRate);
  const rateIsDefault =
    defaultRateCents !== null && rateCents === defaultRateCents;

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
    if (field === "employerId") {
      manualEmployerSelection.current = true;
      // Choosing an employer also chooses a rate for this draft.
      manualRateEntry.current = true;
    } else if (field === "hourlyRate") {
      manualRateEntry.current = true;
    }
    setDraft((current) => {
      if (field === "employerId") {
        const employer = employers.find((entry) => entry.id === value);
        return { ...current, employerId: value,
          hourlyRate: employer ? formatRateInput(employer.hourlyRateCents) : current.hourlyRate };
      }
      return { ...current, [field]: value };
    });
    if (field === "employerId" && value) setShowRate(true);
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
   * money would make the answer disagree with the shift the user can see. What
   * it does not take is the saved default: forgetting that is its own press.
   */
  function toggleRate() {
    manualRateEntry.current = true;
    const next = !showRate;
    setShowRate(next);
    setAsked({ field: "hourlyRate" });
    if (!next && draft.hourlyRate !== "") updateDraft("hourlyRate", "");
  }

  /**
   * Show or hide the unpaid break, on the same terms as the pay rate: hiding it
   * takes the minutes with it, because a break nobody can see must not go on
   * quietly costing them time.
   */
  function toggleBreak() {
    const next = !showBreak;
    setShowBreak(next);
    setAsked({ field: "breakMinutes" });
    if (!next && draft.breakMinutes !== "") updateDraft("breakMinutes", "");
  }

  /**
   * Keep the rate on screen as the one Wagez opens on, or stop keeping it.
   *
   * The shift itself is untouched either way. This is the only thing that ever
   * writes the default: typing over a rate is that shift's business.
   */
  function toggleDefaultRate() {
    onSetDefaultRate?.(rateIsDefault ? null : rateCents);
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
      employerId: draft.employerId,
      date: suggestShiftDate(values),
    });
    // Unreachable: these values already calculated. Belt and braces.
    if (!ok) return;

    if (onSave?.(shift) === false) return;
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

  /**
   * Start a fresh shift.
   *
   * Everything the user entered goes, and the saved default rate comes back —
   * a rate somebody asked Wagez to remember is not something a new shift should
   * make them type again. Nothing saved is touched: the week is elsewhere.
   */
  function reset() {
    manualEmployerSelection.current = false;
    manualRateEntry.current = false;
    setDraft(newDraft(defaultRate, defaultEmployer));
    setCalculation(null);
    setShowRate(defaultEmployer !== null || defaultRate !== "");
    setShowBreak(false);
    setAsked(null);
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
        employers={employers}
        entered={entered}
        errors={failed ? calculation.errors : NO_ERRORS}
        steppedBack={answerLeads}
        showRate={showRate}
        showBreak={showBreak}
        asked={asked}
        rateIsDefault={rateIsDefault}
        canBeDefault={rateCents !== null}
        onChange={updateDraft}
        onToggleRate={toggleRate}
        onToggleBreak={toggleBreak}
        onToggleDefaultRate={toggleDefaultRate}
        onCalculate={calculate}
        onReset={reset}
        onManageEmployers={onManageEmployers}
        onRecall={recallEditor}
      />
      <ResultDisplay
        result={result}
        active={active}
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
