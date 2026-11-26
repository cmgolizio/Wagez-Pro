/**
 * Parse the ADP Mobile "Timecard" screenshot card layout.
 *
 * This is deliberately conservative. Only dated "Worked" entries with two
 * complete punches become proposed shifts. Holiday/PTO rows, missing punches,
 * invalid dates and weekday mismatches must not silently become hours worked.
 * OCR text is untrusted and always requires human review before saving.
 */
import { dayOfWeek, isIsoDate } from "@/lib/dates/isoDate";
import { elapsedMinutes, shiftTimeKey } from "@/lib/adp/timecard";

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const WEEKDAYS = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};
const HEADER = /\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*,?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:\s*,?\s*(20\d{2}))?\b/gi;
const CLOCK = /(\d{1,2})\s*[:.]\s*(\d{2})\s*([ap])\.?\s*m\.?/gi;
const NON_WORKED = /\b(?:HOLIDAY|VACATION|PTO|SICK|LEAVE|TIME\s+OFF)\b/i;

function to24(hourText, minuteText, ampm) {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const h = hour % 12 + (ampm.toLowerCase() === "p" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseAdpScreenshotText(text, year) {
  if (!Number.isInteger(year) || year < 2000 || year > 2099) {
    return { shifts: [], paidTime: [], warnings: ["Choose a valid screenshot year."] };
  }
  const source = String(text ?? "")
    .replace(/\r/g, "\n")
    .replace(/[–—−]/g, "-")
    .replace(/\u00a0/g, " ");
  const headers = [...source.matchAll(HEADER)];
  const shifts = [];
  const paidTime = [];
  const warnings = [];
  const seen = new Set();
  if (!headers.length) {
    return { shifts: [], paidTime: [], warnings: ["No recognizable day cards found. Try an uncropped ADP Timecard screenshot."] };
  }

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const body = source.slice(
      header.index + header[0].length,
      i + 1 < headers.length ? headers[i + 1].index : source.length,
    );
    const weekday = header[1].toLowerCase();
    const month = MONTHS[header[2].slice(0, 3).toLowerCase()];
    const cardYear = header[4] ? Number(header[4]) : year;
    const date = `${cardYear}-${String(month).padStart(2, "0")}-${String(Number(header[3])).padStart(2, "0")}`;
    if (!isIsoDate(date) || dayOfWeek(date) !== WEEKDAYS[weekday]) {
      warnings.push(`${header[0]}: date and weekday disagree, or date is invalid. Verify the year; skipped.`);
      continue;
    }

    if (NON_WORKED.test(body) && !/\bWorked\b/i.test(body)) {
      if (/\bHOLIDAY\b/i.test(body)) {
        const holidayLine = body.slice(body.search(/\bHOLIDAY\b/i));
        // Prefer the explicitly labeled holiday hours on that line over the
        // day total. 08:00 am is a display time, not a punch.
        const matched = holidayLine.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*Hours\b/i);
        const hours = matched ? Number(matched[1].replace(",", ".")) : NaN;
        const minutes = Math.round(hours * 60);
        if (Number.isFinite(hours) && minutes > 0 && minutes <= 1440) {
          paidTime.push({ type: "holiday", date, minutes });
        } else {
          warnings.push(`${date}: HOLIDAY entry has no reliable paid hours. Review manually.`);
        }
      } else {
        warnings.push(`${date}: paid non-worked time could not be imported (only HOLIDAY is supported).`);
      }
      continue;
    }
    // The screenshot shows empty days with 0 Hours; those are not shifts.
    if (!/\bWorked\b/i.test(body)) {
      if (/\b\d{1,2}(?:\.\d+)?\s*Hours\b/i.test(body) && !/\b0+(?:\.0+)?\s*Hours\b/i.test(body)) {
        warnings.push(`${date}: hours shown but no complete Worked punch; skipped.`);
      }
      continue;
    }
    const worked = body.slice(body.search(/\bWorked\b/i));
    const timeSection = worked.split(/\b(?:HOLIDAY|PTO|VACATION|SICK|LEAVE)\b/i)[0];
    const times = [...timeSection.matchAll(CLOCK)].slice(0, 2);
    if (times.length !== 2 || !/[-]/.test(timeSection.slice(times[0]?.index ?? 0))) {
      warnings.push(`${date}: incomplete or unreadable Worked punches; skipped.`);
      continue;
    }
    const startTime = to24(times[0][1], times[0][2], times[0][3]);
    const endTime = to24(times[1][1], times[1][2], times[1][3]);
    if (!startTime || !endTime || startTime === endTime) {
      warnings.push(`${date}: invalid punch time; skipped.`);
      continue;
    }
    const shift = { date, startTime, endTime };
    const key = shiftTimeKey(shift);
    if (!seen.has(key)) { seen.add(key); shifts.push(shift); }

    // Header's displayed decimal hours are informational; they may include
    // rounding or adjustments. Never use them to invent a break.
    const hoursMatch = body.match(/\b(\d{1,2}[.,]\d{2})\s*Hours\b/i);
    if (hoursMatch) {
      const shownHours = Number(hoursMatch[1].replace(",", "."));
      const punchHours = elapsedMinutes(startTime, endTime) / 60;
      if (Math.abs(shownHours - punchHours) > 0.04) {
        warnings.push(`${date}: ADP displays ${shownHours.toFixed(2)} hours but punches span ${punchHours.toFixed(2)} hours. Review for breaks or adjustments.`);
      }
    }
  }
  shifts.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return { shifts, paidTime, warnings };
}

