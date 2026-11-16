// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { cleanupWagez, doMath, enterShift, resetShift } from "../helpers/wagez";

afterEach(cleanupWagez);

describe("optional tip field", () => {
  it("reveals and hides like Break, and clears the tip when hidden", () => {
    render(<WagezApp />);
    expect(screen.queryByLabelText("Tip in dollars")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tip" }));
    const input = screen.getByLabelText("Tip in dollars");
    fireEvent.change(input, { target: { value: "12.50" } });
    expect(input.value).toBe("12.50");
    expect(screen.getByText("$12.50")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Remove the tip" }));
    expect(screen.queryByLabelText("Tip in dollars")).toBeNull();
    expect(screen.queryByText("$12.50")).toBeNull();
  });

  it("adds tips to gross and resets the optional input for the next shift", () => {
    render(<WagezApp />);
    enterShift({ start: "09:00", end: "17:00", rate: "20" });
    fireEvent.click(screen.getByRole("button", { name: "Tip" }));
    fireEvent.change(screen.getByLabelText("Tip in dollars"), {
      target: { value: "35.25" },
    });
    doMath();

    expect(screen.getByText("$195.25")).not.toBeNull();
    expect(screen.getByText("Includes $35.25 tips")).not.toBeNull();

    resetShift();
    expect(screen.queryByLabelText("Tip in dollars")).toBeNull();
  });
});
