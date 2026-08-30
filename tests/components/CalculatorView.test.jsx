// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { addDays, todayIsoDate } from "@/lib/dates/isoDate";
import { formatShiftDay } from "@/lib/formatters/date";
import { suggestShiftDate } from "@/lib/shifts/savedShift";

import {
  RATE_LABEL,
  addToWeek,
  cleanupWagez,
  currentValue,
  displayedLabels,
  doMath,
  enterShift,
  freezeClock,
  revealToggle,
  savedDay,
  setDay,
  setRate,
  setTime,
  showDayStrip,
  showRate,
  undoSave,
} from "../helpers/wagez";

// Wagez reads the clock to place a shift in a day and a week, so the tests
// hold it still: run for real at the wrong hour, an ordinary shift belongs to
// yesterday and yesterday can belong to last week.
freezeClock();

afterEach(cleanupWagez);

const STALE_NOTE = "Inputs changed — Do Math. again.";

/** The result element, when it is currently marked stale. */
function staleResult() {
  return document.querySelector(".wagez-stale");
}

describe("calculating a single shift", () => {
  it("shows entered values immediately, but no result until Do Math.", () => {
    render(<WagezApp />);

    expect(displayedLabels()).toEqual([]);

    enterShift({ start: "16:00", end: "23:00", rate: "20" });

    expect(currentValue("Start:")).toBe("4:00 PM");
    expect(currentValue("Stop:")).toBe("11:00 PM");
    expect(currentValue("Pay Rate:")).toBe("$20/hour");

    // Nothing has been calculated yet.
    expect(screen.queryByText("You worked:")).toBeNull();
    expect(screen.queryByText("$140.00")).toBeNull();

    doMath();

    expect(screen.getByText("You worked:")).not.toBeNull();
    expect(screen.getByText("7 hours.")).not.toBeNull();
    expect(screen.getByText("and made:")).not.toBeNull();
    expect(screen.getByText("$140.00")).not.toBeNull();
  });

  it("takes a whole shift from the quick controls alone", () => {
    render(<WagezApp />);

    fireEvent.change(screen.getByLabelText("Start hour"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start 0 minutes" }));
    fireEvent.change(screen.getByLabelText("Stop hour"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Stop 30 minutes" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop PM" }));

    // The top display followed every press, without a calculation.
    expect(currentValue("Start:")).toBe("9:00 AM");
    expect(currentValue("Stop:")).toBe("5:30 PM");
    expect(screen.queryByText("You worked:")).toBeNull();

    setRate("20");
    doMath();

    expect(screen.getByText("8 hours + 30 min.")).not.toBeNull();
    expect(screen.getByText("$170.00")).not.toBeNull();
  });

  it("calculates a partial hour at a decimal rate", () => {
    render(<WagezApp />);
    enterShift({ start: "09:15", end: "17:45", rate: "22.50" });
    doMath();

    expect(screen.getByText("8 hours + 30 min.")).not.toBeNull();
    expect(screen.getByText("$191.25")).not.toBeNull();
  });

  it("calculates an overnight shift", () => {
    render(<WagezApp />);
    enterShift({ start: "22:00", end: "03:00", rate: "18" });
    doMath();

    expect(screen.getByText("5 hours.")).not.toBeNull();
    expect(screen.getByText("$90.00")).not.toBeNull();
  });

  it("reports time worked without inventing earnings when the rate is blank", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00" });
    doMath();

    expect(screen.getByText("8 hours.")).not.toBeNull();
    expect(screen.queryByText("and made:")).toBeNull();
  });

  it("recalculates only when Do Math. is pressed again", () => {
    render(<WagezApp />);
    enterShift({ start: "16:00", end: "23:00", rate: "20" });
    doMath();
    expect(screen.getByText("7 hours.")).not.toBeNull();

    setTime("Stop", "23:30");

    // The top display moved; the result did not recalculate on its own.
    expect(currentValue("Stop:")).toBe("11:30 PM");
    expect(screen.getByText("7 hours.")).not.toBeNull();

    doMath();
    expect(screen.getByText("7 hours + 30 min.")).not.toBeNull();
    expect(screen.getByText("$150.00")).not.toBeNull();
  });
});

