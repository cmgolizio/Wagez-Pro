// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WagezApp from "@/components/WagezApp";
import { STORAGE_KEY } from "@/lib/storage/wagezStorage";
import { cleanupWagez } from "../helpers/wagez";

vi.mock("@/lib/adp/screenshot", () => ({
  readAdpScreenshots: vi.fn(async () => ({
    shifts: [
      { date: "2026-11-23", startTime: "09:38", endTime: "17:05" },
      { date: "2026-11-24", startTime: "10:16", endTime: "17:10" },
    ],
    warnings: ["timecard.png: 2026-11-26: holiday is not a worked shift."],
  })),
}));

afterEach(cleanupWagez);

async function selectScreenshot({ navigate = true } = {}) {
  if (navigate) fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.change(screen.getByLabelText("Choose ADP timecard screenshots"), {
    target: {
      files: [new File(["image"], "timecard.png", { type: "image/png" })],
    },
  });
  await waitFor(() =>
    expect(screen.getByText(/2 worked shift\(s\) detected/)).not.toBeNull(),
  );
}

describe("ADP screenshot import UI", () => {
  it("does not change saved shifts until confirmation", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    expect(localStorage.getItem(STORAGE_KEY)?.includes("2026-11-23") ?? false).toBe(false);
    expect(screen.getByText(/holiday is not a worked shift/i)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Import 2 shift(s)" }));
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(data.shifts).toHaveLength(2);
    expect(data.shifts[0].hourlyRateCents).toBeNull();
  });

  it("avoids importing duplicates when screenshot is uploaded again", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    fireEvent.click(screen.getByRole("button", { name: "Import 2 shift(s)" }));
    await selectScreenshot();
    expect(screen.getAllByText(/Not importable: Already saved/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Import 0 shift(s)" }).disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).shifts).toHaveLength(2);
  });

  it("allows correcting an OCR time before saving", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    fireEvent.change(screen.getByLabelText("Clock in for shift 1"), {
      target: { value: "09:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import 2 shift(s)" }));
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(data.shifts.find((shift) => shift.date === "2026-11-23").startTime).toBe("09:30");
  });

  it("lets the user exclude a shift", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    fireEvent.click(screen.getByRole("checkbox", { name: "Include worked shift 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Import 1 shift(s)" }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).shifts).toHaveLength(1);
  });
});
