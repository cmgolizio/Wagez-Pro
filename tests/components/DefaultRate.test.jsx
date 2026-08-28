// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { STORAGE_KEY } from "@/lib/storage/wagezStorage";

import {
  RATE_LABEL,
  addToWeek,
  cleanupWagez,
  currentValue,
  defaultRateToggle,
  displayedLabels,
  doMath,
  enterShift,
  keepRateAsDefault,
  openWeek,
  reloadWagez,
  resetShift,
  revealToggle,
  setRate,
  setTime,
  showRate,
} from "../helpers/wagez";

afterEach(cleanupWagez);

/** What the device is holding right now, as Wagez wrote it. */
function storedSettings() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)).settings;
}

/** Somebody who has already told Wagez what they earn, on a fresh page. */
function openWagezEarning(rate) {
  render(<WagezApp />);
  setRate(rate);
  keepRateAsDefault();
  reloadWagez();
  render(<WagezApp />);
}

describe("keeping a rate", () => {
  it("offers nothing to keep until there is a rate to keep", () => {
    render(<WagezApp />);

    // The toggle belongs to the rate, so it arrives with the field.
    expect(defaultRateToggle()).toBeNull();

    showRate();
    expect(defaultRateToggle().disabled).toBe(true);
    expect(defaultRateToggle().getAttribute("aria-pressed")).toBe("false");

    setRate("22");
    expect(defaultRateToggle().disabled).toBe(false);
  });

  it("writes the rate to the device when it is pressed", () => {
    render(<WagezApp />);

    setRate("22.50");
    keepRateAsDefault();

    expect(defaultRateToggle().getAttribute("aria-pressed")).toBe("true");
    expect(storedSettings().defaultHourlyRateCents).toBe(2250);
  });

  it("does not touch the shift on screen", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", rate: "22" });
    keepRateAsDefault();

    expect(currentValue("Pay Rate:")).toBe("$22/hour");
    expect(screen.queryByText("You worked:")).toBeNull();

    doMath();
    expect(screen.getByText("$176.00")).not.toBeNull();
  });

  it("forgets it again when it is pressed a second time", () => {
    render(<WagezApp />);

    setRate("22");
    keepRateAsDefault();
    expect(storedSettings().defaultHourlyRateCents).toBe(2200);

    keepRateAsDefault();

    expect(defaultRateToggle().getAttribute("aria-pressed")).toBe("false");
    expect(storedSettings().defaultHourlyRateCents).toBeNull();
    // The rate itself is still on screen — only the keeping of it stopped.
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("22");
  });
});

describe("a rate that survives the device being closed", () => {
  it("opens the next shift on it", () => {
    openWagezEarning("22");

    expect(screen.getByLabelText(RATE_LABEL).value).toBe("22");
    expect(currentValue("Pay Rate:")).toBe("$22/hour");
    expect(defaultRateToggle().getAttribute("aria-pressed")).toBe("true");
  });

  it("reads a decimal rate back exactly as it was saved", () => {
    openWagezEarning("18.75");

    expect(screen.getByLabelText(RATE_LABEL).value).toBe("18.75");
    expect(defaultRateToggle().getAttribute("aria-pressed")).toBe("true");

    enterShift({ start: "09:00", end: "17:00" });
    doMath();
    expect(screen.getByText("$150.00")).not.toBeNull();
  });

  it("leaves the caret in the clock-in hour, not in the rate it filled in", () => {
    openWagezEarning("22");

    // The rate was not asked for, it was simply there — so the first thing
    // typed still lands where a shift starts.
    expect(document.activeElement).toBe(screen.getByLabelText("Start hour"));
  });

  it("still has the times empty — only the rate carries over", () => {
    openWagezEarning("22");

    expect(screen.getByLabelText("Start hour").value).toBe("");
    expect(displayedLabels()).toEqual(["Pay Rate:"]);
  });

  it("calculates straight away, with nothing to type but the hours", () => {
    openWagezEarning("22");

    enterShift({ start: "16:00", end: "23:30" });
    doMath();

    expect(screen.getByText("7 hours + 30 min.")).not.toBeNull();
    expect(screen.getByText("$165.00")).not.toBeNull();
  });
});

