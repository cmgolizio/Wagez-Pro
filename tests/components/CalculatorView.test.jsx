// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import CalculatorView from "@/components/calculator/CalculatorView";

afterEach(cleanup);

/**
 * The live input display, i.e. the top third. Scoped to the display list: the
 * editor below it labels its fields with the same words.
 */
function currentValue(label) {
  const term = [...document.querySelectorAll("dl dt")].find(
    (dt) => dt.textContent === label,
  );
  return term === undefined ? null : term.nextElementSibling.textContent;
}

/** Labels in the display appear only once their value is entered. */
function displayedLabels() {
  return [...document.querySelectorAll("dt")].map((dt) => dt.textContent);
}

/**
 * Enter a canonical `"HH:MM"` through the segmented control, the way the
 * control is actually operated: hour, minute, then the half of the day.
 */
function setTime(label, time) {
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

function setRate(value) {
  fireEvent.change(screen.getByLabelText(/pay rate/i), { target: { value } });
}

function doMath() {
  fireEvent.click(screen.getByRole("button", { name: "Do Math." }));
}

const STALE_NOTE = "Inputs changed — Do Math. again.";

/** The result element, when it is currently marked stale. */
function staleResult() {
  return document.querySelector(".wagez-stale");
}

function enterShift({ start, end, rate }) {
  setTime("Start", start);
  setTime("Stop", end);
  if (rate !== undefined) setRate(rate);
}

describe("calculating a single shift", () => {
  it("shows entered values immediately, but no result until Do Math.", () => {
    render(<CalculatorView />);

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
    render(<CalculatorView />);

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
    render(<CalculatorView />);
    enterShift({ start: "09:15", end: "17:45", rate: "22.50" });
    doMath();

    expect(screen.getByText("8 hours + 30 min.")).not.toBeNull();
    expect(screen.getByText("$191.25")).not.toBeNull();
  });

  it("calculates an overnight shift", () => {
    render(<CalculatorView />);
    enterShift({ start: "22:00", end: "03:00", rate: "18" });
    doMath();

    expect(screen.getByText("5 hours.")).not.toBeNull();
    expect(screen.getByText("$90.00")).not.toBeNull();
  });

  it("reports time worked without inventing earnings when the rate is blank", () => {
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "17:00" });
    doMath();

    expect(screen.getByText("8 hours.")).not.toBeNull();
    expect(screen.queryByText("and made:")).toBeNull();
  });

  it("recalculates only when Do Math. is pressed again", () => {
    render(<CalculatorView />);
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
    render(<CalculatorView />);
    setTime("Stop", "17:00");
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "What time did you start?",
    );
    expect(screen.queryByText("You worked:")).toBeNull();
    expect(screen.getByLabelText("Start hour")).toBe(document.activeElement);
  });

  it("refuses to read an identical start and end as a 24-hour shift", () => {
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "09:00" });
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "Start and end time can't be the same.",
    );
    expect(screen.queryByText("You worked:")).toBeNull();
  });

  it("rejects a nonsense rate and clears the complaint once it is fixed", () => {
    render(<CalculatorView />);
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
    render(<CalculatorView />);
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
    render(<CalculatorView />);

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
    render(<CalculatorView />);
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
    render(<CalculatorView />);
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
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    setRate("20.00");
    expect(screen.queryByText(STALE_NOTE)).toBeNull();

    setTime("Start", "09:00");
    expect(screen.queryByText(STALE_NOTE)).toBeNull();
    expect(screen.getByText("$160.00")).not.toBeNull();
  });

  it("drops a stale result rather than staling it forever after a bad Do Math.", () => {
    render(<CalculatorView />);
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
    render(<CalculatorView />);
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
    render(<CalculatorView />);

    expect(displayedLabels()).toEqual([]);
    expect(screen.queryByText("Start:", { selector: "dt" })).toBeNull();
    // The editor is alone on the screen, so it draws itself at full size.
    expect(editorEntered()).toBe("0");
  });

  it("adds each label only as its own value is entered", () => {
    render(<CalculatorView />);

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
    render(<CalculatorView />);
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
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(editorEntered()).toBe("3");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(displayedLabels()).toEqual([]);
    expect(editorEntered()).toBe("0");
  });

  it("keeps the editor's own field labels visible at all times", () => {
    render(<CalculatorView />);

    // Nothing entered: no display labels, but every input is still labelled.
    expect(displayedLabels()).toEqual([]);
    expect(screen.getByRole("group", { name: "Start:" })).not.toBeNull();
    expect(screen.getByRole("group", { name: "Stop:" })).not.toBeNull();
    expect(screen.getByLabelText(/pay rate/i)).not.toBeNull();
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
    render(<CalculatorView />);
    expect(stage()).toEqual({ stage: "editing", peek: undefined });
  });

  it("hands the screen to the result once Do Math. succeeds", () => {
    render(<CalculatorView />);
    enterShift({ start: "16:00", end: "23:00", rate: "20" });
    expect(stage().stage).toBe("editing");

    doMath();

    expect(stage().stage).toBe("result");
    expect(screen.getByText("$140.00")).not.toBeNull();
    // Stepped back, the editor is one target rather than a set of controls.
    expect(editor().className).toContain("wagez-recallable");
  });

  it("keeps the screen on the inputs when Do Math. only finds a mistake", () => {
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "09:00" });
    doMath();

    expect(screen.getByRole("alert")).not.toBeNull();
    expect(stage().stage).toBe("editing");
  });

  it("brings the inputs part of the way back on hover, from either region", () => {
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    fireEvent.mouseEnter(editor());
    expect(stage()).toEqual({ stage: "result", peek: "true" });
    fireEvent.mouseLeave(editor());
    expect(stage().peek).toBeUndefined();

    fireEvent.mouseEnter(entered());
    expect(stage()).toEqual({ stage: "result", peek: "true" });
    fireEvent.mouseLeave(entered());
    expect(stage().peek).toBeUndefined();
  });

  it("hands the screen back when the shrunken editor is clicked", () => {
    render(<CalculatorView />);
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
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    fireEvent.click(entered());

    expect(stage()).toEqual({ stage: "editing", peek: undefined });
  });

  it("hands the screen back when the keyboard tabs into the editor", () => {
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();
    expect(stage().stage).toBe("result");

    // Focus reaching a control is the keyboard's version of clicking in.
    fireEvent.focus(screen.getByLabelText("Start hour"));

    expect(stage().stage).toBe("editing");
  });

  it("hands the screen back the moment the shift is edited", () => {
    render(<CalculatorView />);
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
    render(<CalculatorView />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    doMath();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(stage()).toEqual({ stage: "editing", peek: undefined });
    expect(displayedLabels()).toEqual([]);
  });
});

describe("arriving at Wagez", () => {
  it("puts the caret in the clock-in hour, ready for a number", () => {
    render(<CalculatorView />);

    expect(screen.getByLabelText("Start hour")).toBe(document.activeElement);
  });

  it("takes the first digit typed straight into the clock-in hour", () => {
    render(<CalculatorView />);

    // No aiming: whatever is focused on arrival is where the shift starts.
    fireEvent.change(document.activeElement, { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Start 0 minutes" }));

    expect(currentValue("Start:")).toBe("9:00 AM");
  });
});
