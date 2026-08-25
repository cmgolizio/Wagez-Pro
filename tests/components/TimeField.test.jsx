// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import TimeField from "@/components/calculator/TimeField";

afterEach(cleanup);

const LABEL = "Start:";
/** What a screen reader hears — the visible label without its colon. */
const NAME = "Start";

/** A stand-in for the draft above: the time lives outside the control. */
function Harness({ initial = "", error }) {
  const [value, setValue] = useState(initial);

  return (
    <>
      <TimeField
        id='start-time'
        label={LABEL}
        value={value}
        error={error}
        onChange={setValue}
      />
      <output data-testid='published'>{value}</output>
      <button type='button' onClick={() => setValue("")}>
        Clear
      </button>
    </>
  );
}

const hour = () => screen.getByLabelText(`${NAME} hour`);
const minute = () => screen.getByLabelText(`${NAME} minutes`);
const published = () => screen.getByTestId("published").textContent;

/** Type into a segment the way a person does: the first digit replaces it. */
function typeSegment(input, digits) {
  input.focus();
  if (digits === "") {
    fireEvent.change(input, { target: { value: "" } });
    return;
  }
  [...digits].forEach((digit, index) => {
    fireEvent.change(input, {
      target: { value: index === 0 ? digit : input.value + digit },
    });
  });
}

function pressMeridiem(meridiem) {
  fireEvent.click(screen.getByRole("button", { name: `${NAME} ${meridiem}` }));
}

describe("entering a time", () => {
  it("publishes the time as soon as the segments make one", () => {
    render(<Harness />);

    typeSegment(hour(), "4");
    // An hour on its own is not a time yet — nothing is invented.
    expect(published()).toBe("");

    typeSegment(minute(), "15");
    expect(published()).toBe("04:15");

    pressMeridiem("PM");
    expect(published()).toBe("16:15");
  });

  it("moves to the next segment once one is full", () => {
    render(<Harness />);

    typeSegment(hour(), "4");
    expect(document.activeElement).toBe(minute());

    typeSegment(minute(), "30");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: `${NAME} AM` }),
    );
  });

  it("waits on an hour that could still grow", () => {
    render(<Harness />);

    typeSegment(hour(), "1");
    expect(hour().value).toBe("1");
    expect(document.activeElement).toBe(hour());

    typeSegment(hour(), "12");
    expect(hour().value).toBe("12");
    expect(document.activeElement).toBe(minute());
  });

  it("reads a 24-hour hour as the afternoon", () => {
    render(<Harness />);

    typeSegment(hour(), "16");
    typeSegment(minute(), "45");

    expect(hour().value).toBe("4");
    expect(screen.getByRole("button", { name: `${NAME} PM` })).toHaveProperty(
      "ariaPressed",
      "true",
    );
    expect(published()).toBe("16:45");
  });

  it("accepts any minute of the hour", () => {
    render(<Harness />);

    typeSegment(hour(), "9");
    typeSegment(minute(), "07");
    expect(published()).toBe("09:07");

    typeSegment(minute(), "59");
    expect(published()).toBe("09:59");
  });

  it("keeps a half-typed minute from publishing a wrong time", () => {
    render(<Harness />);

    typeSegment(hour(), "4");
    typeSegment(minute(), "15");
    expect(published()).toBe("04:15");

    typeSegment(minute(), "");
    expect(published()).toBe("");
  });

  it("pads a single-digit minute once the user leaves", () => {
    render(<Harness />);

    typeSegment(hour(), "4");
    typeSegment(minute(), "5");
    expect(published()).toBe("04:05");

    // Moving between segments is not leaving.
    fireEvent.focusOut(minute(), { relatedTarget: hour() });
    expect(minute().value).toBe("5");

    fireEvent.focusOut(minute(), { relatedTarget: null });
    expect(minute().value).toBe("05");
    expect(published()).toBe("04:05");
  });

  it("reads a lone zero hour as midnight once the user leaves", () => {
    render(<Harness />);

    typeSegment(hour(), "0");
    typeSegment(minute(), "30");
    expect(published()).toBe("");

    fireEvent.focusOut(hour(), { relatedTarget: null });
    expect(hour().value).toBe("12");
    expect(published()).toBe("00:30");
  });
});