describe("invalid input", () => {
  it("asks for a missing clock-in time instead of calculating", () => {
    render(<WagezApp />);
    setTime("Stop", "17:00");
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "What is the start time?",
    );
    expect(screen.queryByText("You worked:")).toBeNull();
    expect(screen.getByLabelText("Start hour")).toBe(document.activeElement);
  });

  it("refuses to read an identical start and end as a 24-hour shift", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "09:00" });
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "Start and stop time can't be the same.",
    );
    expect(screen.queryByText("You worked:")).toBeNull();
  });

  it("rejects a nonsense rate and clears the complaint once it is fixed", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "abc" });
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "That pay rate doesn't look right.",
    );

    setRate("20");
    expect(screen.queryByRole("alert")).toBeNull();

    doMath();
    expect(screen.getByText("$160.00")).not.toBeNull();
  });
});

describe("reset", () => {
  it("clears the inputs and the result", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(screen.getByText("$160.00")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(displayedLabels()).toEqual([]);
    expect(screen.getByLabelText("Start hour").value).toBe("");
    expect(screen.getByLabelText("Start minutes").value).toBe("");
    expect(screen.queryByText("You worked:")).toBeNull();
    expect(screen.queryByText("$160.00")).toBeNull();
  });
});

describe("stale results", () => {
  it("marks the result stale until Do Math. is pressed again", () => {
    render(<WagezApp />);

    // 1-3. The entered values show at once; nothing is calculated yet.
    enterShift({ start: "16:00", end: "23:00", rate: "20" });
    expect(currentValue("Start:")).toBe("4:00 PM");
    expect(currentValue("Stop:")).toBe("11:00 PM");
    expect(currentValue("Pay Rate:")).toBe("$20/hour");
    expect(screen.queryByText("You worked:")).toBeNull();

    // 4-5. Do Math. produces the result.
    doMath();
    expect(screen.getByText("7 hours.")).not.toBeNull();
    expect(screen.getByText("$140.00")).not.toBeNull();
    expect(screen.queryByText(STALE_NOTE)).toBeNull();
    expect(staleResult()).toBeNull();

    // 6-9. Changing an input moves the top display and stales the result,
    // without recalculating it.
    setTime("Stop", "23:30");
    expect(currentValue("Stop:")).toBe("11:30 PM");
    expect(screen.getByText(STALE_NOTE)).not.toBeNull();
    expect(staleResult().textContent).toContain("7 hours.");
    expect(staleResult().textContent).toContain("$140.00");
    // Dimmed green would not clear the contrast floor over the gradient.
    expect(screen.getByText("$140.00").className).toContain(
      "wagez-money-muted",
    );

    // 10-11. Do Math. again produces the fresh result, no longer stale.
    doMath();
    expect(screen.getByText("7 hours + 30 min.")).not.toBeNull();
    expect(screen.getByText("$150.00")).not.toBeNull();
    expect(screen.getByText("$150.00").className).not.toContain("muted");
    expect(screen.queryByText(STALE_NOTE)).toBeNull();
    expect(staleResult()).toBeNull();
  });

  it("stales the result when the rate changes", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(screen.getByText("$160.00")).not.toBeNull();

    setRate("25");

    expect(currentValue("Pay Rate:")).toBe("$25/hour");
    expect(screen.getByText(STALE_NOTE)).not.toBeNull();
    expect(screen.getByText("$160.00")).not.toBeNull();

    doMath();
    expect(screen.getByText("$200.00")).not.toBeNull();
    expect(screen.queryByText(STALE_NOTE)).toBeNull();
  });

  it("stales the result while a time is half-edited", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    // Clearing the hour leaves no clock-out time at all.
    const hour = screen.getByLabelText("Stop hour");
    hour.focus();
    fireEvent.change(hour, { target: { value: "" } });

    expect(displayedLabels()).toEqual(["Start:", "Pay Rate:"]);
    expect(screen.getByText(STALE_NOTE)).not.toBeNull();
    expect(staleResult().textContent).toContain("8 hours.");
  });

  it("does not stale a result when an input is rewritten to the same value", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    setRate("20.00");
    expect(screen.queryByText(STALE_NOTE)).toBeNull();

    setTime("Start", "09:00");
    expect(screen.queryByText(STALE_NOTE)).toBeNull();
    expect(screen.getByText("$160.00")).not.toBeNull();
  });

  it("drops a stale result rather than staling it forever after a bad Do Math.", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    setRate("abc");
    expect(screen.getByText(STALE_NOTE)).not.toBeNull();

    doMath();
    expect(screen.getByRole("alert").textContent).toBe(
      "That pay rate doesn't look right.",
    );
    expect(screen.queryByText(STALE_NOTE)).toBeNull();
    expect(screen.queryByText("You worked:")).toBeNull();
  });

  it("clears the stale marker along with the result on reset", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    setRate("25");
    expect(screen.getByText(STALE_NOTE)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.queryByText(STALE_NOTE)).toBeNull();
    expect(screen.queryByText("You worked:")).toBeNull();
  });
});

