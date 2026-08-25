// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { addDays, startOfWeek, todayIsoDate } from "@/lib/dates/isoDate";
import { formatShiftDay, formatWeekRange } from "@/lib/formatters/date";

import {
  addToWeek,
  cleanupWagez,
  doMath,
  enterShift,
  openWeek,
  reloadWagez,
  setDay,
} from "../helpers/wagez";

afterEach(cleanupWagez);

const WEEK_START = startOfWeek(todayIsoDate());

/** A date inside the week Wagez opens on. */
const day = (offset) => addDays(WEEK_START, offset);

/** Everything inside the week view, so the calculator's copy is out of scope. */
const week = () => within(document.querySelector(".wagez-week"));

/** The week's own totals, which read the same words as the shifts under them. */
const summary = () => within(document.querySelector(".wagez-week-summary"));

/** The saved shifts themselves. */
const shiftCards = () => document.querySelectorAll(".wagez-shift-card");

/** Enter a shift, do the math, and put it in the week. */
function saveShift({ date, start, end, rate }) {
  setDay(date);
  enterShift({ start, end, rate });
  doMath();
  addToWeek();
}

describe("adding a shift to the week", () => {
  it("asks for the day, then saves once it has one", () => {
    render(<WagezApp />);
    enterShift({ start: "16:00", end: "23:30", rate: "20" });
    doMath();

    // Nothing is saved by calculating, and nothing is saved undated.
    addToWeek();
    expect(screen.getByLabelText("Day").value).toBe(todayIsoDate());
    expect(
      screen.getByText("Which day was this? Then add it to your week."),
    ).not.toBeNull();

    addToWeek();
    expect(
      screen.getByText(`Added to ${formatShiftDay(todayIsoDate())}.`),
    ).not.toBeNull();

    openWeek();
    expect(shiftCards()).toHaveLength(1);
    expect(week().getByText("4:00 PM → 11:30 PM")).not.toBeNull();
    expect(week().getByText("7h 30m")).not.toBeNull();
    expect(summary().getByText("$150.00")).not.toBeNull();
  });

  it("saves straight away when the shift already has a day", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });

    expect(
      screen.getByText(`Added to ${formatShiftDay(day(1))}.`),
    ).not.toBeNull();

    openWeek();
    expect(week().getByText(formatShiftDay(day(1)))).not.toBeNull();
  });

  it("offers no way to save an answer that no longer matches the shift", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(
      screen.getByRole("button", { name: "+ Add to week" }),
    ).not.toBeNull();

    // The answer on screen is now about a shift the user has moved on from.
    fireEvent.change(screen.getByLabelText("Stop minutes"), {
      target: { value: "30" },
    });

    expect(screen.queryByRole("button", { name: "+ Add to week" })).toBeNull();

    doMath();
    expect(
      screen.getByRole("button", { name: "+ Add to week" }),
    ).not.toBeNull();
  });

  it("does not save the same shift twice on a second press", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });

    // The button is gone, replaced by what happened to it.
    expect(screen.queryByRole("button", { name: "+ Add to week" })).toBeNull();

    openWeek();
    expect(shiftCards()).toHaveLength(1);
    expect(summary().getByText("1 shift")).not.toBeNull();
    expect(summary().getByText("$160.00")).not.toBeNull();
  });

  it("saves a shift with no rate as hours alone", () => {
    render(<WagezApp />);
    saveShift({ date: day(2), start: "09:00", end: "17:00" });

    openWeek();
    expect(week().getByText("8h")).not.toBeNull();
    expect(week().queryByText(/\$/)).toBeNull();
  });
});