/**
 * Load a pinned OCR runtime into the browser. The image remains local. OCR
 * worker/wasm/English trained data are fetched over the network on first use.
 */
let runtimePromise;
async function ocrRuntime() {
  if (typeof window === "undefined") throw new Error("Screenshot OCR requires a browser.");
  if (window.Tesseract?.createWorker) return window.Tesseract;
  if (!runtimePromise) {
    runtimePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js";
      script.crossOrigin = "anonymous";
      script.onload = () => window.Tesseract?.createWorker
        ? resolve(window.Tesseract)
        : reject(new Error("The OCR library did not load."));
      script.onerror = () => reject(new Error("Could not load OCR. Check your internet connection."));
      document.head.appendChild(script);
    }).catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

export async function readAdpScreenshots(files, year) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 10) {
    throw new Error("Choose between 1 and 10 screenshot images.");
  }
  for (const file of files) {
    if (!file?.type?.startsWith("image/") ||
        !/^(image\/(png|jpeg|webp|heic|heif))$/i.test(file.type) ||
        file.size > 12 * 1024 * 1024) {
      throw new Error("Select PNG, JPEG, WebP or HEIC images under 12 MB each.");
    }
  }
  const Tesseract = await ocrRuntime();
  const worker = await Tesseract.createWorker("eng");
  const shifts = [];
  const paidTime = [];
  const warnings = [];
  const seen = new Set();
  const seenPaid = new Set();
  try {
    for (const file of files) {
      const result = await worker.recognize(file);
      const parsed = parseAdpScreenshotText(result.data.text, year);
      warnings.push(...parsed.warnings.map((warning) => `${file.name}: ${warning}`));
      for (const entry of parsed.paidTime) {
        const key = `${entry.type}|${entry.date}`;
        if (!seenPaid.has(key)) { seenPaid.add(key); paidTime.push(entry); }
      }
      for (const shift of parsed.shifts) {
        const key = shiftTimeKey(shift);
        if (!seen.has(key)) { seen.add(key); shifts.push(shift); }
      }
    }
  } finally {
    await worker.terminate();
  }
  if (shifts.length === 0 && paidTime.length === 0) {
    throw new Error(
      "No complete Worked punches or HOLIDAY hours were found. Check the screenshot year and image quality.",
    );
  }
  shifts.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return { shifts, paidTime, warnings };
}
