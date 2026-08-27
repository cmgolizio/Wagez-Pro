// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WagezApp from "@/components/WagezApp";
import { addDays, startOfWeek, todayIsoDate } from "@/lib/dates/isoDate";
import { formatShiftDay, formatWeekRange } from "@/lib/formatters/date";

import {
  RATE_LABEL,
  addToWeek,
  cleanupWagez,
  doMath,
  enterShift,
  openShift,
  openWeek,
  reloadWagez,
  resetShift,
  savedDay,
  setDay,
  setTime,
  undoSave,
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

/**
 * Enter a shift, do the math, and put it in the week on a given day.
 *
 * Wagez picks the day itself on the way in, so a test that wants a particular
 * one says so afterwards — which is the same press a user makes.
 */
function saveShift({ date, start, end, rate }) {
  // A shift already saved stays saved, so a second one starts from scratch.
  resetShift();
  enterShift({ start, end, rate });
  doMath();
  addToWeek();
  if (date !== undefined) setDay(date);
}

/** One saved shift, as its own little screen. */
const card = (index = 0) => within(shiftCards()[index]);

/** What each card in the week currently says it covered. */
const cardTimes = () =>
  [...document.querySelectorAll(".wagez-shift-times")].map(
    (el) => el.textContent,
  );

/** Press Edit, Duplicate or Delete on a card, whichever shift it belongs to. */
function pressAction(index, action) {
  // Each card's actions name the shift they belong to, so match the verb.
  fireEvent.click(
    card(index).getByRole("button", { name: new RegExp(`^${action}`) }),
  );
}

/** The form a card opens into, once Edit or Duplicate has been pressed. */
const form = () => within(document.querySelector(".wagez-shift-form"));

function save() {
  fireEvent.click(form().getByRole("button", { name: "Save" }));
}

describe("adding a shift to the week", () => {
  it("saves on one press, on the day the shift was worked", () => {
    // Ten to midnight on Monday 17 August: a shift that started at four this
    // afternoon is today's, and nobody needs to be asked.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 7, 17, 23, 50));

    try {
      render(<WagezApp />);
      enterShift({ start: "16:00", end: "23:30", rate: "20" });
      doMath();

      // Calculating keeps nothing.
      expect(savedDay()).toBeNull();

      addToWeek();
      expect(savedDay().textContent).toBe(formatShiftDay("2026-08-17"));

      openWeek();
      expect(shiftCards()).toHaveLength(1);
      expect(week().getByText(formatShiftDay("2026-08-17"))).not.toBeNull();
      expect(week().getByText("4:00 PM → 11:30 PM")).not.toBeNull();
      expect(week().getByText("7h 30m")).not.toBeNull();
      expect(summary().getByText("$150.00")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("carries a shift back to last night when that is when it was worked", () => {
    // Half past three in the morning, logging ten last night to three just now.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 7, 18, 3, 30));

    try {
      render(<WagezApp />);
      enterShift({ start: "22:00", end: "03:00", rate: "18" });
      doMath();
      addToWeek();

      expect(savedDay().textContent).toBe(formatShiftDay("2026-08-17"));

      openWeek();
      expect(week().getByText(formatShiftDay("2026-08-17"))).not.toBeNull();
      expect(week().getByText("+1 day")).not.toBeNull();
      expect(summary().getByText("$90.00")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves the shift when another day is pressed, without copying it", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });

    expect(savedDay().textContent).toBe(formatShiftDay(day(1)));

    openWeek();
    expect(shiftCards()).toHaveLength(1);
    expect(week().getByText(formatShiftDay(day(1)))).not.toBeNull();
    expect(summary().getByText("1 shift")).not.toBeNull();
  });

  it("takes the shift back out of the week on Undo", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });

    openWeek();
    expect(shiftCards()).toHaveLength(1);

    openShift();
    undoSave();

    openWeek();
    expect(shiftCards()).toHaveLength(0);
    expect(summary().getByText("0 shifts")).not.toBeNull();
  });

  it("keeps the calculator's confirmation true to the week", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });

    // Moved to another day over in the week.
    openWeek();
    pressAction(0, "Edit");
    fireEvent.change(form().getByLabelText("Day"), {
      target: { value: day(3) },
    });
    save();

    openShift();
    expect(savedDay().textContent).toBe(formatShiftDay(day(3)));
  });

  it("stops offering to undo a shift the week no longer has", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });

    openWeek();
    pressAction(0, "Delete");
    fireEvent.click(card().getByRole("button", { name: "Delete" }));

    // The answer is still on screen, but it is nobody's saved shift now.
    openShift();
    expect(savedDay()).toBeNull();
    expect(
      screen.getByRole("button", { name: "+ Add to week" }),
    ).not.toBeNull();
  });

  it("leaves nothing behind when an undone shift is saved again", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    undoSave();
    addToWeek();

    openWeek();
    expect(shiftCards()).toHaveLength(1);
    expect(summary().getByText("1 shift")).not.toBeNull();
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

    expect(cardTimes()).toEqual([
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

describe("keeping the week", () => {
  it("edits a shift, and the week says so immediately", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();
    expect(summary().getByText("$160.00")).not.toBeNull();

    pressAction(0, "Edit");
    setTime("Stop", "19:00", form());
    save();

    expect(card().getByText("9:00 AM → 7:00 PM")).not.toBeNull();
    expect(card().getByText("10h")).not.toBeNull();
    expect(summary().getByText("10 hours.")).not.toBeNull();
    expect(summary().getByText("$200.00")).not.toBeNull();
    expect(shiftCards()).toHaveLength(1);
  });

  it("edits the rate, and only that shift's money moves", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    saveShift({ date: day(2), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    fireEvent.change(form().getByLabelText(RATE_LABEL), {
      target: { value: "30" },
    });
    save();

    expect(card(0).getByText("$240.00")).not.toBeNull();
    expect(card(1).getByText("$160.00")).not.toBeNull();
    expect(summary().getByText("$400.00")).not.toBeNull();
  });

  it("puts a shift back in order when its day changes", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "12:00", rate: "20" });
    saveShift({ date: day(2), start: "13:00", end: "17:00", rate: "20" });
    openWeek();
    expect(cardTimes()).toEqual(["9:00 AM → 12:00 PM", "1:00 PM → 5:00 PM"]);

    // The morning shift was actually worked on the later day.
    pressAction(0, "Edit");
    fireEvent.change(form().getByLabelText("Day"), {
      target: { value: day(3) },
    });
    save();

    expect(cardTimes()).toEqual(["1:00 PM → 5:00 PM", "9:00 AM → 12:00 PM"]);
    expect(week().getByText(formatShiftDay(day(3)))).not.toBeNull();
  });

  it("keeps an edited shift after a reload", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    setTime("Start", "10:00", form());
    save();

    reloadWagez();
    render(<WagezApp />);
    openWeek();

    expect(card().getByText("10:00 AM → 5:00 PM")).not.toBeNull();
    expect(summary().getByText("$140.00")).not.toBeNull();
    expect(shiftCards()).toHaveLength(1);
  });

  it("changes nothing when an edit is cancelled", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    setTime("Stop", "23:00", form());
    fireEvent.click(form().getByRole("button", { name: "Cancel" }));

    expect(card().getByText("9:00 AM → 5:00 PM")).not.toBeNull();
    expect(summary().getByText("$160.00")).not.toBeNull();
  });

  it("refuses an edit that would not calculate", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    setTime("Stop", "09:00", form());
    save();

    expect(
      form().getByText("Start and stop time can't be the same."),
    ).not.toBeNull();
    // Still open, and the saved shift is untouched behind it.
    expect(summary().getByText("$160.00")).not.toBeNull();
  });

  it("follows a shift moved into another week, rather than losing it", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    fireEvent.change(form().getByLabelText("Day"), {
      target: { value: day(-6) },
    });
    save();

    expect(week().getByText(formatWeekRange(day(-7)))).not.toBeNull();
    expect(shiftCards()).toHaveLength(1);
    expect(week().getByText(formatShiftDay(day(-6)))).not.toBeNull();
    expect(summary().getByText("$160.00")).not.toBeNull();
  });

  it("only ever has one shift open at a time", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "12:00", rate: "20" });
    saveShift({ date: day(2), start: "13:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Edit");
    expect(document.querySelectorAll(".wagez-shift-form")).toHaveLength(1);

    pressAction(1, "Edit");
    expect(document.querySelectorAll(".wagez-shift-form")).toHaveLength(1);
    expect(card(1).queryByLabelText("Day")).not.toBeNull();
  });
});

