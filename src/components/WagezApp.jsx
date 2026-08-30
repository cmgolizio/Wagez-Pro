"use client";

import { useState } from "react";

import CalculatorView from "./calculator/CalculatorView";
import ViewSwitch from "./ui/ViewSwitch";
import WeekView from "./week/WeekView";
import useWagezData from "./useWagezData";

const SHIFT = "shift";
const WEEK = "week";

const VIEWS = [
  { id: SHIFT, label: "Shift" },
  { id: WEEK, label: "Week" },
];

/**
 * Wagez, all of it.
 *
 * Two screens — the calculator and the week — and the saved shifts they share.
 * Both stay mounted: switching to the week and back must not throw away the
 * shift someone is halfway through entering.
 */
export default function WagezApp() {
  const {
    ready,
    shifts,
    settings,
    addShift,
    updateShift,
    removeShift,
    setDefaultRateCents,
    setOvertime,
  } = useWagezData();
  const [view, setView] = useState(SHIFT);

  return (
    <main className='wagez-shell wagez-safe-area flex w-full flex-col gap-3'>
      <header className='flex shrink-0 items-center justify-between gap-3'>
        <h1 className='wagez-brand'>Wagez</h1>
        <ViewSwitch view={view} views={VIEWS} onChange={setView} />
      </header>

      <div className={view === SHIFT ? "contents" : "hidden"}>
        <CalculatorView
          active={view === SHIFT}
          ready={ready}
          shifts={shifts}
          defaultRateCents={settings.defaultHourlyRateCents}
          onSave={addShift}
          onUpdate={updateShift}
          onDelete={removeShift}
          onSetDefaultRate={setDefaultRateCents}
          onShowWeek={() => setView(WEEK)}
        />
      </div>
      <div className={view === WEEK ? "contents" : "hidden"}>
        <WeekView
          shifts={shifts}
          weekStartsOn={settings.weekStartsOn}
          overtime={settings.overtime}
          ready={ready}
          onAdd={addShift}
          onUpdate={updateShift}
          onDelete={removeShift}
          onSetOvertime={setOvertime}
        />
      </div>
    </main>
  );
}
