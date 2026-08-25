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
 */
export function setTime(label, time) {
  const [hour24, minute] = time.split(":").map(Number);
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const hourInput = screen.getByLabelText(`${label} hour`);
  hourInput.focus();
  fireEvent.change(hourInput, { target: { value: String(hour) } });

  const minuteInput = screen.getByLabelText(`${label} minutes`);
  minuteInput.focus();
  fireEvent.change(minuteInput, {
    target: { value: String(minute).padStart(2, "0") },
  });

  fireEvent.click(
    screen.getByRole("button", {
      name: `${label} ${hour24 < 12 ? "AM" : "PM"}`,
    }),
  );
}

/** The pay rate is behind its own control, so reveal it before typing in it. */
export function showRate() {
  const toggle = screen.getByRole("button", { name: "$/hour" });
  if (toggle.getAttribute("aria-expanded") === "false") fireEvent.click(toggle);
  return toggle;
}

export function setRate(value) {
  showRate();
  fireEvent.change(screen.getByLabelText(/pay rate/i), { target: { value } });
}

/** The day is behind its own control too, and opens on today. */
export function showDay() {
  const toggle = screen.getByRole("button", { name: "Add day" });
  if (toggle.getAttribute("aria-expanded") === "false") fireEvent.click(toggle);
  return toggle;
}

export function setDay(date) {
  showDay();
  fireEvent.change(screen.getByLabelText("Day"), { target: { value: date } });
}

export function doMath() {
  fireEvent.click(screen.getByRole("button", { name: "Do Math." }));
}

export function addToWeek() {
  fireEvent.click(screen.getByRole("button", { name: "+ Add to week" }));
}

export function openWeek() {
  fireEvent.click(screen.getByRole("button", { name: "Week" }));
}

export function openShift() {
  fireEvent.click(screen.getByRole("button", { name: "Shift" }));
}

export function enterShift({ start, end, rate }) {
  setTime("Start", start);
  setTime("Stop", end);
  if (rate !== undefined) setRate(rate);
}
