// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { STORAGE_KEY } from "@/lib/storage/wagezStorage";
import { cleanupWagez } from "../helpers/wagez";

afterEach(cleanupWagez);

describe("Pay periods navigation", () => {
  it("adds the new tab and configures recurring dates without altering shifts", () => {
    render(<WagezApp />);
    fireEvent.click(screen.getByRole("button", { name: "Pay periods" }));

    expect(screen.getByText("Set up your pay periods")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("First day of pay period"), {
      target: { value: "2026-10-24" },
    });
    fireEvent.change(screen.getByLabelText("Payday for that pay period"), {
      target: { value: "2026-11-13" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).settings.payPeriod).toEqual({
      anchorStart: "2026-10-24",
      anchorPayday: "2026-11-13",
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).shifts).toHaveLength(0);
    expect(screen.getByText("Scheduled payday")).not.toBeNull();
    expect(screen.getByText(/Week 1 ·/)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Previous pay period" }));
    expect(screen.getByText("Past pay period")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next pay period" }));
    expect(screen.getByText("Current pay period")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next pay period" }));
    expect(screen.getByText("Future pay period")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Go to current period" }));
    expect(screen.getByText("Current pay period")).not.toBeNull();
  });

  it("rejects a payday before the period has finished", () => {
    render(<WagezApp />);
    fireEvent.click(screen.getByRole("button", { name: "Pay periods" }));
    fireEvent.change(screen.getByLabelText("First day of pay period"), {
      target: { value: "2026-10-24" },
    });
    fireEvent.change(screen.getByLabelText("Payday for that pay period"), {
      target: { value: "2026-10-25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));
    expect(screen.getByRole("alert")).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)?.includes("payPeriod") ?? false).toBe(false);
  });
});
