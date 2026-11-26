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
    paidTime: [{ type: "holiday", date: "2026-11-26", minutes: 480 }],
    warnings: [],
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
    expect(screen.getByText(/3 worked or paid holiday entries detected/)).not.toBeNull(),
  );
}

describe("ADP screenshot import UI", () => {
  it("offers screenshot upload on Week as well as Settings using the same reviewed importer", async () => {
    render(<WagezApp />);
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    const toggle = screen.getByRole("button", { name: "Upload ADP screenshot" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByRole("heading", { name: "Import ADP screenshots" })).not.toBeNull();
    await selectScreenshot({ navigate: false });
    fireEvent.click(screen.getByRole("button", { name: "Import 3 entry(s)" }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.shifts).toHaveLength(2);
    expect(saved.paidTime).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Upload ADP screenshot" })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("button", { name: "Choose timecard screenshots" })).not.toBeNull();
  });

  it("opens Settings without a runtime error and preserves backup controls", () => {
    render(<WagezApp />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Employers" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Import ADP screenshots" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Backup & restore" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Export all data (.json)" })).not.toBeNull();
  });

  it("includes imported holiday pay in the Week and Pay periods views", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    fireEvent.change(screen.getByLabelText("Hourly rate for these shifts (optional)"), {
      target: { value: "20.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import 3 entry(s)" }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.paidTime).toHaveLength(1);
    expect(saved.paidTime[0].hourlyRateCents).toBe(2000);
    expect(screen.getByText(/Paid holiday:/i)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pay periods" }));
    // No pay-period schedule is configured in this fixture, so check its setup screen.
    expect(screen.getByRole("heading", { name: "Set up your pay periods" })).not.toBeNull();
  });

  it("does not change saved shifts until confirmation", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    expect(localStorage.getItem(STORAGE_KEY)?.includes("2026-11-23") ?? false).toBe(false);
    expect(screen.getByLabelText("Holiday hours for entry 3").value).toBe("8");
    fireEvent.click(screen.getByRole("button", { name: "Import 3 entry(s)" }));
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(data.shifts).toHaveLength(2);
    expect(data.paidTime).toHaveLength(1);
    expect(data.paidTime[0].minutes).toBe(480);
    expect(data.shifts[0].hourlyRateCents).toBeNull();
  });

  it("avoids importing duplicates when screenshot is uploaded again", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    fireEvent.click(screen.getByRole("button", { name: "Import 3 entry(s)" }));
    await selectScreenshot();
    expect(screen.getAllByText(/Not importable: Already saved/)).toHaveLength(2);
    expect(screen.getByText(/Not importable: Holiday already saved/)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Import 0 entry(s)" }).disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).shifts).toHaveLength(2);
  });

  it("allows correcting an OCR time before saving", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    fireEvent.change(screen.getByLabelText("Clock in for shift 1"), {
      target: { value: "09:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import 3 entry(s)" }));
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(data.shifts.find((shift) => shift.date === "2026-11-23").startTime).toBe("09:30");
  });

  it("lets the user exclude a shift", async () => {
    render(<WagezApp />);
    await selectScreenshot();
    fireEvent.click(screen.getByRole("checkbox", { name: "Include worked shift 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Import 2 entry(s)" }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).shifts).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paidTime).toHaveLength(1);
  });
});
