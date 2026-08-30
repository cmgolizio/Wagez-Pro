// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { addDays, startOfWeek, todayIsoDate } from "@/lib/dates/isoDate";
import { STORAGE_KEY } from "@/lib/storage/wagezStorage";

import {
  addToWeek,
  cleanupWagez,
  doMath,
  enterShift,
  freezeClock,
  openOvertimeSettings,
  openWeek,
  reloadWagez,
  resetShift,
  setDay,
  toggleOvertime,
} from "../helpers/wagez";

// Which week "this week" is depends on the day it is asked on.
freezeClock();

afterEach(cleanupWagez);

const WEEK_START = startOfWeek(todayIsoDate());

/** A day inside the week Wagez opens on. */
const day = (offset) => addDays(WEEK_START, offset);

const summary = () => within(document.querySelector(".wagez-week-summary"));

const shiftCards = () => document.querySelectorAll(".wagez-shift-card");

/** One saved shift, as its own little screen. */
const card = (index) => within(shiftCards()[index]);

/** What Wagez has actually written down about overtime. */
const storedOvertime = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY)).settings.overtime;

/** Enter a shift, do the math and put it in the week on a given day. */
function saveShift({ date, start = "09:00", end = "17:00", rate = "20" }) {
  resetShift();
  enterShift({ start, end, rate });
  doMath();
  addToWeek();
  setDay(date);
}

/**
 * Four eight-hour days and a ten-hour Friday: forty-two paid hours, with the
 * fortieth falling in the middle of the Friday.
 */
function saveCrossingWeek() {
  for (let offset = 1; offset <= 4; offset += 1)
    saveShift({ date: day(offset) });
  saveShift({ date: day(5), start: "09:00", end: "19:00" });
}

/** The settings' two numbers, once they are on screen. */
const thresholdField = () =>
  screen.getByLabelText("Overtime after, in hours a week");
const multiplierField = () => screen.getByLabelText("Overtime multiplier");