describe("quick minutes", () => {
  it("sets the minute with one press", () => {
    render(<Harness />);

    typeSegment(hour(), "9");
    fireEvent.click(screen.getByRole("button", { name: `${NAME} 30 minutes` }));

    expect(minute().value).toBe("30");
    expect(published()).toBe("09:30");
  });

  it("marks the quarter the time is already on", () => {
    render(<Harness initial='17:45' />);

    expect(
      screen.getByRole("button", { name: `${NAME} 45 minutes` }),
    ).toHaveProperty("ariaPressed", "true");
    expect(
      screen.getByRole("button", { name: `${NAME} 15 minutes` }),
    ).toHaveProperty("ariaPressed", "false");
  });
});

describe("keyboard", () => {
  it("steps the hour and the minute with the arrow keys", () => {
    render(<Harness initial='16:15' />);

    fireEvent.keyDown(hour(), { key: "ArrowUp" });
    expect(published()).toBe("17:15");

    fireEvent.keyDown(hour(), { key: "ArrowDown" });
    fireEvent.keyDown(hour(), { key: "ArrowDown" });
    expect(published()).toBe("15:15");

    fireEvent.keyDown(minute(), { key: "ArrowDown" });
    expect(published()).toBe("15:14");
  });

  it("wraps the clock rather than running out of hours", () => {
    render(<Harness initial='12:00' />);

    fireEvent.keyDown(hour(), { key: "ArrowUp" });
    expect(published()).toBe("13:00");

    fireEvent.keyDown(minute(), { key: "ArrowDown" });
    expect(published()).toBe("13:59");
  });

  it("sets the half of the day from the keyboard", () => {
    render(<Harness initial='09:00' />);

    fireEvent.keyDown(hour(), { key: "p" });
    expect(published()).toBe("21:00");

    fireEvent.keyDown(minute(), { key: "a" });
    expect(published()).toBe("09:00");

    fireEvent.keyDown(screen.getByRole("button", { name: `${NAME} AM` }), {
      key: "ArrowUp",
    });
    expect(published()).toBe("21:00");
  });

  it("moves between segments with the left and right arrows", () => {
    render(<Harness initial='16:15' />);

    hour().focus();
    fireEvent.keyDown(hour(), { key: "ArrowRight" });
    expect(document.activeElement).toBe(minute());

    fireEvent.keyDown(minute(), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(hour());
  });
});

describe("Now", () => {
  it("fills in the current time, to the minute", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 7, 23, 16, 15, 42));

    try {
      render(<Harness />);
      fireEvent.click(
        screen.getByRole("button", { name: `Set ${NAME} to now` }),
      );

      expect(published()).toBe("16:15");
      expect(hour().value).toBe("4");
      expect(minute().value).toBe("15");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the time above", () => {
  it("follows the draft when it changes elsewhere", () => {
    render(<Harness initial='16:15' />);
    expect(hour().value).toBe("4");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(hour().value).toBe("");
    expect(minute().value).toBe("");
    expect(published()).toBe("");
  });
});

describe("accessibility", () => {
  it("labels every segment and groups them under the field name", () => {
    render(<Harness initial='16:15' />);

    expect(hour()).not.toBeNull();
    expect(minute()).not.toBeNull();
    expect(screen.getByRole("group", { name: LABEL })).not.toBeNull();
    expect(
      screen.getByRole("group", { name: `${NAME} AM or PM` }),
    ).not.toBeNull();
  });

  it("points the segments at the error when there is one", () => {
    render(<Harness error='What time did you start?' />);

    expect(screen.getByRole("alert").textContent).toBe(
      "What time did you start?",
    );
    expect(hour().getAttribute("aria-invalid")).toBe("true");
    expect(hour().getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").id,
    );
  });
});
