/**
 * Conservative ADP "Time - MyADP" print-to-PDF parser.
 *
 * Receives already extracted text rows (no network calls, OCR, or employee IDs).
 * Only rows beginning with a real calendar date and containing a complete
 * clock-in / clock-out pair become shifts. Summaries are never shifts.
 */
const DATE_ROW = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
const PAIR = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–—]\s*(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi;

function dateToIso(monthText, dayText, yearText) {
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return null;
  return `${yearText}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function to24(hourText, minuteText, ampm) {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const hour24 = (hour % 12) + (ampm.toUpperCase() === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function elapsedMinutes(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return end > start ? end - start : end + 1440 - start;
}

export function shiftTimeKey(shift) {
  return `${shift.date}|${shift.startTime}|${shift.endTime}`;
}

export function parseAdpTimecardRows(lines = []) {
  const shifts = [];
  const warnings = [];
  const found = new Set();
  let reportedTotalHours = null;
  let ambiguousRows = 0;

  for (const raw of lines) {
    const line = String(raw).replace(/\u00a0/g, " ").trim();
    if (reportedTotalHours === null) {
      const total = line.match(/\b(\d+(?:\.\d+)?)\s+Total Hours\b/i);
      if (total) reportedTotalHours = Number(total[1]);
    }

    const dateParts = line.match(DATE_ROW);
    if (!dateParts) continue;
    const date = dateToIso(dateParts[1], dateParts[2], dateParts[3]);
    if (!date) {
      warnings.push("An invalid date appeared in the timecard and was skipped.");
      continue;
    }
    const afterDate = line.slice(dateParts[0].length).trim();
    if (!afterDate) continue; // a day with no recorded punches

    PAIR.lastIndex = 0;
    let match;
    let matchedCount = 0;
    while ((match = PAIR.exec(afterDate)) !== null) {
      matchedCount += 1;
      const startTime = to24(match[1], match[2], match[3]);
      const endTime = to24(match[4], match[5], match[6]);
      if (!startTime || !endTime || startTime === endTime) {
        warnings.push(`Invalid punch pair on ${date}; skipped.`);
        continue;
      }
      const shift = { date, startTime, endTime };
      const key = shiftTimeKey(shift);
      if (!found.has(key)) {
        found.add(key);
        shifts.push(shift);
      }
    }
    if (!matchedCount && /\b\d{1,2}:\d{2}\b/.test(afterDate)) {
      ambiguousRows += 1;
    }
  }

  if (ambiguousRows) {
    warnings.push(`${ambiguousRows} dated row(s) contained times Wagez could not safely interpret. Review the PDF before importing.`);
  }
  if (reportedTotalHours !== null && shifts.length) {
    const extractedHours = shifts.reduce(
      (total, shift) => total + elapsedMinutes(shift.startTime, shift.endTime),
      0,
    ) / 60;
    if (Math.abs(extractedHours - reportedTotalHours) > 0.02) {
      warnings.push(
        `ADP reports ${reportedTotalHours.toFixed(2)} paid hours, but punch spans total ${extractedHours.toFixed(2)} hours. Breaks or adjustments may be missing; review before importing.`,
      );
    }
  }

  shifts.sort((a, b) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
  return { shifts, reportedTotalHours, warnings };
}

/**
 * Browser-only PDF extraction. Keeps the original timecard on-device.
 * Uses PDF.js text coordinates so columns are assembled into rows in order.
 */
export async function readAdpPdf(file) {
  if (!file || (!file.name?.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf")) {
    throw new Error("Choose a PDF timecard.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Choose a PDF smaller than 10 MB.");
  }

  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const lines = [];
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 20) throw new Error("Import up to 20 PDF pages at a time.");
    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      const rows = [];
      for (const item of content.items) {
        if (!item.str || !item.transform) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        let row = rows.find((entry) => Math.abs(entry.y - y) < 2.5);
        if (!row) {
          row = { y, parts: [] };
          rows.push(row);
        }
        row.parts.push({ x, text: item.str });
      }
      rows.sort((a, b) => b.y - a.y);
      for (const row of rows) {
        const text = row.parts
          .sort((a, b) => a.x - b.x)
          .map((part) => part.text.trim())
          .filter(Boolean)
          .join(" ");
        if (text) lines.push(text);
      }
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }

  const result = parseAdpTimecardRows(lines);
  if (result.shifts.length === 0) {
    throw new Error(
      "No complete dated clock-in/out pairs found. Only ADP's text-based 'Time - MyADP' print layout is supported; scanned PDFs and other layouts require review.",
    );
  }
  return result;
}
