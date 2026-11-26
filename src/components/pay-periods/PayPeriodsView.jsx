"use client";

import { useEffect, useState } from "react";

import { addDays, todayIsoDate } from "@/lib/dates/isoDate";
import { formatCents } from "@/lib/formatters/currency";
import { companyGroups } from "@/lib/employers/company";
import { formatDurationCompact } from "@/lib/formatters/duration";
import { formatShiftDay, formatWeekRange } from "@/lib/formatters/date";
import {
  normalizePayPeriod,
  payPeriodDetails,
  periodForDate,
} from "@/lib/pay-periods/biweekly";

function amount(value) {
  return value === null ? "Not available" : formatCents(value);
}

function PeriodWeek({ number, week }) {
  return (
    <div className="wagez-shift-card flex flex-col gap-1">
      <p className="font-extrabold">Week {number} · {formatWeekRange(week.start)}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {week.totals.shiftCount} {week.totals.shiftCount === 1 ? "shift" : "shifts"} ·{" "}
          {formatDurationCompact(week.totals.paidMinutes)}
        </span>
        <span className="font-extrabold">{amount(week.totals.payCents)}</span>
      </div>
      {week.totals.holidayCount > 0 ? (
        <p className="text-sm font-semibold">Paid HOLIDAY: {(week.totals.holidayMinutes / 60).toFixed(2)}h · {week.totals.holidayPayCents === null ? "Rate missing" : formatCents(week.totals.holidayPayCents)}</p>
      ) : null}
      {week.totals.tipCents > 0 ? (
        <p className="text-sm font-semibold">Includes {formatCents(week.totals.tipCents)} tips</p>
      ) : null}
    </div>
  );
}

/**
 * One employer-independent 14-day cycle, configured by its starting day and
 * a KNOWN payday. The whole sequence in both directions is derived, not saved.
 * Only the two anchor dates are persisted in Wagez's existing settings.
 */
