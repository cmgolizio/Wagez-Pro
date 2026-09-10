// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import {
  MONDAY,
  addDays,
  startOfWeek,
  todayIsoDate,
} from "@/lib/dates/isoDate";
import { formatWeekRange } from "@/lib/formatters/date";
import { STORAGE_KEY } from "@/lib/storage/wagezStorage";

import {
  addToWeek,
  cleanupWagez,
  doMath,
  enterShift,
  freezeClock,
  keepRateAsDefault,
  openWeek,
  reloadWagez,
  resetShift,
  setDay,
  toggleOvertime,
} from "../helpers/wagez";

freezeClock();

afterEach(cleanupWagez);

/** Everything inside the week view, so the calculator's copy is out of scope. */
const week = () => within(document.querySelector(".wagez-week"));

/** The week's own totals. */
const summary = () => within(document.querySelector(".wagez-week-summary"));

const shiftCards = () => document.querySelectorAll(".wagez-shift-card");

/** Enter a shift, do the math, save it, and put it on `date`. */
function saveShift({ date, start, end, rate }) {
  resetShift();
  enterShift({ start, end, rate });
  doMath();
  addToWeek();
  if (date !== undefined) setDay(date);
}

/** The Sunday and the Monday buttons of the week-start setting. */
const weekStartButton = (name) =>
  within(document.querySelector(".wagez-setting-choice")).getByRole("button", {
    name,
  });

describe("which day a week starts on", () => {
  it("starts on Sunday, and says so", () => {
    render(<WagezApp />);
    openWeek();

    expect(weekStartButton("Sunday").getAttribute("aria-pressed")).toBe("true");
    expect(weekStartButton("Monday").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("redraws the week around Monday when Monday is chosen", () => {
    render(<WagezApp />);
    const sundayWeek = startOfWeek(todayIsoDate());

    // One shift on the Sunday the week currently begins on, and one midweek.
    saveShift({ date: sundayWeek, start: "09:00", end: "17:00", rate: "20" });
    saveShift({ date: addDays(sundayWeek, 3), start: "09:00", end: "17:00" });

    openWeek();
    expect(shiftCards()).toHaveLength(2);

    fireEvent.click(weekStartButton("Monday"));

    // The Sunday now belongs to the week before, so it is no longer here.
    expect(shiftCards()).toHaveLength(1);
    expect(summary().getByText("1 shift")).toBeTruthy();
    expect(
      week().getByText(formatWeekRange(addDays(sundayWeek, 1))),
    ).toBeTruthy();
  });

  it("keeps the choice after a reload", () => {
    render(<WagezApp />);
    openWeek();
    fireEvent.click(weekStartButton("Monday"));

    reloadWagez();
    render(<WagezApp />);
    openWeek();

    expect(weekStartButton("Monday").getAttribute("aria-pressed")).toBe("true");
  });

  it("realigns a week the user had gone to", () => {
    render(<WagezApp />);
    const sundayWeek = startOfWeek(todayIsoDate());
    saveShift({ date: sundayWeek, start: "09:00", end: "17:00" });

    openWeek();
    // Away from "this week", so the view is pinned to a week of its own.
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    fireEvent.click(weekStartButton("Monday"));

    // Still the week before, but drawn on the new boundary rather than
    // straddling two of them.
    // The Monday week holding most of the days that were on screen.
    expect(
      week().getByText(
        formatWeekRange(startOfWeek(addDays(sundayWeek, -4), MONDAY)),
      ),
    ).toBeTruthy();
  });

  it("keeps the shifts in view when the boundary moves under them", () => {
    render(<WagezApp />);
    const sundayWeek = startOfWeek(todayIsoDate());
    // Midweek, so it belongs to this week whichever day the week starts on.
    saveShift({ date: addDays(sundayWeek, 3), start: "09:00", end: "17:00" });

    openWeek();
    // Pinned to a week of its own rather than following "this week".
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    fireEvent.click(weekStartButton("Monday"));

    expect(shiftCards()).toHaveLength(1);
  });

  it("moves no shift off the day it was worked", () => {
    render(<WagezApp />);
    const sundayWeek = startOfWeek(todayIsoDate());
    saveShift({ date: sundayWeek, start: "09:00", end: "17:00" });

    openWeek();
    fireEvent.click(weekStartButton("Monday"));
    // Gone from this week, but not gone: the week before is one press back.
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));

    expect(shiftCards()).toHaveLength(1);
  });
});

describe("clearing everything Wagez has saved", () => {
  /** Press the words that offer it, and hand back the question that follows. */
  function askToClear() {
    fireEvent.click(screen.getByRole("button", { name: "Clear Wagez data" }));
    return screen.getByText("Delete every saved shift and setting?");
  }

  it("asks before it does anything", () => {
    render(<WagezApp />);
    saveShift({ start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    expect(askToClear()).toBeTruthy();
    expect(shiftCards()).toHaveLength(1);
  });

  it("puts the keyboard on the way out, not on the deletion", () => {
    render(<WagezApp />);
    openWeek();
    askToClear();

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancel" }),
    );
  });

  it("puts the keyboard back on the words that offered it", () => {
    render(<WagezApp />);
    openWeek();
    askToClear();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Clear Wagez data" }),
    );
  });

  it("changes nothing when the question is declined", () => {
    render(<WagezApp />);
    saveShift({ start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    askToClear();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(shiftCards()).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("takes the saved shifts, the settings and the key itself", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    keepRateAsDefault();
    doMath();
    addToWeek();

    openWeek();
    toggleOvertime();

    askToClear();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(shiftCards()).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // The settings are back to a Wagez nobody has configured.
    expect(document.querySelector(".wagez-settings-state").textContent).toBe(
      "Off",
    );
    expect(weekStartButton("Sunday").getAttribute("aria-pressed")).toBe("true");
  });

  it("stays cleared after a reload", () => {
    render(<WagezApp />);
    saveShift({ start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    askToClear();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    reloadWagez();
    render(<WagezApp />);
    openWeek();

    expect(shiftCards()).toHaveLength(0);
  });
});