describe("overtime is off until it is asked for", () => {
  it("says so, and shows no overtime anywhere in the week", () => {
    render(<WagezApp />);
    saveCrossingWeek();
    openWeek();

    expect(storedOvertime().enabled).toBe(false);
    expect(
      document.querySelector(".wagez-settings-toggle").textContent,
    ).toContain("Off");
    expect(document.querySelector(".wagez-week-split")).toBeNull();
    expect(document.querySelector(".wagez-shift-overtime")).toBeNull();

    // Forty-two hours, every one of them at $20.
    expect(summary().getByText("42 hours.")).not.toBeNull();
    expect(summary().getByText("$840.00")).not.toBeNull();
  });

  it("keeps the settings out of the way of entering a shift", () => {
    render(<WagezApp />);

    // The setting belongs to the week, where its effect is; the calculator
    // screen is the shift and nothing else.
    expect(
      document.querySelector(".wagez-stage .wagez-settings-toggle"),
    ).toBeNull();
    expect(
      document.querySelector(".wagez-week .wagez-settings-toggle"),
    ).not.toBeNull();
    // Folded away until somebody goes looking, wherever they are.
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("offers the switch, and the defaults behind it, without turning it on", () => {
    render(<WagezApp />);
    openWeek();
    openOvertimeSettings();

    const settings = screen.getByRole("switch", { name: "Calculate overtime" });
    expect(settings.getAttribute("aria-checked")).toBe("false");
    // Nothing to set until there is something to set it for.
    expect(screen.queryByLabelText("Overtime multiplier")).toBeNull();
    // Opening the settings is not changing them: nothing has been written.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    toggleOvertime();
    expect(storedOvertime()).toEqual({
      enabled: true,
      thresholdMinutes: 2400,
      multiplier: 1.5,
    });
    expect(thresholdField().value).toBe("40");
    expect(multiplierField().value).toBe("1.5");
  });
});

describe("overtime switched on", () => {
  it("splits the week's hours and pays the overtime at the multiplier", () => {
    render(<WagezApp />);
    saveCrossingWeek();
    openWeek();
    toggleOvertime();

    expect(storedOvertime().enabled).toBe(true);

    // Forty regular hours and two at time and a half.
    const split = within(document.querySelector(".wagez-week-split"));
    expect(split.getByText("Regular 40h")).not.toBeNull();
    expect(split.getByText(/Overtime 2h at 1\.5×/)).not.toBeNull();

    // $800 + 2 × $20 × 1.5.
    expect(summary().getByText("42 hours.")).not.toBeNull();
    expect(summary().getByText("$860.00")).not.toBeNull();
  });

  it("says which shift the threshold fell in, and pays that shift for it", () => {
    render(<WagezApp />);
    saveCrossingWeek();
    openWeek();
    toggleOvertime();

    // The four days before it are untouched.
    expect(card(0).getByText("$160.00")).not.toBeNull();
    expect(card(0).queryByText(/1\.5×/)).toBeNull();

    // The Friday is eight hours at $20 and two at half as much again.
    const friday = card(4);
    expect(friday.getByText("10h")).not.toBeNull();
    expect(friday.getByText(/2h at 1\.5×/)).not.toBeNull();
    expect(friday.getByText("$220.00")).not.toBeNull();
  });

  it("reads exactly as it does switched off when the week never gets there", () => {
    render(<WagezApp />);
    saveShift({ date: day(1) });
    saveShift({ date: day(2) });
    openWeek();
    toggleOvertime();

    expect(document.querySelector(".wagez-week-split")).toBeNull();
    expect(document.querySelector(".wagez-shift-overtime")).toBeNull();
    expect(summary().getByText("$320.00")).not.toBeNull();
  });

  it("switches back off again, and the week goes back to what it was", () => {
    render(<WagezApp />);
    saveCrossingWeek();
    openWeek();
    toggleOvertime();
    toggleOvertime();

    expect(storedOvertime().enabled).toBe(false);
    expect(document.querySelector(".wagez-week-split")).toBeNull();
    expect(summary().getByText("$840.00")).not.toBeNull();
  });
});

describe("the threshold and the multiplier", () => {
  it("are the user's own, and the week follows them", () => {
    render(<WagezApp />);
    saveCrossingWeek();
    openWeek();
    toggleOvertime();

    fireEvent.change(thresholdField(), { target: { value: "35" } });
    fireEvent.change(multiplierField(), { target: { value: "2" } });

    expect(storedOvertime()).toEqual({
      enabled: true,
      thresholdMinutes: 2100,
      multiplier: 2,
    });

    // Thirty-five regular hours at $20, then seven at double.
    const split = within(document.querySelector(".wagez-week-split"));
    expect(split.getByText("Regular 35h")).not.toBeNull();
    expect(split.getByText(/Overtime 7h at 2×/)).not.toBeNull();
    expect(summary().getByText("$980.00")).not.toBeNull();
  });

  it("say so rather than saving a number Wagez cannot use", () => {
    render(<WagezApp />);
    openWeek();
    toggleOvertime();

    fireEvent.change(thresholdField(), { target: { value: "0" } });

    expect(screen.getByRole("alert").textContent).toContain("1 to 168");
    // The threshold in force is still the one that was there.
    expect(storedOvertime().thresholdMinutes).toBe(2400);
  });

  it("put the working number back when the user moves on", () => {
    render(<WagezApp />);
    openWeek();
    toggleOvertime();

    fireEvent.change(multiplierField(), { target: { value: "" } });
    expect(screen.getByRole("alert")).not.toBeNull();

    fireEvent.blur(multiplierField());
    expect(multiplierField().value).toBe("1.5");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("survive a reload, as the week they produce does", () => {
    render(<WagezApp />);
    saveCrossingWeek();
    openWeek();
    toggleOvertime();
    fireEvent.change(multiplierField(), { target: { value: "2" } });

    reloadWagez();
    render(<WagezApp />);
    openWeek();

    expect(summary().getByText("$880.00")).not.toBeNull();
    openOvertimeSettings();
    expect(multiplierField().value).toBe("2");
    expect(thresholdField().value).toBe("40");
  });
});

describe("what Wagez says it is doing", () => {
  it("names the calculation as the user's own settings, and claims nothing", () => {
    render(<WagezApp />);
    openWeek();
    openOvertimeSettings();

    const note = document.querySelector(".wagez-settings-note").textContent;
    expect(note).toContain("you set");
    expect(note).toContain("doesn’t decide who is owed overtime");
    expect(note).not.toMatch(/legal|required|entitled|law/i);
  });
});