describe("the display grows with what has been entered", () => {
  /** How many values the editor believes are showing above it. */
  function editorEntered() {
    return document.querySelector(".wagez-panel").dataset.entered;
  }

  it("shows no labels at all until something is entered", () => {
    render(<WagezApp />);

    expect(displayedLabels()).toEqual([]);
    expect(screen.queryByText("Start:", { selector: "dt" })).toBeNull();
    // The editor is alone on the screen, so it draws itself at full size.
    expect(editorEntered()).toBe("0");
  });

  it("adds each label only as its own value is entered", () => {
    render(<WagezApp />);

    setTime("Start", "16:00");
    expect(displayedLabels()).toEqual(["Start:"]);
    expect(currentValue("Start:")).toBe("4:00 PM");
    expect(editorEntered()).toBe("1");

    setRate("20");
    // Order stays the order of the shift, not the order they were typed.
    expect(displayedLabels()).toEqual(["Start:", "Pay Rate:"]);
    expect(editorEntered()).toBe("2");

    setTime("Stop", "23:00");
    expect(displayedLabels()).toEqual(["Start:", "Stop:", "Pay Rate:"]);
    expect(editorEntered()).toBe("3");
  });

  it("takes a label away again when its value is cleared", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    expect(editorEntered()).toBe("3");

    setRate("");
    expect(displayedLabels()).toEqual(["Start:", "Stop:"]);
    expect(editorEntered()).toBe("2");

    const hour = screen.getByLabelText("Stop hour");
    hour.focus();
    fireEvent.change(hour, { target: { value: "" } });
    expect(displayedLabels()).toEqual(["Start:"]);
    expect(editorEntered()).toBe("1");
  });

  it("returns to its largest, empty state on reset", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(editorEntered()).toBe("3");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(displayedLabels()).toEqual([]);
    expect(editorEntered()).toBe("0");
  });

  it("keeps the editor's own field labels visible at all times", () => {
    render(<WagezApp />);

    // Nothing entered: no display labels, but every input is still labelled.
    expect(displayedLabels()).toEqual([]);
    expect(screen.getByRole("group", { name: "Start:" })).not.toBeNull();
    expect(screen.getByRole("group", { name: "Stop:" })).not.toBeNull();
    expect(
      [...document.querySelectorAll(".wagez-field-label")].map(
        (el) => el.textContent,
      ),
    ).toEqual(["Start:", "Stop:"]);

    showRate();
    expect(screen.getByLabelText(RATE_LABEL)).not.toBeNull();
    expect(
      [...document.querySelectorAll(".wagez-field-label")].map(
        (el) => el.textContent,
      ),
    ).toEqual(["Start:", "Stop:", "Pay Rate:"]);
  });
});

