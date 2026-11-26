"use client";

import { useRef, useState } from "react";
import { parseRateCents } from "@/lib/calculations/wages";
import { formatRateInput } from "@/lib/formatters/currency";
import { elapsedMinutes, shiftTimeKey } from "@/lib/adp/timecard";
import { readAdpScreenshots } from "@/lib/adp/screenshot";
import { isIsoDate } from "@/lib/dates/isoDate";

function duration(minutes) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export default function AdpTimecardImport({
  employers = [],
  shifts = [],
  defaultEmployerId = null,
  onImport,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [fileCount, setFileCount] = useState(0);
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [employerId, setEmployerId] = useState(defaultEmployerId ?? "");
  const initialEmployer = employers.find((entry) => entry.id === defaultEmployerId);
  const [rate, setRate] = useState(
    initialEmployer ? formatRateInput(initialEmployer.hourlyRateCents) : "",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const savedKeys = new Set(shifts.map(shiftTimeKey));
  const savedDates = new Set(shifts.map((shift) => shift.date));

  const statusOf = (row) => {
    if (!isIsoDate(row.date) || !/^\d{2}:\d{2}$/.test(row.startTime) ||
        !/^\d{2}:\d{2}$/.test(row.endTime) ||
        row.startTime === row.endTime) return "Correct this date or time";
    if (savedKeys.has(shiftTimeKey(row))) return "Already saved";
    if (savedDates.has(row.date)) return "An existing shift uses this date; review it manually";
    return null;
  };

  async function loadScreenshots(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    setRows(null);
    setWarnings([]);
    setMessage("");
    setError("");
    setBusy(true);
    try {
      const parsed = await readAdpScreenshots(files, Number(year));
      setRows(parsed.shifts.map((shift, index) => ({
        ...shift, id: index + 1, selected: !savedKeys.has(shiftTimeKey(shift)) &&
          !savedDates.has(shift.date),
      })));
      setWarnings(parsed.warnings);
      setFileCount(files.length);
    } catch (caught) {
      setError(caught.message || "Could not read the screenshot.");
    } finally {
      setBusy(false);
    }
  }

  function changeRow(id, changes) {
    setRows((current) => current.map((row) =>
      row.id === id ? { ...row, ...changes } : row));
  }

  function selectEmployer(id) {
    setEmployerId(id);
    const employer = employers.find((entry) => entry.id === id);
    setRate(employer ? formatRateInput(employer.hourlyRateCents) : "");
  }

  const selected = rows?.filter((row) => row.selected && !statusOf(row)) ?? [];
  const duplicateSelection = selected.some((row, index) =>
    selected.findIndex((other) => shiftTimeKey(other) === shiftTimeKey(row)) !== index ||
    selected.some((other) => other.id !== row.id && other.date === row.date),
  );

  function confirmImport() {
    if (!selected.length || duplicateSelection) return;
    const rateCents = rate.trim() ? parseRateCents(rate) : null;
    if (rate.trim() && (rateCents === null || !Number.isSafeInteger(rateCents))) {
      setError("Enter a valid hourly rate, or leave it empty for hours only.");
      return;
    }
    setError("");
    const outcome = onImport(
      selected.map(({ date, startTime, endTime }) => ({ date, startTime, endTime })),
      employerId,
      rateCents,
    );
    if (!outcome?.ok) {
      setError(outcome?.message || "Could not save these shifts.");
      return;
    }
    setMessage(`Imported ${outcome.added} shift(s). ${outcome.skipped ? `${outcome.skipped} skipped.` : ""}`);
    setRows(null);
    setWarnings([]);
  }

  return (
    <section className="wagez-settings wagez-employers flex flex-col gap-3">
      <h2 className="text-xl font-extrabold">Import ADP screenshots</h2>
      <p className="text-sm font-semibold">
        Take screenshots of the ADP Mobile Timecard screen showing dates and
        Worked punches. Select up to 10 screenshots at once. OCR runs on your
        device, and images are not uploaded to Wagez.
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="adp-screenshot-year" className="wagez-field-label">
          Year shown on the timecard (ADP screenshots omit the year)
        </label>
        <div className="wagez-field">
          <input id="adp-screenshot-year" type="number" inputMode="numeric"
            min="2000" max="2099" value={year}
            onChange={(event) => setYear(event.target.value)} />
        </div>
      </div>
      <button type="button" className="wagez-quiet-button wagez-shift-card"
        disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Reading screenshots…" : "Choose timecard screenshots"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        multiple
        className="sr-only"
        aria-label="Choose ADP timecard screenshots"
        onChange={loadScreenshots}
      />
      <p className="text-xs font-semibold">
        The OCR language files are downloaded when first used, so an internet
        connection is needed. Verify every extracted punch before importing.
      </p>

      {message ? <p role="status" className="font-bold">{message}</p> : null}
      {error ? <p role="alert" className="wagez-alert">{error}</p> : null}

      {rows ? (
        <div className="wagez-shift-card flex flex-col gap-3">
          <p className="font-extrabold">
            {rows.length} worked shift(s) detected in {fileCount} screenshot(s).
            Nothing has been saved yet.
          </p>
          {warnings.length ? (
            <div className="wagez-alert" role="status">
              <p className="font-bold">Review these entries that were skipped or flagged:</p>
              <ul className="list-disc pl-5">
                {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <label className="wagez-field-label" htmlFor="adp-employer">Employer for imported shifts</label>
            <div className="wagez-field">
              <select id="adp-employer" value={employerId}
                className="w-full min-h-10 bg-transparent font-bold"
                onChange={(event) => selectEmployer(event.target.value)}>
                <option value="">No employer</option>
                {employers.map((employer) => (
                  <option key={employer.id} value={employer.id}>{employer.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="adp-import-rate" className="wagez-field-label">
              Hourly rate for these shifts (optional)
            </label>
            <div className="wagez-field">
              <span aria-hidden="true">$</span>
              <input id="adp-import-rate" type="text" inputMode="decimal"
                value={rate} onChange={(event) => setRate(event.target.value)}
                placeholder="Hours only" />
              <span aria-hidden="true">/hour</span>
            </div>
            <p className="text-xs font-semibold">
              Screenshot does not include pay rate. All selected shifts receive
              this rate; import different pay-rate profiles separately.
            </p>
          </div>
          <fieldset className="flex flex-col gap-3">
            <legend className="wagez-field-label">Review and correct extracted shifts</legend>
            {rows.map((row) => {
              const status = statusOf(row);
              return (
                <div key={row.id} className="flex flex-col gap-2 rounded-lg border border-current/20 p-2">
                  <label className="flex items-center gap-2 font-bold">
                    <input type="checkbox" checked={row.selected} disabled={!!status}
                      onChange={(event) => changeRow(row.id, { selected: event.target.checked })} />
                    Include worked shift {row.id}
                  </label>
                  <label className="text-sm font-semibold">
                    Date
                    <input className="wagez-field w-full" type="date"
                      aria-label={`Date for shift ${row.id}`}
                      value={row.date}
                      onChange={(event) => changeRow(row.id, { date: event.target.value })} />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm font-semibold">
                      Clock in
                      <input className="wagez-field w-full" type="time"
                        aria-label={`Clock in for shift ${row.id}`}
                        value={row.startTime}
                        onChange={(event) => changeRow(row.id, { startTime: event.target.value })} />
                    </label>
                    <label className="text-sm font-semibold">
                      Clock out
                      <input className="wagez-field w-full" type="time"
                        aria-label={`Clock out for shift ${row.id}`}
                        value={row.endTime}
                        onChange={(event) => changeRow(row.id, { endTime: event.target.value })} />
                    </label>
                  </div>
                  <p className="text-sm font-semibold">
                    {status ? `Not importable: ${status}` :
                      `Punch span: ${duration(elapsedMinutes(row.startTime, row.endTime))}`}
                  </p>
                </div>
              );
            })}
          </fieldset>
          {duplicateSelection ? (
            <p role="alert" className="wagez-alert">
              Two selected shifts share a date. Import them separately or
              correct the extracted dates before continuing.
            </p>
          ) : null}
          <p className="text-xs font-semibold">
            Holiday/PTO entries are excluded, not treated as worked shifts.
            Breaks and adjustments cannot be inferred reliably from a screenshot;
            imported shifts default to no break. Check totals against ADP.
            Existing Wagez shifts are never overwritten.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="wagez-do-math" type="button"
              disabled={!selected.length || duplicateSelection} onClick={confirmImport}>
              Import {selected.length} shift(s)
            </button>
            <button className="wagez-quiet-button" type="button"
              onClick={() => { setRows(null); setWarnings([]); setError(""); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
