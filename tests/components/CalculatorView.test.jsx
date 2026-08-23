// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import CalculatorView from "@/components/calculator/CalculatorView";

afterEach(cleanup);

/** The live input display, i.e. the top third. */
function currentValue(label) {
  return screen.getByText(label).nextElementSibling.textContent;
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

function enterShift({ start, end, rate }) {
  setTime("Clocked-in", start);
  setTime("Clocked-out", end);
  if (rate !== undefined) setRate(rate);
}

describe("calculating a single shift", () => {
  it("shows entered values immediately, but no result until Do Math.", () => {
    render(<CalculatorView />);

    expect(currentValue("Clocked-in:")).toContain("Not set");

    enterShift({ start: "16:00", end: "23:00", rate: "20" });

    expect(currentValue("Clocked-in:")).toBe("4:00 PM");
    expect(currentValue("Clocked-out:")).toBe("11:00 PM");
    expect(currentValue("Pay rate:")).toBe("$20/hour");

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

    fireEvent.change(screen.getByLabelText("Clocked-in hour"), {
      target: { value: "9" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Clocked-in 0 minutes" }),
    );
    fireEvent.change(screen.getByLabelText("Clocked-out hour"), {
      target: { value: "5" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Clocked-out 30 minutes" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Clocked-out PM" }));

    // The top display followed every press, without a calculation.
    expect(currentValue("Clocked-in:")).toBe("9:00 AM");
    expect(currentValue("Clocked-out:")).toBe("5:30 PM");
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

    setTime("Clocked-out", "23:30");

    // The top display moved; the result did not recalculate on its own.
    expect(currentValue("Clocked-out:")).toBe("11:30 PM");
    expect(screen.getByText("7 hours.")).not.toBeNull();

    doMath();
    expect(screen.getByText("7 hours + 30 min.")).not.toBeNull();
    expect(screen.getByText("$150.00")).not.toBeNull();
  });
});

describe("invalid input", () => {
  it("asks for a missing clock-in time instead of calculating", () => {
    render(<CalculatorView />);
    setTime("Clocked-out", "17:00");
    doMath();

    expect(screen.getByRole("alert").textContent).toBe(
      "What time did you clock in?",
    );
    expect(screen.queryByText("You worked:")).toBeNull();
    expect(screen.getByLabelText("Clocked-in hour")).toBe(
      document.activeElement,
    );
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

    expect(currentValue("Clocked-in:")).toContain("Not set");
    expect(currentValue("Pay rate:")).toContain("Not set");
    expect(screen.getByLabelText("Clocked-in hour").value).toBe("");
    expect(screen.getByLabelText("Clocked-in minutes").value).toBe("");
    expect(screen.queryByText("You worked:")).toBeNull();
    expect(screen.queryByText("$160.00")).toBeNull();
  });
});