describe("the week itself", () => {
  it("reads chronologically, whatever order shifts were saved in", () => {
    render(<WagezApp />);
    saveShift({ date: day(3), start: "17:00", end: "22:45", rate: "20" });
    saveShift({ date: day(1), start: "16:00", end: "23:30", rate: "20" });
    saveShift({ date: day(1), start: "08:00", end: "11:00", rate: "20" });

    openWeek();
    const days = [...document.querySelectorAll(".wagez-shift-times")].map(
      (el) => el.textContent,
    );

    expect(days).toEqual([
      "8:00 AM → 11:00 AM",
      "4:00 PM → 11:30 PM",
      "5:00 PM → 10:45 PM",
    ]);
  });

  it("totals the week's time and money", () => {
    render(<WagezApp />);
    // 7h30m at $20, then 8h at $30.
    saveShift({ date: day(1), start: "16:00", end: "23:30", rate: "20" });
    saveShift({ date: day(2), start: "09:00", end: "17:00", rate: "30" });

    openWeek();
    expect(summary().getByText("2 shifts")).not.toBeNull();
    expect(summary().getByText("15 hours + 30 min.")).not.toBeNull();
    expect(summary().getByText("$390.00")).not.toBeNull();
  });

  it("counts an overnight shift as the hours it actually covered", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "22:00", end: "03:00", rate: "18" });

    openWeek();
    expect(summary().getByText("1 shift")).not.toBeNull();
    expect(summary().getByText("5 hours.")).not.toBeNull();
    expect(summary().getByText("$90.00")).not.toBeNull();
    expect(week().getByText("+1 day")).not.toBeNull();
  });

  it("leaves out the shifts that belong to other weeks", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    saveShift({ date: day(-3), start: "09:00", end: "12:00", rate: "20" });

    openWeek();
    expect(shiftCards()).toHaveLength(1);
    expect(summary().getByText("1 shift")).not.toBeNull();
    expect(summary().getByText("8 hours.")).not.toBeNull();

    // Last week is one press away, and has the other shift in it.
    fireEvent.click(week().getByRole("button", { name: "Previous week" }));
    expect(
      week().getByText(formatWeekRange(addDays(WEEK_START, -7))),
    ).not.toBeNull();
    expect(summary().getByText("3 hours.")).not.toBeNull();
    expect(summary().getByText("$60.00")).not.toBeNull();
  });

  it("says so when there is nothing in the week yet", () => {
    render(<WagezApp />);
    openWeek();

    expect(summary().getByText("0 shifts")).not.toBeNull();
    expect(week().getByText(/Nothing saved this week yet/)).not.toBeNull();
  });

  it("points at the last week that does have shifts", () => {
    render(<WagezApp />);
    saveShift({ date: day(-8), start: "09:00", end: "17:00", rate: "20" });

    openWeek();
    const elsewhere = week().getByRole("button", {
      name: `Go to ${formatWeekRange(addDays(WEEK_START, -14))}`,
    });

    fireEvent.click(elsewhere);
    expect(summary().getByText("8 hours.")).not.toBeNull();
  });
});

describe("what the device remembers", () => {
  it("still has the week after a reload", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "16:00", end: "23:30", rate: "20" });

    // Everything the browser held in memory is gone; only storage remains.
    reloadWagez();
    render(<WagezApp />);

    openWeek();
    expect(week().getByText(formatShiftDay(day(1)))).not.toBeNull();
    expect(week().getByText("7h 30m")).not.toBeNull();
    expect(summary().getByText("$150.00")).not.toBeNull();
  });

  it("keeps every saved shift, not just the last one", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    saveShift({ date: day(2), start: "09:00", end: "12:00", rate: "20" });

    reloadWagez();
    render(<WagezApp />);

    openWeek();
    expect(shiftCards()).toHaveLength(2);
    expect(summary().getByText("2 shifts")).not.toBeNull();
    expect(summary().getByText("11 hours.")).not.toBeNull();
  });

  it("starts clean rather than breaking on data it cannot read", () => {
    localStorage.setItem("wagez:v2", "{ not json at all");

    render(<WagezApp />);
    openWeek();

    expect(summary().getByText("0 shifts")).not.toBeNull();
  });
});
