// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WagezApp from "@/components/WagezApp";
import { STORAGE_KEY } from "@/lib/storage/wagezStorage";
import { cleanupWagez } from "../helpers/wagez";

vi.mock("@/lib/adp/timecard", async (importOriginal) => ({
  ...(await importOriginal()),
  readAdpPdf: vi.fn(async () => ({
    shifts: [{
      date: "2026-11-06",
      startTime: "09:18",
      endTime: "16:57",
    }],
    warnings: [],
    reportedTotalHours: 7.65,
  })),
}));

afterEach(cleanupWagez);

async function chooseSample() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  const file = new File(["sample"], "timecard.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("Choose ADP timecard PDF files"), {
    target: { files: [file] },
  });
  await waitFor(() =>
    expect(screen.getByText(/1 unique punch pair/)).not.toBeNull(),
  );
}

describe("ADP PDF import UI", () => {
  it("does not write before confirmation and appends after approval", async () => {
    render(<WagezApp />);
    await chooseSample();

    expect(localStorage.getItem(STORAGE_KEY)?.includes("2026-11-06") ?? false).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Import 1 shift(s)" }));

    expect(screen.getByText(/Imported 1 shifts/)).not.toBeNull();
    expect(document.querySelectorAll(".wagez-week-list > li")).toHaveLength(1);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.shifts).toHaveLength(1);
    expect(saved.shifts[0].hourlyRateCents).toBeNull();
  });

  it("identifies repeated timecards as duplicates instead of adding shifts", async () => {
    render(<WagezApp />);
    await chooseSample();
    fireEvent.click(screen.getByRole("button", { name: "Import 1 shift(s)" }));

    await chooseSample();
    expect(screen.getByText(/Skipped: Already saved/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Import 0 shift(s)" }).disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).shifts).toHaveLength(1);
  });
});
