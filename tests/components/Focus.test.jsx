// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { addDays, startOfWeek, todayIsoDate } from "@/lib/dates/isoDate";
import { formatShiftDay } from "@/lib/formatters/date";

import {
  addToWeek,
  cleanupWagez,
  doMath,
  enterShift,
  freezeClock,
  openWeek,
  resetShift,
  savedDay,
  setDay,
  showDayStrip,
  undoSave,
} from "../helpers/wagez";

/**
 * Wagez replaces controls in place, and every one of those replacements is a
 * chance to drop the keyboard on the floor. These are the presses that take
 * away the very control that was pressed.
 */

freezeClock();

afterEach(cleanupWagez);

const WEEK_START = startOfWeek(todayIsoDate());
const day = (offset) => addDays(WEEK_START, offset);

const shiftCards = () => document.querySelectorAll(".wagez-shift-card");
const card = (index = 0) => within(shiftCards()[index]);
const form = () => within(document.querySelector(".wagez-shift-form"));

/** Press a button the way a keyboard does: on the control that has focus. */
function press(button) {
  button.focus();
  fireEvent.click(button);
}

function pressAction(index, action) {
  press(card(index).getByRole("button", { name: new RegExp(`^${action}`) }));
}

function saveShift({ date, start, end, rate }) {
  resetShift();
  enterShift({ start, end, rate });
  doMath();
  addToWeek();
  if (date !== undefined) setDay(date);
}

describe("the keyboard, when the control it was on goes away", () => {
  it("lands on the day a shift was saved to, and back on the way to save it", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    press(screen.getByRole("button", { name: "+ Add to week" }));
    expect(document.activeElement).toBe(savedDay());

    press(screen.getByRole("button", { name: "Undo" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "+ Add to week" }),
    );
  });

  it("comes back from the day strip to the day it was opened from", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();

    const strip = within(showDayStrip());
    press(strip.getByRole("button", { name: formatShiftDay(day(2)) }));

    expect(savedDay().textContent).toBe(formatShiftDay(day(2)));
    expect(document.activeElement).toBe(savedDay());
  });

  it("follows a shift edited into another week", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    fireEvent.change(form().getByLabelText("Day"), {
      target: { value: day(-6) },
    });
    press(form().getByRole("button", { name: "Save" }));

    // The week has moved with the shift, and so has the keyboard.
    expect(shiftCards()).toHaveLength(1);
    expect(document.activeElement).toBe(
      card().getByRole("button", { name: /^Edit/ }),
    );
  });

  it("follows a copy made into another week", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Duplicate");
    fireEvent.change(form().getByLabelText("Day"), {
      target: { value: day(-6) },
    });
    press(form().getByRole("button", { name: "Save" }));

    expect(shiftCards()).toHaveLength(1);
    expect(document.activeElement).toBe(
      card().getByRole("button", {
        name: new RegExp(`^Edit ${formatShiftDay(day(-6))}`),
      }),
    );
  });

  it("moves down to the next shift when one is deleted", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "12:00", rate: "20" });
    saveShift({ date: day(2), start: "13:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Delete");
    press(card().getByRole("button", { name: "Delete" }));

    expect(shiftCards()).toHaveLength(1);
    expect(document.activeElement).toBe(
      card().getByRole("button", {
        name: new RegExp(`^Edit ${formatShiftDay(day(2))}`),
      }),
    );
  });

  it("falls back to the week itself when the last shift is deleted", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Delete");
    press(card().getByRole("button", { name: "Delete" }));

    expect(shiftCards()).toHaveLength(0);
    expect(document.activeElement).toBe(
      document.querySelector(".wagez-week h2"),
    );
  });

  it("stays where the card put it when an edit is cancelled", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    press(form().getByRole("button", { name: "Cancel" }));

    expect(document.activeElement).toBe(
      card().getByRole("button", { name: /^Edit/ }),
    );
  });

  it("lands on the first thing wrong with a saved shift that will not save", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    fireEvent.change(form().getByLabelText("Day"), { target: { value: "" } });
    press(form().getByRole("button", { name: "Save" }));

    expect(document.activeElement).toBe(form().getByLabelText("Day"));
  });
});
