/**
 * Parse the ADP Mobile "Timecard" screenshot card layout.
 *
 * This is deliberately conservative. Worked entries with punches become proposed shifts. Any other recorded
 * category with credited hours is preserved by label; OCR gaps are flagged.
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

    // Every ADP row with an actual entry is eligible, not just a whitelist
    // of absence codes. Keep its label as a normalized category.
    // An empty day consists only of "0 Hours" and has no entry.
    const detail = body.match(/(?:^|\n)\s*([A-Za-z][A-Za-z /_-]{1,38}?)\s+(?:\d{1,2}[:.]\d{2}\s*[ap]m|\d{1,2}[:.]\d{2}\s*Hours)/i);
    const workedLabel = /\bWorked\b/i.test(body);
    const headerHours = body.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*Hours\b/i);
    const credit = headerHours ? Number(headerHours[1].replace(",", ".")) : NaN;
    const label = detail?.[1]?.trim().replace(/\s+/g, " ") ?? "";
    const category = (label || "Unclassified Credit").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!workedLabel) {
      if (!detail && (!Number.isFinite(credit) || credit === 0)) continue;
      const detailsAfter = detail ? body.slice((detail.index ?? 0) + detail[0].length) : body;
      const explicitHours = detailsAfter.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*Hours\b/i);
      const hours = explicitHours ? Number(explicitHours[1].replace(",", ".")) : credit;
      const minutes = Math.round(hours * 60);
      if (!category || !Number.isFinite(hours) || minutes < 0 || minutes > 1440) {
        warnings.push(`${date}: recorded entry could not be fully read; check the screenshot and re-enter manually.`);
        continue;
      }
      paidTime.push({ type: category, date, minutes });
      if (!detail) warnings.push(`${date}: credited hours detected but the ADP category was unreadable; labeled Unclassified Credit for review.`);
      continue;
    }
    const worked = body.slice(body.search(/\bWorked\b/i));
    const timeSection = worked.split(/\b(?:HOLIDAY|PTO|VACATION|SICK|LEAVE)\b/i)[0];
    const times = [...timeSection.matchAll(CLOCK)].slice(0, 2);
    if (times.length !== 2 || !/[-]/.test(timeSection.slice(times[0]?.index ?? 0))) {
      if (Number.isFinite(credit) && credit >= 0) {
        paidTime.push({ type: "worked-credit", date, minutes: Math.round(credit * 60) });
        warnings.push(`${date}: Worked entry had unreadable punches; credited hours saved for review instead.`);
      } else warnings.push(`${date}: Worked entry unreadable; review screenshot and add manually.`);
      continue;
    }
    const startTime = to24(times[0][1], times[0][2], times[0][3]);
    const endTime = to24(times[1][1], times[1][2], times[1][3]);
    if (!startTime || !endTime || startTime === endTime) {
      if (Number.isFinite(credit) && credit >= 0) {
        paidTime.push({ type: "worked-credit", date, minutes: Math.round(credit * 60) });
        warnings.push(`${date}: Worked punches invalid; credited hours saved for review instead.`);
      } else warnings.push(`${date}: invalid punch time; check manually.`);
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
      "No recorded entries were recognized. Verify screenshot year and image quality.",
    );
  }
  shifts.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return { shifts, paidTime, warnings };
}
