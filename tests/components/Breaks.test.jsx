// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";

import {
  BREAK_LABEL,
  addToWeek,
  cleanupWagez,
  currentValue,
  displayedLabels,
  doMath,
  enterShift,
  freezeClock,
  openWeek,
  reloadWagez,
  resetShift,
  revealToggle,
  setBreak,
  setTime,
  showBreak,
} from "../helpers/wagez";

// Wagez reads the clock to place a shift in a day and a week, so the tests
// hold it still: run for real at the wrong hour, an ordinary shift belongs to
// yesterday and yesterday can belong to last week.
freezeClock();

afterEach(cleanupWagez);

/** The one saved shift on screen, in the week. */
function card() {
  return document.querySelector(".wagez-shift-card");
}

describe("an unpaid break comes off the shift", () => {
  it("starts at none, and stays out of the way until it is asked for", () => {
    render(<WagezApp />);

    expect(screen.queryByLabelText(BREAK_LABEL)).toBeNull();

    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    // Nothing was deducted, because nothing was entered.
    expect(screen.getByText("8 hours.")).not.toBeNull();
    expect(screen.getByText("$160.00")).not.toBeNull();
    expect(displayedLabels()).toEqual(["Start:", "Stop:", "Pay Rate:"]);
  });

  it("takes the break off the time worked and off the money", () => {
    render(<WagezApp />);

    enterShift({
      start: "09:00",
      end: "17:00",
      rate: "20",
      breakMinutes: "30",
    });

    // The display follows the break immediately, like every other input.
    expect(currentValue("Break:")).toBe("30m");
    expect(screen.queryByText("You worked:")).toBeNull();

    doMath();

    expect(screen.getByText("7 hours + 30 min.")).not.toBeNull();
    expect(screen.getByText("$150.00")).not.toBeNull();
  });

  it("reports the shorter time even when there is no rate at all", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "45" });
    doMath();

    expect(screen.getByText("7 hours + 15 min.")).not.toBeNull();
    expect(screen.queryByText("and made:")).toBeNull();
  });

  it("sets a quarter of an hour with one press", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    showBreak();
    fireEvent.click(screen.getByRole("button", { name: "45 minute break" }));

    expect(screen.getByLabelText(BREAK_LABEL).value).toBe("45");
    expect(currentValue("Break:")).toBe("45m");

    doMath();
    expect(screen.getByText("7 hours + 15 min.")).not.toBeNull();
  });

  it("marks the quick break the shift is already on", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "30" });

    expect(
      screen.getByRole("button", { name: "30 minute break" }),
    ).toHaveProperty("ariaPressed", "true");
    expect(
      screen.getByRole("button", { name: "15 minute break" }),
    ).toHaveProperty("ariaPressed", "false");
  });

  it("accepts any number of minutes, not only the quick ones", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", rate: "20", breakMinutes: "7" });
    doMath();

    expect(screen.getByText("7 hours + 53 min.")).not.toBeNull();
    expect(screen.getByText("$157.67")).not.toBeNull();
  });

  it("takes the break away with the field when it is closed again", () => {
    render(<WagezApp />);

    enterShift({
      start: "09:00",
      end: "17:00",
      rate: "20",
      breakMinutes: "30",
    });
    expect(currentValue("Break:")).toBe("30m");

    fireEvent.click(revealToggle("break-minutes"));

    // Gone from the panel, gone from the display, and gone from the answer: a
    // break nobody can see must not go on quietly costing them time.
    expect(screen.queryByLabelText(BREAK_LABEL)).toBeNull();
    expect(displayedLabels()).toEqual(["Start:", "Stop:", "Pay Rate:"]);

    doMath();
    expect(screen.getByText("8 hours.")).not.toBeNull();
    expect(screen.getByText("$160.00")).not.toBeNull();
  });

  it("clears the break on reset", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "30" });
    resetShift();

    expect(screen.queryByLabelText(BREAK_LABEL)).toBeNull();
    expect(displayedLabels()).toEqual([]);
  });

  it("stales a standing result when the break changes", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(document.querySelector(".wagez-stale")).toBeNull();

    setBreak("30");

    expect(document.querySelector(".wagez-stale")).not.toBeNull();
    // And the old answer is still the old answer until Do Math. is pressed.
    expect(screen.getByText("8 hours.")).not.toBeNull();

    doMath();
    expect(screen.getByText("7 hours + 30 min.")).not.toBeNull();
  });
});

describe("a break that could not be taken", () => {
  it("refuses one longer than the shift, and says so", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "600" });
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "That break is longer than the shift.",
    );
    expect(screen.queryByText("You worked:")).toBeNull();
  });

  it("refuses one exactly as long as the shift", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "480" });
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "That break is longer than the shift.",
    );
  });

  it("refuses one it cannot read at all", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "-15" });
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "A break can't be negative.",
    );
    expect(screen.queryByText("You worked:")).toBeNull();
  });

  it("puts the user on the break to fix it", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "600" });
    doMath();

    expect(document.activeElement).toBe(screen.getByLabelText(BREAK_LABEL));
  });

  it("stops complaining the moment the break is being fixed", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "600" });
    doMath();
    expect(screen.queryByRole("alert")).not.toBeNull();

    setBreak("60");
    expect(screen.queryByRole("alert")).toBeNull();

    doMath();
    expect(screen.getByText("7 hours.")).not.toBeNull();
  });

  it("measures the break against an overnight shift, not against the clock", () => {
    render(<WagezApp />);

    // 10 PM to 3 AM is five hours, so half an hour of it is a fair break.
    enterShift({ start: "22:00", end: "03:00", breakMinutes: "30" });
    doMath();

    expect(screen.getByText("4 hours + 30 min.")).not.toBeNull();
  });
});

