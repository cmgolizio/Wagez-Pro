// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WagezApp from "@/components/WagezApp";
import { addDays, startOfWeek, todayIsoDate } from "@/lib/dates/isoDate";

import {
  addToWeek,
  cleanupWagez,
  doMath,
  enterShift,
  freezeClock,
  openWeek,
  resetShift,
  setDay,
  toggleOvertime,
} from "../helpers/wagez";

// Which week is "this week" depends on the day it is asked on.
freezeClock();

afterEach(() => {
  cleanupWagez();
  restoreNavigator();
});

const WEEK_START = startOfWeek(todayIsoDate());

/** A day inside the week Wagez opens on. */
const day = (offset) => addDays(WEEK_START, offset);

/**
 * Devices differ in what they will do with a piece of text, so the tests say
 * which device they are on. Everything is put back afterwards.
 */
function stub(name, value) {
  Object.defineProperty(navigator, name, { value, configurable: true });
}

/** A phone: it has a share sheet of its own. */
function withShareSheet(share) {
  stub("share", share);
}

/** A desktop browser: no sheet, but a clipboard. */
function withoutShareSheet() {
  stub("share", undefined);
}

function withClipboard(writeText) {
  stub("clipboard", { writeText });
}

/** A browser that will not hand anything to the clipboard. */
function withoutClipboard() {
  stub("clipboard", undefined);
}

function restoreNavigator() {
  delete navigator.share;
  delete navigator.clipboard;
}

const shareButton = () => screen.getByRole("button", { name: "Share" });

const shareState = () => document.querySelector(".wagez-share-state");

/** Enter a shift, do the math and put it in the week on a given day. */
function saveShift({ date, start = "09:00", end = "17:00", rate = "20" }) {
  resetShift();
  enterShift({ start, end, rate });
  doMath();
  addToWeek();
  setDay(date);
}

/** A week with something in it, seen in the week view. */
function weekWithAShift() {
  render(<WagezApp />);
  saveShift({ date: day(1) });
  openWeek();
}

describe("there is nothing to share until there is a week", () => {
  it("offers no Share action on an empty week", () => {
    render(<WagezApp />);
    openWeek();

    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
  });

  it("offers one as soon as a shift is saved", () => {
    weekWithAShift();

    expect(shareButton()).not.toBeNull();
  });
});

describe("a device with a share sheet of its own", () => {
  it("hands the week to the sheet, and says it went", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    withShareSheet(share);
    weekWithAShift();

    fireEvent.click(shareButton());
    await screen.findByText("Shared.");

    expect(share).toHaveBeenCalledTimes(1);
    const [{ title, text }] = share.mock.calls[0];
    expect(title).toBe("Wagez");
    expect(text).toContain("1 shift");
    expect(text).toContain("8h");
    expect(text).toContain("$160.00 gross");
  });

  it("does nothing behind the user's back when they close the sheet", async () => {
    const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
    const writeText = vi.fn().mockResolvedValue(undefined);
    withShareSheet(vi.fn().mockRejectedValue(abort));
    withClipboard(writeText);
    weekWithAShift();

    fireEvent.click(shareButton());
    await Promise.resolve();

    expect(writeText).not.toHaveBeenCalled();
    expect(shareState().textContent).toBe("");
  });

  it("falls back to the clipboard when the sheet itself fails", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    withShareSheet(vi.fn().mockRejectedValue(new Error("no target")));
    withClipboard(writeText);
    weekWithAShift();

    fireEvent.click(shareButton());
    await screen.findByText("Copied.");

    expect(writeText).toHaveBeenCalledTimes(1);
  });
});

describe("a device without one", () => {
  it("copies the week instead, and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    withoutShareSheet();
    withClipboard(writeText);
    weekWithAShift();

    fireEvent.click(shareButton());
    await screen.findByText("Copied.");

    const [text] = writeText.mock.calls[0];
    expect(text).toContain("1 shift");
    expect(text).toContain("$160.00 gross");
  });

  it("puts the week on screen when there is no clipboard at all", async () => {
    withoutShareSheet();
    withoutClipboard();
    weekWithAShift();

    fireEvent.click(shareButton());
    await screen.findByText("Copy this:");

    const field = screen.getByLabelText("Week summary");
    expect(field.value).toContain("1 shift");
    expect(field.value).toContain("$160.00 gross");
    // Ready to be copied by hand, which is the whole point of showing it.
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(field.value.length);
  });

  it("does the same when the clipboard refuses", async () => {
    withoutShareSheet();
    withClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    weekWithAShift();

    fireEvent.click(shareButton());
    await screen.findByText("Copy this:");

    expect(screen.getByLabelText("Week summary").value).toContain("1 shift");
  });
});

describe("what gets shared is what the week says", () => {
  it("counts every shift in the week, and nothing outside it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    withoutShareSheet();
    withClipboard(writeText);

    render(<WagezApp />);
    saveShift({ date: day(1) });
    saveShift({ date: day(3), start: "17:00", end: "22:00" });
    // Next week's shift belongs to next week's summary.
    saveShift({ date: day(8) });
    openWeek();

    fireEvent.click(shareButton());
    await screen.findByText("Copied.");

    const [text] = writeText.mock.calls[0];
    expect(text).toContain("2 shifts");
    expect(text).toContain("13h");
    expect(text).toContain("$260.00 gross");
  });

  it("carries the overtime split once overtime is switched on", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    withoutShareSheet();
    withClipboard(writeText);

    render(<WagezApp />);
    for (let offset = 1; offset <= 4; offset += 1)
      saveShift({ date: day(offset) });
    saveShift({ date: day(5), start: "09:00", end: "19:00" });
    openWeek();
    toggleOvertime();

    fireEvent.click(shareButton());
    await screen.findByText("Copied.");

    const [text] = writeText.mock.calls[0];
    expect(text).toContain("Regular 40h");
    expect(text).toContain("Overtime 2h at 1.5×");
    expect(text).toContain("$860.00 gross");
  });

  it("reads the same week the summary on screen does", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    withoutShareSheet();
    withClipboard(writeText);
    weekWithAShift();

    fireEvent.click(shareButton());
    await screen.findByText("Copied.");

    const summary = within(document.querySelector(".wagez-week-summary"));
    const [text] = writeText.mock.calls[0];
    expect(summary.getByText("1 shift")).not.toBeNull();
    expect(summary.getByText("$160.00")).not.toBeNull();
    expect(text).toContain("1 shift");
    expect(text).toContain("$160.00 gross");
  });
});

describe("the confirmation belongs to the press", () => {
  it("goes away when the week does", async () => {
    withoutShareSheet();
    withClipboard(vi.fn().mockResolvedValue(undefined));

    render(<WagezApp />);
    saveShift({ date: day(1) });
    saveShift({ date: day(8) });
    openWeek();

    fireEvent.click(shareButton());
    await screen.findByText("Copied.");

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));

    expect(shareState().textContent).toBe("");
  });

  it("goes away when the week it confirmed is edited", async () => {
    withoutShareSheet();
    withClipboard(vi.fn().mockResolvedValue(undefined));
    weekWithAShift();

    fireEvent.click(shareButton());
    await screen.findByText("Copied.");

    // A second shift makes this a different week from the one just copied.
    fireEvent.click(screen.getByRole("button", { name: /^Duplicate / }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(shareState().textContent).toBe("");
  });
});