describe("deleting a shift", () => {
  it("asks first, and keeps the shift if the answer is no", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Delete");
    expect(week().getByText("Delete this shift?")).not.toBeNull();
    // The question names the two answers, so it is read out with them.
    expect(
      card().getByRole("group", { name: "Delete this shift?" }),
    ).not.toBeNull();

    fireEvent.click(card().getByRole("button", { name: "Cancel" }));

    expect(week().queryByText("Delete this shift?")).toBeNull();
    expect(shiftCards()).toHaveLength(1);
    expect(summary().getByText("$160.00")).not.toBeNull();
  });

  it("takes the shift out of the week, and out of its totals", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    saveShift({ date: day(2), start: "13:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Delete");
    fireEvent.click(card().getByRole("button", { name: "Delete" }));

    expect(shiftCards()).toHaveLength(1);
    expect(cardTimes()).toEqual(["1:00 PM → 5:00 PM"]);
    expect(summary().getByText("1 shift")).not.toBeNull();
    expect(summary().getByText("4 hours.")).not.toBeNull();
    expect(summary().getByText("$80.00")).not.toBeNull();
  });

  it("stays deleted after a reload", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Delete");
    fireEvent.click(card().getByRole("button", { name: "Delete" }));

    reloadWagez();
    render(<WagezApp />);
    openWeek();

    expect(shiftCards()).toHaveLength(0);
    expect(summary().getByText("0 shifts")).not.toBeNull();
  });
});

