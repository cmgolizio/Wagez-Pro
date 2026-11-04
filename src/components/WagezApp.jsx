"use client";

import { useState } from "react";

import CalculatorView from "./calculator/CalculatorView";
import ViewSwitch from "./ui/ViewSwitch";
import WeekView from "./week/WeekView";
import EmployerSettings from "./settings/EmployerSettings";
import DataBackup from "./settings/DataBackup";
import useWagezData from "./useWagezData";

const SHIFT = "shift";
const WEEK = "week";
const SETTINGS = "settings";

const VIEWS = [
  { id: SHIFT, label: "Shift" },
  { id: WEEK, label: "Week" },
  { id: SETTINGS, label: "Settings" },
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
    saveFailed,
    shifts,
    settings,
    employers,
    saveEmployer,
    deleteEmployer,
    setDefaultEmployer,
    restoreData,
    addShift,
    updateShift,
    removeShift,
    setDefaultRateCents,
    setOvertime,
  } = useWagezData();
  const [view, setView] = useState(SHIFT);

  return (
    <main className='wagez-shell wagez-safe-area flex w-full flex-col gap-3'>
      {/* Wrapping is for the extremes — a very narrow phone, or a page zoomed
          well in — where the name and the two views cannot share a line. */}
      <header className='flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1'>
        <h1 className='wagez-brand'>Wagez</h1>
        <ViewSwitch view={view} views={VIEWS} onChange={setView} />
      </header>

      {saveFailed ? <p role="alert" className="wagez-alert font-bold">Save failed. Browser storage is unavailable or full; your latest change was not saved. Export a backup or free space before continuing.</p> : null}
      <div className={view === SHIFT ? "contents" : "hidden"}>
        <CalculatorView
          active={view === SHIFT}
          ready={ready}
          shifts={shifts}
          defaultRateCents={settings.defaultHourlyRateCents}
          employers={employers}
          defaultEmployerId={settings.defaultEmployerId}
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
          employers={employers}
          weekStartsOn={settings.weekStartsOn}
          overtime={settings.overtime}
          ready={ready}
          onAdd={addShift}
          onUpdate={updateShift}
          onDelete={removeShift}
          onSetOvertime={setOvertime}
        />
      </div>
      {view === SETTINGS ? (
        <section className="wagez-week flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <EmployerSettings employers={employers} shifts={shifts}
            defaultEmployerId={settings.defaultEmployerId}
            onSave={saveEmployer} onDelete={deleteEmployer} onSetDefault={setDefaultEmployer} />
          <DataBackup data={{ shifts, employers, settings }} onRestore={restoreData} />
        </section>
      ) : null}
    </main>
  );
}