describe("a break follows the shift into the week", () => {
  it("saves with the shift, and the week counts the paid time", () => {
    render(<WagezApp />);

    enterShift({
      start: "09:00",
      end: "17:00",
      rate: "20",
      breakMinutes: "30",
    });
    doMath();
    addToWeek();
    openWeek();

    const shift = within(card());
    expect(shift.getByText(/30m break/)).not.toBeNull();
    expect(shift.getByText("7h 30m")).not.toBeNull();
    expect(shift.getByText("$150.00")).not.toBeNull();

    const summary = within(document.querySelector(".wagez-week-summary"));
    expect(summary.getByText("7 hours + 30 min.")).not.toBeNull();
    expect(summary.getByText("$150.00")).not.toBeNull();
  });

  it("says nothing about a break on a shift that never had one", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();
    openWeek();

    expect(within(card()).queryByText(/break/)).toBeNull();
  });

  it("is editable there, and the totals move with it", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();
    openWeek();

    fireEvent.click(within(card()).getByRole("button", { name: /^Edit/ }));
    fireEvent.change(within(card()).getByLabelText(BREAK_LABEL), {
      target: { value: "60" },
    });
    fireEvent.click(within(card()).getByRole("button", { name: "Save" }));

    const shift = within(card());
    expect(shift.getByText(/1h break/)).not.toBeNull();
    expect(shift.getByText("7h")).not.toBeNull();
    expect(shift.getByText("$140.00")).not.toBeNull();
    expect(
      within(document.querySelector(".wagez-week-summary")).getByText(
        "$140.00",
      ),
    ).not.toBeNull();
  });

  it("refuses an edit that would make the break longer than the shift", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();
    openWeek();

    fireEvent.click(within(card()).getByRole("button", { name: /^Edit/ }));
    fireEvent.change(within(card()).getByLabelText(BREAK_LABEL), {
      target: { value: "999" },
    });
    fireEvent.click(within(card()).getByRole("button", { name: "Save" }));

    // Still open, still complaining, and the shift itself is untouched.
    expect(within(card()).getByRole("alert").textContent).toBe(
      "That break is longer than the shift.",
    );

    fireEvent.click(within(card()).getByRole("button", { name: "Cancel" }));
    expect(within(card()).getByText("8h")).not.toBeNull();
  });

  it("goes along with a duplicated shift", () => {
    render(<WagezApp />);

    enterShift({
      start: "09:00",
      end: "17:00",
      rate: "20",
      breakMinutes: "30",
    });
    doMath();
    addToWeek();
    openWeek();

    fireEvent.click(within(card()).getByRole("button", { name: /^Duplicate/ }));
    expect(within(card()).getByLabelText(BREAK_LABEL).value).toBe("30");
    fireEvent.click(within(card()).getByRole("button", { name: "Save" }));

    const cards = document.querySelectorAll(".wagez-shift-card");
    expect(cards).toHaveLength(2);
    for (const copy of cards) {
      expect(within(copy).getByText(/30m break/)).not.toBeNull();
    }
  });

  it("keeps the break after a reload", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", breakMinutes: "30" });
    doMath();
    addToWeek();

    reloadWagez();
    render(<WagezApp />);
    openWeek();

    expect(within(card()).getByText(/30m break/)).not.toBeNull();
    expect(within(card()).getByText("7h 30m")).not.toBeNull();
  });
});

describe("the break sits beside the pay rate, not in front of it", () => {
  it("offers both as words, and each reveals its own field", () => {
    render(<WagezApp />);

    const words = [...document.querySelectorAll(".wagez-reveal")].map(
      (button) => button.textContent,
    );
    expect(words).toEqual(["$/Hr", "Break"]);

    showBreak();

    // The rate is untouched by the break appearing.
    expect(screen.getByLabelText(BREAK_LABEL)).not.toBeNull();
    expect(revealToggle("hourly-rate").getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it("controls the field it names", () => {
    render(<WagezApp />);
    showBreak();

    expect(revealToggle("break-minutes").getAttribute("aria-controls")).toBe(
      screen.getByLabelText(BREAK_LABEL).id,
    );
    expect(revealToggle("break-minutes").getAttribute("aria-label")).toBe(
      "Remove the break",
    );
  });

  it("puts the caret in the break the moment it is asked for", () => {
    render(<WagezApp />);
    setTime("Start", "09:00");
    showBreak();

    expect(document.activeElement).toBe(screen.getByLabelText(BREAK_LABEL));
  });

  it("hands the caret back to the word that offers it again", () => {
    render(<WagezApp />);
    showBreak();
    fireEvent.click(revealToggle("break-minutes"));

    expect(document.activeElement).toBe(revealToggle("break-minutes"));
  });
});