describe("the screen hands itself between the inputs and the answer", () => {
  /** Which region currently owns the screen, and whether it is being peeked. */
  function stage() {
    const el = document.querySelector(".wagez-stage");
    return { stage: el.dataset.stage, peek: el.dataset.peek };
  }

  const editor = () => document.querySelector(".wagez-panel");
  const entered = () => document.querySelector(".wagez-entered");

  it("starts with the inputs owning the screen", () => {
    render(<WagezApp />);
    expect(stage()).toEqual({ stage: "editing", peek: undefined });
  });

  it("hands the screen to the result once Do Math. succeeds", () => {
    render(<WagezApp />);
    enterShift({ start: "16:00", end: "23:00", rate: "20" });
    expect(stage().stage).toBe("editing");

    doMath();

    expect(stage().stage).toBe("result");
    expect(screen.getByText("$140.00")).not.toBeNull();
    // Stepped back, the editor is one target rather than a set of controls.
    expect(editor().className).toContain("wagez-recallable");
  });

  it("keeps the screen on the inputs when Do Math. only finds a mistake", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "09:00" });
    doMath();

    expect(screen.getByRole("alert")).not.toBeNull();
    expect(stage().stage).toBe("editing");
  });

  it("hands the screen back when the shrunken editor is clicked", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    fireEvent.mouseEnter(editor());

    fireEvent.click(editor());

    expect(stage()).toEqual({ stage: "editing", peek: undefined });
    expect(editor().className).not.toContain("wagez-recallable");
    // The result is still there, just no longer the headline.
    expect(screen.getByText("$160.00")).not.toBeNull();
  });

  it("hands the screen back when the shrunken values are clicked", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    fireEvent.click(entered());

    expect(stage()).toEqual({ stage: "editing", peek: undefined });
  });

  it("hands the screen back when the keyboard tabs into the editor", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(stage().stage).toBe("result");

    // Focus reaching a control is the keyboard's version of clicking in.
    fireEvent.focus(screen.getByLabelText("Start hour"));

    expect(stage().stage).toBe("editing");
  });

  it("hands the screen back the moment the shift is edited", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(stage().stage).toBe("result");

    // A keyboard that submitted with Enter never left the panel, so no focus
    // event fires — typing has to be enough on its own.
    setRate("25");

    expect(stage()).toEqual({ stage: "editing", peek: undefined });
    expect(screen.getByText(STALE_NOTE)).not.toBeNull();
  });

  it("returns the screen to the inputs on reset", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(stage()).toEqual({ stage: "editing", peek: undefined });
    expect(displayedLabels()).toEqual([]);
  });
});

