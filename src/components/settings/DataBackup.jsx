"use client";

import { useRef, useState } from "react";
import { STORAGE_VERSION, validateStoredData } from "@/lib/storage/wagezStorage";

export default function DataBackup({ data, onRestore }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");

  function exportBackup() {
    const payload = JSON.stringify({
      version: STORAGE_VERSION,
      settings: data.settings,
      employers: data.employers,
      shifts: data.shifts,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `wagez-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function selectFile(event) {
    setError("");
    setPending(null);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Backup is too large.");
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.version !== STORAGE_VERSION ||
        !Array.isArray(parsed.shifts) || !Array.isArray(parsed.employers) ||
        !parsed.settings || typeof parsed.settings !== "object") {
        throw new Error("This is not a supported Wagez backup.");
      }
      const normalized = validateStoredData(parsed);
      if (normalized.shifts.length !== parsed.shifts.length ||
          normalized.employers.length !== parsed.employers.length) {
        throw new Error("Backup contains invalid or duplicate shifts/employers.");
      }
      setPending(normalized);
    } catch (caught) {
      setError(caught.message || "Could not read the file.");
    }
    event.target.value = "";
  }

  return (
    <section className="wagez-settings wagez-employers">
      <h2 className="text-xl font-extrabold">Backup & restore</h2>
      <p className="text-sm font-semibold">Your data lives on this device. Export a backup before reinstalling Wagez or switching phones.</p>
      <div className="flex flex-wrap gap-2">
        <button className="wagez-quiet-button wagez-shift-card" type="button" onClick={exportBackup}>Export all data (.json)</button>
        <button className="wagez-quiet-button wagez-shift-card" type="button" onClick={() => fileRef.current?.click()}>Import backup</button>
        <input ref={fileRef} className="sr-only" type="file" accept=".json,application/json" aria-label="Choose Wagez backup" onChange={selectFile} />
      </div>
      {error ? <p className="wagez-alert" role="alert">{error}</p> : null}
      {pending ? <div className="wagez-shift-card flex flex-col gap-2">
        <p className="font-semibold">Replace all current data with {pending.shifts.length} shifts and {pending.employers.length} employers? This cannot be undone without a backup.</p>
        <div className="flex gap-2">
          <button type="button" className="wagez-quiet-button" onClick={() => {
            onRestore(pending);
            setPending(null);
          }}>Replace data</button>
          <button type="button" className="wagez-quiet-button" onClick={() => setPending(null)}>Cancel</button>
        </div>
      </div> : null}
    </section>
  );
}