describe("duplicating a shift", () => {
  it("opens on the day after, with the shift it came from unchanged", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Duplicate");
    expect(form().getByLabelText("Day").value).toBe(day(2));
    save();

    expect(shiftCards()).toHaveLength(2);
    expect(cardTimes()).toEqual(["9:00 AM → 5:00 PM", "9:00 AM → 5:00 PM"]);
    expect(week().getByText(formatShiftDay(day(1)))).not.toBeNull();
    expect(week().getByText(formatShiftDay(day(2)))).not.toBeNull();
    expect(summary().getByText("2 shifts")).not.toBeNull();
    expect(summary().getByText("$320.00")).not.toBeNull();
  });

  it("makes a shift of its own, which the original never feels", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    // The copy is worked on a different day, and for longer.
    pressAction(0, "Duplicate");
    setTime("Stop", "19:00", form());
    save();

    expect(cardTimes()).toEqual(["9:00 AM → 5:00 PM", "9:00 AM → 7:00 PM"]);

    // Deleting the copy leaves the shift it was copied from behind.
    pressAction(1, "Delete");
    fireEvent.click(card(1).getByRole("button", { name: "Delete" }));

    expect(shiftCards()).toHaveLength(1);
    expect(card().getByText("9:00 AM → 5:00 PM")).not.toBeNull();
    expect(summary().getByText("$160.00")).not.toBeNull();
  });

  it("creates nothing at all when it is cancelled", () => {
    render(<WagezApp />);
    saveShift({ date: day(1), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    pressAction(0, "Duplicate");
    fireEvent.click(form().getByRole("button", { name: "Cancel" }));

    expect(shiftCards()).toHaveLength(1);
    expect(summary().getByText("1 shift")).not.toBeNull();
  });

  it("follows the copy into the next week when that is where it lands", () => {
    render(<WagezApp />);
    saveShift({ date: day(6), start: "09:00", end: "17:00", rate: "20" });
    openWeek();

    // The last day of the week is copied onto the first day of the next.
    pressAction(0, "Duplicate");
    expect(form().getByLabelText("Day").value).toBe(day(7));
    save();

    // Rather than looking like nothing happened, the week goes with it.
    expect(week().getByText(formatWeekRange(day(7)))).not.toBeNull();
    expect(shiftCards()).toHaveLength(1);
    expect(week().getByText(formatShiftDay(day(7)))).not.toBeNull();

    fireEvent.click(week().getByRole("button", { name: "Previous week" }));
    expect(week().getByText(formatShiftDay(day(6)))).not.toBeNull();
    expect(summary().getByText("1 shift")).not.toBeNull();
  });
});