describe("arriving at Wagez", () => {
  it("puts the caret in the clock-in hour, ready for a number", () => {
    render(<WagezApp />);

    expect(screen.getByLabelText("Start hour")).toBe(document.activeElement);
  });

  it("takes the first digit typed straight into the clock-in hour", () => {
    render(<WagezApp />);

    // No aiming: whatever is focused on arrival is where the shift starts.
    fireEvent.change(document.activeElement, { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Start 0 minutes" }));

    expect(currentValue("Start:")).toBe("9:00 AM");
  });
});

describe("typing a whole shift without touching the mouse", () => {
  /** Type digits into a segment the way a person does, one key at a time. */
  function type(input, digits) {
    input.focus();
    [...digits].forEach((digit, index) => {
      fireEvent.change(input, {
        target: { value: index === 0 ? digit : input.value + digit },
      });
    });
  }

  it("hands the caret along as each part of a time is finished", () => {
    render(<WagezApp />);

    // Arrival puts it in the start hour; the hour hands over to the minute.
    expect(screen.getByLabelText("Start hour")).toBe(document.activeElement);
    type(document.activeElement, "4");
    expect(screen.getByLabelText("Start minutes")).toBe(document.activeElement);

    // The half of the day is chosen while typing rather than after it.
    fireEvent.keyDown(document.activeElement, { key: "p" });

    // The minute finishes the start time, so the stop time takes over.
    type(document.activeElement, "15");
    expect(currentValue("Start:")).toBe("4:15 PM");
    expect(screen.getByLabelText("Stop hour")).toBe(document.activeElement);
  });

  it("skips the AM/PM step when the hour already said which half it is", () => {
    render(<WagezApp />);

    // 16 can only be the afternoon, so there is nothing left to ask.
    type(screen.getByLabelText("Start hour"), "16");
    type(document.activeElement, "15");

    expect(currentValue("Start:")).toBe("4:15 PM");
    expect(screen.getByLabelText("Stop hour")).toBe(document.activeElement);
  });

  it("lands on Do Math. once both times are in", () => {
    render(<WagezApp />);
    type(screen.getByLabelText("Start hour"), "9");
    fireEvent.keyDown(document.activeElement, { key: "a" });
    type(document.activeElement, "00");

    type(screen.getByLabelText("Stop hour"), "5");
    fireEvent.keyDown(document.activeElement, { key: "p" });
    type(document.activeElement, "30");

    // Nothing left to type: the answer is under the return key.
    expect(screen.getByRole("button", { name: "Do Math." })).toBe(
      document.activeElement,
    );

    fireEvent.click(document.activeElement);
    expect(screen.getByText("8 hours + 30 min.")).not.toBeNull();
  });

  it("stops at the pay rate instead when one has been asked for", () => {
    render(<WagezApp />);
    showRate();

    setTime("Start", "09:00");
    type(screen.getByLabelText("Stop hour"), "5");
    fireEvent.keyDown(document.activeElement, { key: "p" });
    type(document.activeElement, "30");

    expect(screen.getByLabelText(RATE_LABEL)).toBe(document.activeElement);
  });

  it("passes a pay rate that is already filled in", () => {
    render(<WagezApp />);
    setRate("20");

    setTime("Start", "09:00");
    type(screen.getByLabelText("Stop hour"), "5");
    fireEvent.keyDown(document.activeElement, { key: "p" });
    type(document.activeElement, "30");

    expect(screen.getByRole("button", { name: "Do Math." })).toBe(
      document.activeElement,
    );
  });

  it("does not chase the caret out of a time being corrected", () => {
    render(<WagezApp />);
    enterShift({ start: "16:00", end: "23:00" });

    // Going back to the start hour must leave the user in the start time.
    const hour = screen.getByLabelText("Start hour");
    type(hour, "5");

    expect(screen.getByLabelText("Start minutes")).toBe(document.activeElement);
  });
});

describe("the pay rate stays out of the way until it is wanted", () => {
  const toggle = () => revealToggle("hourly-rate");

  /** The X drawn across the toggle when the field below it is showing. */
  const crossedOut = () => document.querySelector(".wagez-reveal-x");

  it("shows nothing but a word until that word is pressed", () => {
    render(<WagezApp />);

    expect(screen.queryByLabelText(RATE_LABEL)).toBeNull();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(crossedOut()).toBeNull();

    fireEvent.click(toggle());

    expect(screen.getByLabelText(RATE_LABEL)).not.toBeNull();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    // The field below now carries the name, so the word gives way to an X
    // whose only job is to take the field away again.
    expect(toggle().textContent).toBe("");
    expect(toggle().getAttribute("aria-label")).toBe("Remove the pay rate");
    expect(toggle().dataset.open).toBe("true");
    expect(crossedOut()).not.toBeNull();
  });

  it("puts the field directly below the word that revealed it", () => {
    render(<WagezApp />);
    fireEvent.click(toggle());

    const field = screen.getByLabelText(RATE_LABEL);

    expect(
      toggle().compareDocumentPosition(field) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("takes the rate away with it when pressed again", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    expect(currentValue("Pay Rate:")).toBe("$20/hour");

    fireEvent.click(toggle());

    // Gone from the panel, gone from the display, and gone from the answer:
    // a rate nobody can see must not quietly go on earning money.
    expect(screen.queryByLabelText(RATE_LABEL)).toBeNull();
    expect(displayedLabels()).toEqual(["Start:", "Stop:"]);

    doMath();
    expect(screen.getByText("8 hours.")).not.toBeNull();
    expect(screen.queryByText("and made:")).toBeNull();
  });

  it("controls the field it names", () => {
    render(<WagezApp />);
    fireEvent.click(toggle());

    expect(toggle().getAttribute("aria-controls")).toBe(
      screen.getByLabelText(RATE_LABEL).id,
    );
  });
});

describe("saving the answer into the week", () => {
  it("keeps the calculator free of any day at all", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });

    // Three things are entered, and a day is not one of them: the same hours
    // pay the same money whichever day they were worked.
    expect(displayedLabels()).toEqual(["Start:", "Stop:", "Pay Rate:"]);
    expect(screen.queryByLabelText("Day")).toBeNull();
    expect(screen.queryByRole("button", { name: /add day/i })).toBeNull();
  });

  it("saves on one press, and says which day it went to", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    // Calculating saves nothing.
    expect(savedDay()).toBeNull();

    addToWeek();

    // One press. No question, and nothing left to fill in.
    expect(savedDay().textContent).toBe(
      formatShiftDay(suggestShiftDate({ startTime: "09:00" })),
    );
    expect(screen.queryByRole("button", { name: "+ Add to week" })).toBeNull();
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeNull();
  });

  it("offers the last seven days, and the shift moves to the one pressed", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();

    fireEvent.click(savedDay());
    const strip = within(document.querySelector(".wagez-day-strip"));
    const days = strip
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));

    expect(days).toHaveLength(7);
    expect(days.at(-1)).toBe(formatShiftDay(todayIsoDate()));
    expect(days[0]).toBe(formatShiftDay(addDays(todayIsoDate(), -6)));

    // The day pressed becomes the day it is saved to.
    const wanted = addDays(todayIsoDate(), -2);
    fireEvent.click(
      strip.getByRole("button", { name: formatShiftDay(wanted) }),
    );

    expect(savedDay().textContent).toBe(formatShiftDay(wanted));
  });

  it("marks no day at all when the shift sits outside the last week", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();

    const older = addDays(todayIsoDate(), -30);
    setDay(older);
    expect(savedDay().textContent).toBe(formatShiftDay(older));

    // The strip is the last seven days; a shift from a month ago is on none of
    // them, and the calendar underneath holds it instead.
    showDayStrip();
    const strip = within(document.querySelector(".wagez-day-strip"));
    expect(
      strip
        .getAllByRole("button")
        .some((day) => day.getAttribute("aria-pressed") === "true"),
    ).toBe(false);
    expect(screen.getByLabelText("Or pick a day").value).toBe(older);
  });

  it("closes the strip once a day is chosen", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();

    fireEvent.click(savedDay());
    expect(document.querySelector(".wagez-day-strip")).not.toBeNull();

    setDay(addDays(todayIsoDate(), -3));
    expect(document.querySelector(".wagez-day-strip")).toBeNull();
  });

  it("takes the whole thing back when Undo is pressed", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();

    undoSave();

    // Back to an unsaved answer, offering to save it again.
    expect(savedDay()).toBeNull();
    expect(
      screen.getByRole("button", { name: "+ Add to week" }),
    ).not.toBeNull();
  });

  it("stops offering to undo once the shift on screen has moved on", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();
    expect(savedDay()).not.toBeNull();

    // The answer this confirmation belongs to is no longer the one on screen.
    fireEvent.change(screen.getByLabelText("Stop minutes"), {
      target: { value: "30" },
    });

    expect(savedDay()).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.getByText(STALE_NOTE)).not.toBeNull();
  });

  it("clears the confirmation on reset", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    addToWeek();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(savedDay()).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
});
