// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WagezApp from "@/components/WagezApp";
import { resetWagezStore } from "@/lib/storage/wagezStore";
import {
  STORAGE_KEY,
  defaultWagezData,
} from "@/lib/storage/wagezStorage";

import {
  RATE_LABEL,
  cleanupWagez,
  openShift,
  setRate,
} from "../helpers/wagez";

afterEach(cleanupWagez);

const CAFE = { id: "cafe", name: "Cafe", hourlyRateCents: 2200 };
const BAR = { id: "bar", name: "Bar", hourlyRateCents: 3100 };

function seed(employers, defaultEmployerId = null) {
  const data = defaultWagezData();
  data.employers = employers;
  data.settings.defaultEmployerId = defaultEmployerId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  resetWagezStore();
}

function selectedEmployer() {
  return screen.getByLabelText("Employer (optional)").value;
}

function selectDefault(name) {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  const employer = within(screen.getByRole("list")).getByText(name).closest("li");
  fireEvent.click(within(employer).getByRole("button", { name: "Make default" }));
  openShift();
}

describe("default employer prefill", () => {
  it("loads the saved default employer and its rate on first app opening", () => {
    seed([CAFE], "cafe");
    render(<WagezApp />);

    expect(selectedEmployer()).toBe("cafe");
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("22");
  });

  it("applies a default set while the calculator remains mounted", () => {
    seed([CAFE]);
    render(<WagezApp />);

    expect(selectedEmployer()).toBe("");
    selectDefault("Cafe");
    expect(selectedEmployer()).toBe("cafe");
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("22");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(selectedEmployer()).toBe("cafe");
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("22");
  });

  it("preserves a manually chosen employer when the default changes", () => {
    seed([CAFE, BAR], "cafe");
    render(<WagezApp />);

    fireEvent.change(screen.getByLabelText("Employer (optional)"), {
      target: { value: "bar" },
    });
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("31");

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Unset default" }));
    const cafe = within(screen.getByRole("list")).getByText("Cafe").closest("li");
    fireEvent.click(within(cafe).getByRole("button", { name: "Make default" }));
    openShift();

    expect(selectedEmployer()).toBe("bar");
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("31");
  });

  it("prefills new default employer but preserves a manually typed rate", () => {
    seed([CAFE]);
    render(<WagezApp />);

    setRate("45");
    selectDefault("Cafe");

    expect(selectedEmployer()).toBe("cafe");
    expect(screen.getByLabelText(RATE_LABEL).value).toBe("45");
  });

  it("never shows the optional selector until an employer exists", () => {
    render(<WagezApp />);
    expect(screen.queryByLabelText("Employer (optional)")).toBeNull();
  });
});