describe("a shift that pays something else", () => {
  it("takes the override without changing what Wagez opens on", () => {
    openWagezEarning("22");

    setRate("30");

    // The rate on screen is no longer the kept one, and says so.
    expect(defaultRateToggle().getAttribute("aria-pressed")).toBe("false");
    expect(storedSettings().defaultHourlyRateCents).toBe(2200);

    doMath();
    reloadWagez();
    render(<WagezApp />);

    expect(screen.getByLabelText(RATE_LABEL).value).toBe("22");
  });

  it("keeps the override for the shift it was saved with", () => {
    openWagezEarning("22");

    enterShift({ start: "09:00", end: "17:00", rate: "30" });
    doMath();
    addToWeek();
    openWeek();

    expect(
      within(document.querySelector(".wagez-shift-card")).getByText("$240.00"),
    ).not.toBeNull();
  });

  it("becomes the kept rate only when it is asked to", () => {
    openWagezEarning("22");

    setRate("30");
    keepRateAsDefault();

    expect(storedSettings().defaultHourlyRateCents).toBe(3000);

    reloadWagez();
    render(<WagezApp />);
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("30");
  });

  it("leaves the kept rate alone when a saved shift's rate is edited", () => {
    openWagezEarning("22");

    enterShift({ start: "09:00", end: "17:00" });
    doMath();
    addToWeek();
    openWeek();

    const card = document.querySelector(".wagez-shift-card");
    fireEvent.click(within(card).getByRole("button", { name: /^Edit/ }));
    fireEvent.change(within(card).getByLabelText(RATE_LABEL), {
      target: { value: "40" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "Save" }));

    expect(
      within(document.querySelector(".wagez-shift-card")).getByText("$320.00"),
    ).not.toBeNull();
    expect(storedSettings().defaultHourlyRateCents).toBe(2200);
  });
});

describe("starting the next shift", () => {
  it("puts the kept rate back on reset", () => {
    openWagezEarning("22");

    enterShift({ start: "09:00", end: "17:00", rate: "30" });
    doMath();
    resetShift();

    expect(screen.getByLabelText(RATE_LABEL).value).toBe("22");
    expect(displayedLabels()).toEqual(["Pay Rate:"]);
    expect(screen.getByLabelText("Start hour").value).toBe("");
    expect(screen.queryByText("You worked:")).toBeNull();
  });

  it("does not chase the caret into the rate it puts back on reset", () => {
    openWagezEarning("22");

    enterShift({ start: "09:00", end: "17:00" });
    resetShift();

    expect(document.activeElement).not.toBe(screen.getByLabelText(RATE_LABEL));
  });

  it("comes back empty on reset when nothing is being kept", () => {
    render(<WagezApp />);

    enterShift({ start: "09:00", end: "17:00", rate: "30" });
    resetShift();

    expect(screen.queryByLabelText(RATE_LABEL)).toBeNull();
    expect(displayedLabels()).toEqual([]);
  });

  it("does not bring the rate back when it was taken away for this shift", () => {
    openWagezEarning("22");

    fireEvent.click(revealToggle("hourly-rate"));

    // Gone for this shift, and gone from the answer with it.
    expect(screen.queryByLabelText(RATE_LABEL)).toBeNull();
    setTime("Start", "09:00");
    setTime("Stop", "17:00");
    doMath();
    expect(screen.queryByText("and made:")).toBeNull();

    // Still kept, though: the next shift opens on it again.
    expect(storedSettings().defaultHourlyRateCents).toBe(2200);
    resetShift();
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("22");
  });
});

describe("a rate the device cannot be trusted on", () => {
  it("opens on nothing rather than on nonsense", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        settings: { defaultHourlyRateCents: "twenty-two" },
        shifts: [],
      }),
    );

    render(<WagezApp />);

    expect(screen.queryByLabelText(RATE_LABEL)).toBeNull();
    expect(displayedLabels()).toEqual([]);
  });
});
