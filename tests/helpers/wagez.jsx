/**
 * Driving Wagez the way a person does.
 *
 * Every helper here works through what is actually on screen — the segmented
 * time control, the reveal toggles, the buttons — rather than reaching into
 * component state, so a test that passes is a test a user could have performed.
 */

import { cleanup, fireEvent, screen } from "@testing-library/react";

import { resetWagezStore } from "@/lib/storage/wagezStore";

/** Unmount, and forget the device, so each test starts on a fresh Wagez. */
export function cleanupWagez() {
  cleanup();
  localStorage.clear();
  resetWagezStore();
}

/**
 * Forget what has been read from the device without clearing it — what a page
 * reload does.
 */
export function reloadWagez() {
  cleanup();
  resetWagezStore();
}

/**
 * The live input display, i.e. what the user has entered. Scoped to the display
 * list: the editor below it labels its fields with the same words.
 */
export function currentValue(label) {
  const term = [...document.querySelectorAll("dl dt")].find(
    (dt) => dt.textContent === label,
  );
  return term === undefined ? null : term.nextElementSibling.textContent;
}

/** Labels in the display appear only once their value is entered. */
export function displayedLabels() {
  return [...document.querySelectorAll("dt")].map((dt) => dt.textContent);
}

/**
 * Enter a canonical `"HH:MM"` through the segmented control, the way the
 * control is actually operated: hour, minute, then the half of the day.
 *
 * `scope` is where to look for the control. It defaults to the whole screen,
 * which is the calculator; a week card holds a time control of its own, with
 * the same field names, so editing one is scoped to that card.
 */
export function setTime(label, time, scope = screen) {
  const [hour24, minute] = time.split(":").map(Number);
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const hourInput = scope.getByLabelText(`${label} hour`);
  hourInput.focus();
  fireEvent.change(hourInput, { target: { value: String(hour) } });

  const minuteInput = scope.getByLabelText(`${label} minutes`);
  minuteInput.focus();
  fireEvent.change(minuteInput, {
    target: { value: String(minute).padStart(2, "0") },
  });

  fireEvent.click(
    scope.getByRole("button", {
      name: `${label} ${hour24 < 12 ? "AM" : "PM"}`,
    }),
  );
}

/**
 * The rate field's accessible name. Matched exactly: the control that reveals
 * the field says "pay rate" too, and only one of the two can be typed into.
 */
export const RATE_LABEL = "Pay Rate in dollars per hour";

/**
 * A reveal toggle, found by the field it controls rather than by its name: the
 * name is the whole point of the control and changes when it opens.
 */
export function revealToggle(field) {
  return document.querySelector(`[aria-controls="${field}"]`);
}

/** Open a reveal toggle if it is not already open, and hand it back. */
function reveal(field) {
  const toggle = revealToggle(field);
  if (toggle.getAttribute("aria-expanded") === "false") fireEvent.click(toggle);
  return toggle;
}

/** The pay rate is behind its own control, so reveal it before typing in it. */
export function showRate() {
  return reveal("hourly-rate");
}

export function setRate(value) {
  showRate();
  fireEvent.change(screen.getByLabelText(RATE_LABEL), { target: { value } });
}

/** The break field's accessible name, matched exactly like the rate's. */
export const BREAK_LABEL = "Break in minutes";

/** The unpaid break is behind its own word too. */
export function showBreak() {
  return reveal("break-minutes");
}

export function setBreak(value) {
  showBreak();
  fireEvent.change(screen.getByLabelText(BREAK_LABEL), { target: { value } });
}

/**
 * The toggle that keeps the rate on screen as the one Wagez opens on. It lives
 * beside the rate, so the field has to be showing before it exists.
 */
export function defaultRateToggle() {
  return document.querySelector(".wagez-default-rate");
}

/** Ask Wagez to open on the rate currently entered. */
export function keepRateAsDefault() {
  fireEvent.click(defaultRateToggle());
}

export function doMath() {
  fireEvent.click(screen.getByRole("button", { name: "Do Math." }));
}

/** Clear the calculator, the way somebody starting a second shift would. */
export function resetShift() {
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
}

/**
 * Save the answer on screen. One press: Wagez works out the day itself, so
 * there is nothing to fill in first.
 */
export function addToWeek() {
  fireEvent.click(screen.getByRole("button", { name: "+ Add to week" }));
}

/** The day Wagez saved the shift to, which is also the way to change it. */
export function savedDay() {
  return document.querySelector(".wagez-saved-day");
}

/** Open the day strip if it is not already open, and hand it back. */
export function showDayStrip() {
  const day = savedDay();
  if (day.getAttribute("aria-expanded") === "false") fireEvent.click(day);
  return document.querySelector(".wagez-day-strip");
}

/** Put the saved shift on `date` instead, through the strip's own calendar. */
export function setDay(date) {
  showDayStrip();
  fireEvent.change(screen.getByLabelText("Or pick a day"), {
    target: { value: date },
  });
}

/** Take the saved shift back out of the week. */
export function undoSave() {
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
}

export function openWeek() {
  fireEvent.click(screen.getByRole("button", { name: "Week" }));
}

export function openShift() {
  fireEvent.click(screen.getByRole("button", { name: "Shift" }));
}

export function enterShift({ start, end, rate, breakMinutes }) {
  setTime("Start", start);
  setTime("Stop", end);
  if (rate !== undefined) setRate(rate);
  if (breakMinutes !== undefined) setBreak(breakMinutes);
}