export default function PayPeriodsView({
  shifts = [],
  paidTime = [],
  employers = [],
  settings,
  ready,
  onSetPayPeriod,
}) {
  const schedule = normalizePayPeriod(settings.payPeriod);
  const [showConfig, setShowConfig] = useState(false);
  const [start, setStart] = useState(settings.payPeriod?.anchorStart ?? "");
  const [payday, setPayday] = useState(settings.payPeriod?.anchorPayday ?? "");
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [employerFilter, setEmployerFilter] = useState("all");

  useEffect(() => {
    setStart(settings.payPeriod?.anchorStart ?? "");
    setPayday(settings.payPeriod?.anchorPayday ?? "");
  }, [settings.payPeriod?.anchorStart, settings.payPeriod?.anchorPayday]);

  function saveSchedule(event) {
    event.preventDefault();
    const normalized = normalizePayPeriod({
      anchorStart: start,
      anchorPayday: payday,
    });
    if (!normalized) {
      setError(
        "Choose the first day of a known 14-day pay period and its payday. Payday must be on or after that period's last day.",
      );
      return;
    }
    if (onSetPayPeriod(normalized) === false) {
      setError("Wagez couldn't save your schedule on this device.");
      return;
    }
    setError("");
    setOffset(0);
    setShowConfig(false);
  }

  if (!ready) return (
    <section className="wagez-week flex min-h-0 flex-1 flex-col" />
  );

  const today = todayIsoDate();
  const currentPeriod = schedule ? periodForDate(today, schedule) : null;
  const displayedDate = currentPeriod
    ? addDays(currentPeriod.start, offset * 14)
    : null;
  const details = displayedDate
    ? payPeriodDetails(shifts, schedule, displayedDate, {
        overtime: settings.overtime,
        weekStartsOn: settings.weekStartsOn,
        employerId: employerFilter,
        employers,
        paidTime,
      })
    : null;

  return (
    <section className="wagez-week flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <h2 className="sr-only">Pay periods</h2>

      {!schedule || showConfig ? (
        <form className="wagez-shift-card flex flex-col gap-3" onSubmit={saveSchedule}>
          <h3 className="text-xl font-extrabold">
            {schedule ? "Change pay schedule" : "Set up your pay periods"}
          </h3>
          <p className="text-sm font-semibold">
            Choose the first day of any known two-week pay period and the
            payday for those two weeks. Wagez will repeat both dates every
            14 days, backward and forward.
          </p>

          <div className="flex flex-col gap-1">
            <label className="wagez-field-label" htmlFor="period-anchor-start">
              First day of a known pay period
            </label>
            <div className="wagez-field">
              <input
                id="period-anchor-start"
                aria-label="First day of pay period"
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="wagez-field-label" htmlFor="period-anchor-payday">
              Payday for that pay period
            </label>
            <div className="wagez-field">
              <input
                id="period-anchor-payday"
                aria-label="Payday for that pay period"
                type="date"
                value={payday}
                onChange={(event) => setPayday(event.target.value)}
                required
              />
            </div>
          </div>

          {error ? <p role="alert" className="wagez-alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button className="wagez-do-math" type="submit">Save schedule</button>
            {schedule ? (
              <button
                className="wagez-quiet-button"
                type="button"
                onClick={() => {
                  setShowConfig(false);
                  setError("");
                  setStart(schedule.anchorStart);
                  setPayday(schedule.anchorPayday);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
          <p className="text-xs font-semibold">
            Paydays are a repeating estimate. Bank holidays, weekend
            adjustments, and payroll changes are not automatically detected.
          </p>
        </form>
      ) : null}

      {details ? (
        <>
          <nav className="wagez-week-nav" aria-label="Pay period">
            <button
              className="wagez-quiet-button"
              type="button"
              aria-label="Previous pay period"
              onClick={() => setOffset((value) => value - 1)}
            >
              ‹
            </button>
            <p className="wagez-week-label">
              <span className="wagez-week-name">
                {offset === 0 ? "Current pay period" : (
                  offset < 0 ? "Past pay period" : "Future pay period"
                )}
              </span>
              <span className="wagez-week-range">
                {formatShiftDay(details.start)} – {formatShiftDay(details.end)}
              </span>
            </p>
            <button
              className="wagez-quiet-button"
              type="button"
              aria-label="Next pay period"
              onClick={() => setOffset((value) => value + 1)}
            >
              ›
            </button>
          </nav>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                className="wagez-inline-button"
                type="button"
                onClick={() => setOffset(0)}
              >
                Go to current period
              </button>
              <button
                className="wagez-inline-button"
                type="button"
                onClick={() => setShowConfig((value) => !value)}
              >
                {showConfig ? "Hide schedule" : "Change schedule"}
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="wagez-field-label" htmlFor="period-employer">
                Earnings from company or rate profile
              </label>
              <div className="wagez-field">
                <select
                  id="period-employer"
                  className="w-full min-h-10 bg-transparent font-bold"
                  value={employerFilter}
                  onChange={(event) => setEmployerFilter(event.target.value)}
                >
                  <option value="all">All employers</option>
                  <option value="none">No employer assigned</option>
                  <optgroup label="Companies (all rates)">
                    {companyGroups(employers).map((group) => (
                      <option key={group.key} value={`company:${group.key}`}>
                        {group.name} ({group.profileIds.length} {group.profileIds.length === 1 ? "rate" : "rates"})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Individual rate profiles">
                    {employers.map((employer) => (
                      <option key={employer.id} value={`employer:${employer.id}`}>
                        {employer.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="wagez-week-totals">
              <div className="wagez-week-summary">
                <h3 className="wagez-caption">Scheduled payday</h3>
                <p className="wagez-week-total">{formatShiftDay(details.payday)}</p>
                <p className="wagez-week-split">{details.payday}</p>
                <h3 className="wagez-caption mt-3">Estimated gross pay</h3>
                <p className="wagez-week-money">{amount(details.totals.payCents)}</p>
                <p className="wagez-week-split">
                  {details.totals.shiftCount} saved shifts ·{" "}
                  {formatDurationCompact(details.totals.paidMinutes)}
                </p>
                {details.totals.holidayCount > 0 ? (
                  <p className="wagez-week-split">Paid HOLIDAY: {(details.totals.holidayMinutes / 60).toFixed(2)}h · {details.totals.holidayPayCents === null ? "Rate missing" : formatCents(details.totals.holidayPayCents)}</p>
                ) : null}
                {details.totals.tipCents > 0 ? (
                  <p className="wagez-week-split">
                    Includes {formatCents(details.totals.tipCents)} tips
                  </p>
                ) : null}
              </div>
            </div>

            {details.totals.holidayUnknownRates > 0 ? (
              <p role="status" className="wagez-alert text-sm">{details.totals.holidayUnknownRates} holiday entry(s) have no hourly rate, so estimated pay is incomplete.</p>
            ) : null}
            {details.missingRates > 0 ? (
              <p role="status" className="wagez-alert text-sm">
                {details.missingRates} shift(s) have no hourly rate.
                Their wages aren't included in this estimate (tips still are).
              </p>
            ) : null}

            <p className="text-sm font-semibold">
              Based on saved shifts only. This is gross earnings before
              taxes, deductions, and any employer payroll adjustments.
              Future unrecorded shifts are not projected.
            </p>

            {details.weeks.map((week, index) => (
              <PeriodWeek
                key={week.start}
                number={index + 1}
                week={week}
              />
            ))}
            <p className="text-xs font-semibold">
              Overtime follows your existing weekly Wagez settings, even
              if your configured overtime week crosses a pay-period boundary.
              The payday repeats every 14 calendar days; holidays and early
              deposits are not predicted.
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
