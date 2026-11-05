// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { STORAGE_KEY, defaultWagezData } from "@/lib/storage/wagezStorage";
import { cleanupWagez, openWeek, reloadWagez } from "../helpers/wagez";

afterEach(cleanupWagez);

function makeBackup(count = 60) {
  const initial = defaultWagezData();
  initial.shifts = Array.from({ length: count }, (_, index) => {
    const day = new Date(Date.UTC(2026, 5, 1 + index))
      .toISOString().slice(0, 10);
    return {
      id: `imported-${index}`,
      date: day,
      startTime: "09:00",
      endTime: "17:00",
      hourlyRateCents: 2000,
      breakMinutes: 0,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
  });
  return initial;
}

describe("importing a saved history", () => {
  it("does not confuse reading a 60-shift file with actually restoring it", async () => {
    render(<WagezApp />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const backup = makeBackup();
    const mockFile = {
      size: 10000,
      text: async () => JSON.stringify(backup),
    };
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Choose Wagez backup"), {
        target: { files: [mockFile] },
      });
    });

    expect(screen.getByText(/Backup read: 60 shifts/)).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")?.shifts?.length ?? 0).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Confirm restore (60 shifts)" }));

    expect(screen.getByText(/Restored 60 shifts/)).not.toBeNull();
    expect(screen.getByLabelText("Saved weeks (60 shifts total)")).not.toBeNull();
    expect(document.querySelectorAll(".wagez-week-list > li").length).toBeGreaterThan(0);

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.shifts).toHaveLength(60);
    expect(saved.shifts[59].date).toBe("2026-07-30");

    reloadWagez();
    render(<WagezApp />);
    openWeek();
    const picker = screen.getByLabelText("Saved weeks (60 shifts total)");
    const last = [...picker.options].find((option) => option.value && option.textContent.includes("Jul"));
    expect(last).toBeDefined();
    fireEvent.change(picker, { target: { value: last.value } });
    expect(document.querySelectorAll(".wagez-week-list > li").length).toBeGreaterThan(0);
  });
});
