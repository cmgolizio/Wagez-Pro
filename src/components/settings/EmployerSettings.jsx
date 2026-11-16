"use client";

import { useState } from "react";
import { parseRateCents } from "@/lib/calculations/wages";
import { formatHourlyRate, formatRateInput } from "@/lib/formatters/currency";
import { companyGroups, companyNameFor } from "@/lib/employers/company";

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `employer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function EmployerSettings({
  employers, shifts, defaultEmployerId, onSave, onDelete, onSetDefault,
}) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const clear = () => { setName(""); setRate(""); setCompanyName(""); setEditingId(null); setError(""); };

  function submit(event) {
    event.preventDefault();
    const cleaned = name.trim();
    const cents = parseRateCents(rate);
    if (!cleaned || cleaned.length > 100) {
      setError("Enter an employer name (up to 100 characters).");
      return;
    }
    if (cents === null || !Number.isSafeInteger(cents) || cents < 0) {
      setError("Enter a valid hourly rate.");
      return;
    }
    if (employers.some((e) =>
      e.name.toLowerCase() === cleaned.toLowerCase() && e.id !== editingId)) {
      setError("An employer with that name already exists.");
      return;
    }
    const company = companyName.trim();
    if (company.length > 100) {
      setError("Enter a company name of 100 characters or fewer.");
      return;
    }
    if (onSave({
      id: editingId ?? makeId(),
      name: cleaned,
      hourlyRateCents: cents,
      ...(company ? { companyName: company } : {}),
    }) === false) {
      setError("Wagez couldn't save this employer.");
      return;
    }
    clear();
  }

  function edit(employer) {
    setEditingId(employer.id);
    setName(employer.name);
    setRate(formatRateInput(employer.hourlyRateCents));
    setCompanyName(employer.companyName ?? "");
    setError("");
  }

  const groups = companyGroups(employers);

  return (
    <section className="wagez-settings wagez-employers">
      <h2 className="text-xl font-extrabold">Employers</h2>
      <p className="text-sm font-semibold">
        Keep separate profiles for different hourly rates. Give profiles from
        the same workplace the same Company name to group their shifts and
        earnings together. Historical shift rates do not change.
      </p>
      {employers.length ? (
        <ul className="flex flex-col gap-2">
          {employers.map((employer) => {
            const used = shifts.some((shift) => shift.employerId === employer.id);
            const isDefault = defaultEmployerId === employer.id;
            return (
              <li key={employer.id} className="wagez-shift-card flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-extrabold">{employer.name}</p>
                  <p className="text-sm font-semibold">{formatHourlyRate(employer.hourlyRateCents)} {isDefault ? "· Default" : ""}</p>
                  <p className="text-sm font-semibold">Company: {companyNameFor(employer)}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="wagez-quiet-button" onClick={() => onSetDefault(isDefault ? null : employer.id)}>
                    {isDefault ? "Unset default" : "Make default"}
                  </button>
                  <button type="button" className="wagez-quiet-button" onClick={() => edit(employer)}>Edit</button>
                  <button type="button" className="wagez-quiet-button wagez-danger" disabled={used}
                    title={used ? "Edit existing shifts to remove this employer first" : undefined}
                    onClick={() => {
                      if (window.confirm(`Delete ${employer.name}?`)) onDelete(employer.id);
                    }}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm font-semibold">No employers yet.</p>}
      <form className="wagez-shift-card flex flex-col gap-2" onSubmit={submit}>
        <h3 className="font-extrabold">{editingId ? "Edit employer" : "Add employer"}</h3>
        <label className="wagez-field-label" htmlFor="employer-name">Employer name</label>
        <div className="wagez-field">
          <input id="employer-name" value={name} maxLength={100}
            onChange={(e) => setName(e.target.value)} required />
        </div>
        <label className="wagez-field-label" htmlFor="employer-company">Company (groups rate profiles)</label>
        <div className="wagez-field">
          <input id="employer-company" value={companyName}
            maxLength={100} list="wagez-company-names"
            placeholder={name.trim() || "Same as employer name"}
            onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <datalist id="wagez-company-names">
          {groups.map((group) => <option key={group.key} value={group.name} />)}
        </datalist>
        <p className="text-xs font-semibold">
          For several roles at one job, enter exactly the same company name
          for each rate profile. Leave blank to use the profile name.
        </p>
        <label className="wagez-field-label" htmlFor="employer-rate">Hourly rate ($)</label>
        <div className="wagez-field">
          <input id="employer-rate" value={rate} inputMode="decimal" type="text"
            onChange={(e) => setRate(e.target.value)} required />
        </div>
        {error ? <p className="wagez-alert" role="alert">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button className="wagez-do-math" type="submit">{editingId ? "Update employer" : "Add employer"}</button>
          {editingId ? <button type="button" className="wagez-quiet-button" onClick={clear}>Cancel</button> : null}
        </div>
      </form>
    </section>
  );
}
