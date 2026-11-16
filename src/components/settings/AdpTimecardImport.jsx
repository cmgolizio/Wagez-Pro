"use client";

import { useRef, useState } from "react";
import { parseRateCents } from "@/lib/calculations/wages";
import { formatRateInput } from "@/lib/formatters/currency";
import {
  elapsedMinutes,
  readAdpPdf,
  shiftTimeKey,
} from "@/lib/adp/timecard";

function duration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${String(remainder).padStart(2, "0")}m`;
}

export default function AdpTimecardImport({
  employers = [],
  shifts = [],
  defaultEmployerId = null,
  onImport,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]);
  const [employerId, setEmployerId] = useState(defaultEmployerId ?? "");
  const initialEmployer = employers.find((e) => e.id === defaultEmployerId);
  const [rate, setRate] = useState(
    initialEmployer ? formatRateInput(initialEmployer.hourlyRateCents) : "",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const savedKeys = new Set(shifts.map(shiftTimeKey));
  const savedDates = new Set(shifts.map((shift) => shift.date));

  const statusOf = (shift) => {
    if (savedKeys.has(shiftTimeKey(shift))) return "Already saved";
    if (savedDates.has(shift.date)) return "Review existing shift on this date";
    return null;
  };

  async function loadPdf(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    setPreview(null);
    setSelected([]);
    setMessage("");
    setError("");
    setBusy(true);
    try {
      if (files.length > 10) throw new Error("Import no more than 10 PDFs at once.");
      const all = [];
      const warnings = [];
      const seen = new Set();
      for (const file of files) {
        const parsed = await readAdpPdf(file);
        for (const shift of parsed.shifts) {
          const key = shiftTimeKey(shift);
          if (!seen.has(key)) {
            seen.add(key);
            all.push(shift);
          }
        }
        warnings.push(...parsed.warnings.map((text) => `${file.name}: ${text}`));
      }
      all.sort((a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
      );
      setPreview({ shifts: all, files: files.length, warnings });
      setSelected(all.filter((shift) => !statusOf(shift)).map(shiftTimeKey));
    } catch (caught) {
      setError(caught.message || "Could not read this timecard.");
    } finally {
      setBusy(false);
    }
  }

  function selectEmployer(id) {
    setEmployerId(id);
    const employer = employers.find((entry) => entry.id === id);
    setRate(employer ? formatRateInput(employer.hourlyRateCents) : "");
  }

  function confirmImport() {
    if (!preview || !selected.length) return;
    const rateCents = rate.trim() ? parseRateCents(rate) : null;
    if (rate.trim() && (rateCents === null || !Number.isSafeInteger(rateCents))) {
      setError("Enter a valid hourly rate, or leave it empty to track hours only.");
      return;
    }
    setError("");
    const eligible = preview.shifts.filter(
      (shift) => selected.includes(shiftTimeKey(shift)) && !statusOf(shift),
    );
    if (!eligible.length) {
      setError("These shifts already exist or require a manual review.");
      return;
    }
    const outcome = onImport(eligible, employerId, rateCents);
    if (!outcome?.ok) {
      setError(outcome?.message || "Could not save the selected shifts.");
      return;
    }
    setMessage(
      `Imported ${outcome.added} shift(s) into Wagez. ${outcome.skipped ? `${outcome.skipped} skipped.` : ""}`,
    );
    setPreview(null);
    setSelected([]);
  }

  const eligible = preview?.shifts.filter(
    (shift) => selected.includes(shiftTimeKey(shift)) && !statusOf(shift),
  ) ?? [];

  return (
    <section className="wagez-settings wagez-employers flex flex-col gap-3">
      <h2 className="text-xl font-extrabold">Import from ADP</h2>
      <p className="text-sm font-semibold">
        Download a timecard using ADP's Print → PDF option. Wagez reads this
        PDF on your device; it is not uploaded to a server or connected to ADP.
      </p>
      <button type="button" className="wagez-quiet-button wagez-shift-card"
        disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Reading PDF…" : "Choose ADP timecard PDF"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        aria-label="Choose ADP timecard PDF files"
        onChange={loadPdf}
      />
      {message ? <p role="status" className="font-bold">{message}</p> : null}
      {error ? <p role="alert" className="wagez-alert">{error}</p> : null}

      {preview ? (
        <div className="wagez-shift-card flex flex-col gap-3">
          <p className="font-extrabold">
            {preview.shifts.length} unique punch pair(s) found in {preview.files} PDF(s).
            Nothing has been saved yet.
          </p>
          {preview.warnings.length ? (
            <div className="wagez-alert" role="status">
              <p className="font-bold">Please review these warnings:</p>
              <ul className="list-disc pl-5">
                {preview.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <label className="wagez-field-label" htmlFor="adp-employer">
              Employer for imported shifts (optional)
            </label>
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
              Hourly rate for this import (optional)
            </label>
            <div className="wagez-field">
              <span aria-hidden="true">$</span>
              <input id="adp-import-rate" type="text" inputMode="decimal"
                value={rate} onChange={(event) => setRate(event.target.value)}
                placeholder="Hours only" />
              <span aria-hidden="true">/hour</span>
            </div>
            <p className="text-xs font-semibold">
              Prefilled from the selected employer. Confirm this rate applies
              to these dates; ADP's PDF does not list hourly pay.
            </p>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="wagez-field-label">Shifts to import</legend>
            {preview.shifts.map((shift) => {
              const key = shiftTimeKey(shift);
              const status = statusOf(shift);
              return (
                <label key={key} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1"
                    checked={selected.includes(key) && !status}
                    disabled={status !== null}
                    onChange={(event) => {
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, key]
                          : current.filter((value) => value !== key),
                      );
                    }} />
                  <span className="text-sm font-semibold">
                    {shift.date} · {shift.startTime}–{shift.endTime} ·{" "}
                    {duration(elapsedMinutes(shift.startTime, shift.endTime))}
                    {status ? <span className="block text-xs">Skipped: {status}</span> : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <p className="text-xs font-semibold">
            Breaks, corrected punches, and paid-hour adjustments cannot be
            inferred from the sample format. Wagez assumes no unpaid break.
            Same-day conflicts are left unchanged for manual review.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="wagez-do-math" type="button"
              disabled={!eligible.length} onClick={confirmImport}>
              Import {eligible.length} shift(s)
            </button>
            <button className="wagez-quiet-button" type="button"
              onClick={() => { setPreview(null); setSelected([]); setError(""); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
