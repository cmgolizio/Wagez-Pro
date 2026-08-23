# Wagez v2 — Build Plan

## 0. Purpose of This Document

This document is the authoritative implementation plan for the next major version of **Wagez**.

Wagez is intentionally a small, focused wage and shift calculator.

The goal of Wagez v2 is **not** to turn Wagez into payroll software, workforce management software, scheduling software, or an HR platform.

The goal is to take the original Wagez concept and rebuild it with:

- a modern technical foundation;
- much faster and cleaner time entry;
- immediate visual feedback;
- support for saving multiple dated shifts into a work week;
- optional practical enhancements such as breaks and overtime;
- local persistence;
- excellent mobile usability;
- installable/offline PWA behavior;
- the recognizable visual identity of the original Wagez.

The application should feel like a polished utility rather than a business application.

Wagez should remain:

- fast;
- simple;
- visually bold;
- fun to use;
- obvious without instructions;
- useful within seconds of opening it.

This file is intended primarily for an AI coding agent such as Codex or Claude Code.

---

# 1. Instructions for the AI Coding Agent

## 1.1 Read This File First

At the beginning of every implementation session:

1. Read this entire file.
2. Inspect the current repository state.
3. Determine which phases and subphases are already complete.
4. Do not redo completed work unless it is necessary to correct a defect.
5. Do not silently change architectural decisions described here.
6. Do not add features merely because they appear useful.
7. Do not substantially redesign Wagez without explicit approval.
8. Prefer the simplest correct implementation.
9. Keep dependencies minimal.
10. Preserve plain JavaScript throughout the project.

If implementation reality conflicts with this plan:

1. Identify the conflict.
2. Determine whether the plan can still be followed.
3. Prefer preserving the product intent over blindly preserving an implementation detail.
4. Document significant deviations.
5. Do not introduce major scope changes without explicit instruction.

---

# 2. Product Philosophy

Wagez should answer a very simple question extremely well:

> I worked from this time to this time, at this rate. How long did I work, and how much did I make?

Wagez v2 expands that concept slightly:

> I worked several shifts this week. How much time did I work, and how much did I make?

Everything should revolve around those two workflows.

The single-shift calculator remains the primary experience.

The weekly functionality should extend that experience rather than replacing it.

The homepage should never feel like a timesheet, spreadsheet, payroll dashboard, or enterprise application.

---

# 3. Original Wagez Behavior to Preserve

The original Wagez application contains three primary inputs:

1. Clock-in time.
2. Clock-out time.
3. Hourly wage.

The user presses:

> Do Math.

The application displays:

- entered clock-in time;
- entered clock-out time;
- entered hourly wage;
- calculated time worked;
- calculated money earned.

This fundamental behavior must remain.

The wording **"Do Math."** should be preserved.

Do not rename the primary action to:

- Calculate;
- Submit;
- Compute;
- Save;
- Run;
- Continue.

The personality of the original application matters.

---

# 4. Visual Identity That Must Be Preserved

## 4.1 Background Gradient

The background gradient is a defining visual feature of Wagez.

Preserve the exact gradient:

```css
linear-gradient(
  45deg,
  #00FF87 0%,
  #00FFD0 50%,
  #60EFFF 100%
)
```

Do not:

- alter the gradient stops;
- replace it with a different green;
- use a different blue;
- change the angle;
- animate it by default;
- replace it with a photograph;
- replace it with a flat color.

The gradient should fill the entire visible application background.

On mobile devices it must cover the complete viewport, including dynamic viewport changes.

Prefer modern viewport units such as `dvh` where appropriate.

---

# 5. Core Screen Composition

The original Wagez concept uses three strong vertical regions.

Preserve this concept.

The primary calculator screen should visually read as:

    TOP THIRD
    Current entered values

    CENTER
    Input controls
    Do Math.

    BOTTOM THIRD
    Calculated results

The exact pixel dimensions do not need to match the old application.

The conceptual layout does.

---

# 6. Top Display Region

The top portion of the screen shows the current input state.

Example:

    Clocked-in:
    4:15 PM

    Clocked-out:
    11:47 PM

    Pay rate:
    $22/hour

The major values should be:

- extremely large;
- bold;
- visually dominant;
- immediately readable.

Responsive sizing should be implemented with CSS such as `clamp()` rather than fixed desktop-only font sizes.

Example conceptual sizing:

```css
font-size: clamp(3rem, 10vw, 7rem);
font-weight: 800;
```

Do not blindly use that exact value if it produces poor results on actual devices.

Test it.

---

# 7. Critical v2 Behavior: Live Input Display

This is a major behavioral change from Wagez v1.

The displayed input state must update immediately when the user changes an input.

Example:

1. User changes Clocked In from 4:00 PM to 4:15 PM.
2. The large top display should immediately change to:

   4:15 PM

3. The user should NOT need to press "Do Math." for the displayed input state to update.

The same applies to:

- start time;
- end time;
- hourly rate;
- selected date when applicable.

However:

**Calculated results must still require pressing "Do Math."**

Therefore Wagez has two distinct concepts:

### Input State

Updates immediately.

### Calculated Result

Updates only when the user presses:

> Do Math.

Do not accidentally make the application automatically recalculate earnings whenever an input changes.

That would change the intended interaction.

---

# 8. Remove Artificial Delay

Wagez v1 deliberately waited approximately 500 ms before producing a result.

Wagez v2 must not do this.

When the user presses "Do Math.":

- validate input;
- calculate immediately;
- render the result immediately.

There should be no artificial loading spinner or artificial delay.

The calculation is local and effectively instantaneous.

Treat it accordingly.

---

# 9. Center Input Region

The center of the page contains the active shift editor.

The primary controls are:

1. Start time.
2. End time.
3. Hourly rate.
4. Optional date/day.
5. Optional break.
6. Primary "Do Math." button.

The interface must be extremely fast to operate on a phone.

This area should remain visually compact.

Do not create a huge conventional form.

---

# 10. Time Entry UX

## 10.1 Primary Objective

Time entry in Wagez v1 is tedious.

Wagez v2 should make entering a shift extremely fast.

Optimize for mobile first.

A user should be able to enter:

    4:15 PM → 11:30 PM

with very little interaction.

---

# 11. Time Input Implementation Strategy

Do not blindly rely on the old browser-native `<input type="time">` experience as the only interface.

Build a time-entry component optimized for Wagez.

The implementation may still use a native time input internally or as a fallback, but the visible interaction should be deliberate.

The preferred interaction is a compact control consisting logically of:

    HOUR
    MINUTE
    AM / PM

Potential presentation:

    4 : 15 PM

Each part should be directly editable.

---

# 12. Time Entry Requirements

The component should support:

- direct touch interaction;
- keyboard entry;
- hour selection;
- minute selection;
- AM/PM selection;
- correct conversion between display values and internal values;
- accessible labels;
- large touch targets;
- correct focus handling;
- quick editing;
- immediate synchronization with application state.

Useful quick minute choices should include:

- `:00`
- `:15`
- `:30`
- `:45`

If a custom minute picker or keyboard input is used, any minute from:

    00–59

must still be valid.

---

# 13. "Now" Shortcut

Provide an optional small:

> Now

control for start or end time.

When pressed:

1. Read the current local time.
2. Set the selected field to the current hour/minute.
3. Update the large top display immediately.
4. Do not automatically run calculations.

Do not include seconds.

---

# 14. Internal Time Representation

Do not use formatted strings such as:

    "4:15 PM"

as the primary calculation representation.

Prefer normalized data.

For a standalone time value, acceptable internal representation is:

```js
{
  hour: 16,
  minute: 15
}
```

or normalized:

```text
16:15
```

Choose one consistent representation.

Do not mix representations unnecessarily.

Formatting functions should handle conversion for display.

---

# 15. Hourly Rate

Hourly rate must:

- accept decimals;
- reject negative values;
- allow zero if intentionally entered;
- allow values such as:
  - 7.25
  - 15
  - 22.50
  - 50.75;
- display cleanly.

Do not use floating-point arithmetic directly for final currency accumulation when it can be avoided.

Prefer integer cents internally.

Example:

```text
$22.50/hour
```

should internally become:

```text
2250 cents/hour
```

---

# 16. Hourly Rate May Be Optional

Preserve the useful behavior of the original Wagez calculator:

A shift may be calculated without an hourly rate.

If:

- start time exists;
- end time exists;
- hourly rate is blank;

then Wagez should still calculate:

> time worked

but should not calculate:

> money earned.

Example:

    You worked:
    7 hours + 30 min.

No earnings value should be invented.

---

# 17. Default Hourly Rate

Wagez v2 should allow the user to save a default hourly rate.

Example:

    Default rate:
    $22/hour

When configured:

- new shift forms begin with that rate;
- the user may override it for any individual shift;
- changing one shift's rate must not automatically modify the saved default.

Store the default rate locally.

No account is required.

---

# 18. Add a Day / Date to a Shift

A user must be able to optionally attach a date to a calculated shift.

The UI may initially show a small action such as:

> - Add day

When activated, reveal a date selector.

Prefer storing an actual date rather than only strings such as:

    Monday

Use:

```text
YYYY-MM-DD
```

internally.

This makes chronological sorting reliable.

The UI can display:

    MON
    AUG 17

or:

    Monday, Aug 17

depending on available space.

---

# 19. Why Dates Matter

Dates enable:

- chronological sorting;
- work-week grouping;
- duplicate-shift behavior;
- clear overnight handling;
- future weekly summaries;
- accurate historical shift storage.

Do not store only weekday names.

---

# 20. Standalone Shift vs Saved Shift

A user should be able to use Wagez forever without saving anything.

The default workflow remains:

1. Enter start.
2. Enter end.
3. Optionally enter rate.
4. Press "Do Math."
5. Read result.
6. Reset or change input.

Saving to a week must remain optional.

---

# 21. "Add to Week"

After a valid calculation, show:

> - Add to week

This control should appear only when adding the current calculation makes sense.

If the shift does not yet have a date:

1. Prompt for/select a date.
2. Once valid, save the shift.

If the shift already has a date:

1. Save immediately.

Do not automatically add every calculated shift to the week.

Calculation and saving are separate actions.

---

# 22. Work Week Mode

Wagez v2 introduces a work-week view.

This is the primary new feature.

The work-week view contains saved shifts in chronological order.

Example:

    MON · AUG 17
    4:00 PM → 11:30 PM
    7h 30m
    $150.00

    TUE · AUG 18
    5:00 PM → 10:45 PM
    5h 45m
    $115.00

The presentation should remain bold and clean.

It should not look like a spreadsheet.

---

# 23. Work Week Navigation

Provide a lightweight way to move between:

- Shift
- Week

Possible UI:

    Shift     Week

or:

    SHIFT / WEEK

Do not build a large navigation bar.

The application has essentially two views.

Keep navigation compact and obvious.

---

# 24. Week Grouping

Saved shifts should be grouped into seven-day weeks.

Week boundaries should use a single consistent rule.

Recommended implementation:

- add a user preference for:
  - Sunday start;
  - Monday start;
- use Sunday as the default for a U.S.-oriented Wagez installation unless implementation requirements dictate otherwise.

Store the preference locally.

Do not make this preference prominent on the calculator screen.

Put it in lightweight settings.

---

# 25. Chronological Sorting

Shifts in a week must automatically sort by:

1. date;
2. start time.

Do not depend on insertion order.

Example:

If the user adds Wednesday first and Monday second, the week should display:

    Monday
    Wednesday

not:

    Wednesday
    Monday

---

# 26. Editing Saved Shifts

Every saved shift must be editable.

A user should be able to change:

- date;
- start;
- end;
- hourly rate;
- break.

After editing:

1. recalculate the shift;
2. update stored data;
3. update weekly totals;
4. preserve the shift ID.

Do not create a duplicate when editing an existing shift.

---

# 27. Deleting Saved Shifts

Each saved shift must be removable.

Deletion should be deliberate but not annoying.

A lightweight confirmation is appropriate.

Example:

> Delete this shift?

Avoid browser `window.confirm()` if a small accessible custom confirmation is easy to implement.

---

# 28. Duplicate Shift

A saved shift should offer:

> Duplicate

Example:

Monday:

    9:00 AM → 5:00 PM
    $20/hour
    30 min break

User presses Duplicate.

Create a new editable shift with:

- same start time;
- same end time;
- same hourly rate;
- same break duration;
- a new unique ID.

Prompt for or intelligently suggest a new date.

Recommended default:

    original date + 1 day

Do not silently overwrite another shift.

---

# 29. Break Deduction

Add optional unpaid break support.

Keep the control unobtrusive.

Default:

    No break

Quick choices:

- None
- 15 min
- 30 min
- 45 min
- 60 min
- Custom

Custom break must accept a sensible non-negative minute value.

---

# 30. Break Calculation

Given:

    start = 9:00 AM
    end = 5:00 PM
    raw duration = 8 hours
    break = 30 minutes

paid duration is:

    7 hours 30 minutes

The break must be deducted before calculating earnings.

Formula:

    paidMinutes = elapsedMinutes - breakMinutes

Validation:

    breakMinutes >= 0

and:

    breakMinutes < elapsedMinutes

A break equal to or longer than the entire shift is invalid.

---

# 31. Overnight Shifts

Wagez must handle overnight work correctly.

Example:

    Start: 10:00 PM
    End:   3:00 AM

Result:

    5 hours

When no date exists, if end time is earlier than start time:

- assume the shift ends the following day.

When a start date exists:

- use that date as the shift's starting date;
- if end time is earlier than start time, infer that the shift ended on the following calendar day.

Example:

    Saturday Aug 22
    10:00 PM → 3:00 AM

means:

    Saturday Aug 22 10:00 PM
    →
    Sunday Aug 23 3:00 AM

Do not return a negative duration.

---

# 32. Invalid Zero-Length Shift

If:

    start === end

do not automatically interpret that as a 24-hour shift.

Treat it as invalid by default.

Display a clear message such as:

> Start and end time can't be the same.

Do not silently calculate 24 hours.

---

# 33. Duration Calculations

Use minutes as the primary duration unit.

Example:

    7 hours 32 minutes

becomes:

    452 minutes

This simplifies:

- breaks;
- earnings;
- overtime;
- weekly totals;
- formatting.

Recommended helper concepts:

```js
getElapsedMinutes();
getPaidMinutes();
formatDuration();
calculateBasePay();
calculateWeeklyTotals();
```

Keep calculation code separate from React rendering code.

---

# 34. Earnings Calculation

For a simple shift with no overtime:

    earnedCents =
      round(
        paidMinutes *
        hourlyRateCents /
        60
      )

Perform final rounding consistently.

Currency display should always be based on integer cents.

Example:

    452 minutes
    $22/hour

should produce a deterministic cent value.

---

# 35. Money Formatting

Use `Intl.NumberFormat`.

Example:

```js
new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
```

Avoid manually concatenating dollar signs and decimal strings.

---

# 36. Duration Formatting

Preserve the personality of Wagez.

Preferred long-form result:

    7 hours + 32 min.

Examples:

    1 hour.
    2 hours.
    1 hour + 15 min.
    7 hours + 32 min.
    45 min.

Use grammatically correct singular/plural handling.

Weekly summaries may use compact forms such as:

    38h 45m

where space is limited.

---

# 37. Result Display

The lower third should retain the original Wagez style.

Example:

    You worked:

    7 hours + 32 min.

    and made:

    $165.73

The values should be visually huge.

The earnings amount should remain especially prominent.

The original used green for money.

The new version may experiment with text colors, but maintain very high contrast and visual hierarchy.

---

# 38. Recommended Color Tokens

Start with these legacy-derived colors:

```text
Background start:     #00FF87
Background middle:    #00FFD0
Background end:       #60EFFF

Primary dark:         #16161D
Secondary gray:       #717171
Legacy earnings:      #00AD07
Primary action purple:#736BFB
Panel background:     rgba(248, 248, 255, 0.7)
```

These should be represented as reusable design tokens or CSS custom properties.

Example:

```css
:root {
  --wagez-bg-start: #00ff87;
  --wagez-bg-mid: #00ffd0;
  --wagez-bg-end: #60efff;

  --wagez-ink: #16161d;
  --wagez-muted: #717171;
  --wagez-money: #00ad07;
  --wagez-action: #736bfb;
  --wagez-panel: rgba(248, 248, 255, 0.7);
}
```

Text colors may evolve during implementation.

The background gradient may not.

---

# 39. Central Input Panel

The original Wagez uses a translucent light panel.

Preserve the spirit of this element.

Recommended properties:

- translucent off-white;
- moderate rounded corners;
- subtle backdrop blur;
- adequate padding;
- strong contrast;
- no heavy border;
- no excessive shadow.

Do not turn the calculator into a generic white SaaS card.

The gradient must remain visually dominant.

---

# 40. Primary Button

The main button reads:

> Do Math.

Start from the original purple:

```text
#736BFB
```

The button should:

- span an appropriate width;
- have a large touch target;
- use bold text;
- visibly react on hover;
- visibly react on press;
- visibly react on keyboard focus.

The old hover color:

```text
#16161D
```

is an acceptable starting point.

---

# 41. Reset Behavior

Provide a lightweight reset/new-shift action.

Reset should clear:

- current start;
- current end;
- optional current date;
- current break;
- current calculated result.

Default hourly rate behavior:

If a saved default hourly rate exists, reset may restore that default rate rather than blanking it.

Reset must NOT:

- delete saved weekly shifts;
- erase settings;
- clear localStorage globally.

Weekly data should have a separate destructive action.

---

# 42. Local Persistence

Wagez v2 does not require:

- user accounts;
- authentication;
- a database;
- a backend.

Use browser local storage.

Persist:

- saved shifts;
- default hourly rate;
- week-start preference;
- overtime settings;
- relevant UI preferences.

Do not persist transient validation errors.

---

# 43. Storage Versioning

Do not dump arbitrary state into localStorage without a schema.

Use a versioned structure.

Example:

```js
{
  version: 1,
  settings: {
    defaultHourlyRateCents: 2200,
    weekStartsOn: "sunday",
    overtime: {
      enabled: false,
      thresholdMinutes: 2400,
      multiplier: 1.5
    }
  },
  shifts: []
}
```

Use a clear storage key such as:

```text
wagez:v2
```

Build storage helpers.

Example responsibilities:

```text
loadWagezData
saveWagezData
validateStoredData
migrateStoredData
clearWagezData
```

If stored data is malformed:

- fail safely;
- do not crash the application;
- fall back to clean defaults.

---

# 44. Saved Shift Data Model

Recommended shape:

```js
{
  id: "unique-id",
  date: "2026-08-17",

  startTime: "16:00",
  endTime: "23:30",

  hourlyRateCents: 2000,

  breakMinutes: 0,

  elapsedMinutes: 450,
  paidMinutes: 450,

  basePayCents: 15000,

  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

Do not unnecessarily store every derived value if deriving it dynamically is cleaner.

If derived values are stored:

- ensure recalculation is centralized;
- never let stale derived values survive an edit.

The source-of-truth fields should be:

- date;
- start time;
- end time;
- rate;
- break.

---

# 45. Unique IDs

Do not use array indexes as shift IDs.

Use a real unique ID.

Prefer browser-native:

```js
crypto.randomUUID();
```

where supported by the application's target browsers.

---

# 46. Weekly Summary

At the bottom or top of Week mode, show a clear summary.

Example:

    THIS WEEK

    4 shifts

    31 hours + 45 min.

    $635.00

Keep it visually bold.

This summary is more important than charts.

Do not add charts to the MVP.

---

# 47. Weekly Total Calculation

Weekly totals should derive from saved shifts in the selected week.

Calculate:

- shift count;
- total elapsed minutes;
- total break minutes;
- total paid minutes;
- base earnings;
- overtime earnings if enabled;
- total earnings.

Do not trust precomputed weekly values stored in localStorage.

Derive them from shifts.

---

# 48. Overtime Support

Overtime should exist as an optional feature.

It should be disabled by default.

Settings should allow:

- enable/disable overtime;
- threshold hours;
- multiplier.

Recommended default configuration:

```text
Threshold: 40 hours
Multiplier: 1.5x
```

These are user-configurable calculation assumptions.

Do NOT describe Wagez as determining legal overtime eligibility.

Do NOT claim that 40 hours / 1.5x universally applies.

Use language such as:

> Overtime calculation

not:

> Legally required overtime

---

# 49. Overtime Calculation Rules

When overtime is enabled:

1. Sort shifts chronologically.
2. Track accumulated paid minutes.
3. Minutes before the threshold are regular minutes.
4. Minutes after the threshold are overtime minutes.
5. If the threshold is crossed during a shift, split that shift logically.

Example:

    Threshold = 40 hours
    Accumulated before Friday = 38 hours
    Friday paid duration = 8 hours

Friday contains:

    2 regular hours
    6 overtime hours

If Friday's hourly rate is $20:

    2 hours × $20
    +
    6 hours × $20 × 1.5

If different shifts have different hourly rates, apply the shift's own rate to its regular/overtime portions.

Do not average hourly rates unless explicitly requested in the future.

---

# 50. Overtime and Breaks

Break minutes are unpaid.

Therefore:

1. calculate elapsed shift time;
2. subtract unpaid break;
3. obtain paid minutes;
4. apply regular/overtime allocation to paid minutes.

Do not include unpaid break minutes toward the overtime threshold.

---

# 51. Weekly Overtime Display

When overtime is disabled:

Do not clutter the interface with overtime rows.

When enabled, summary may display:

    Regular:
    40h

    Overtime:
    4h 30m

    Total:
    44h 30m

    Gross:
    $1,023.50

Keep this concise.

---

# 52. Share / Copy Weekly Summary

Provide a:

> Share

or:

> Copy summary

action.

Generate plain text.

Example:

    Wagez — Aug 17–23

    4 shifts
    31h 45m
    $635.00 gross

If supported, use the Web Share API.

If unavailable:

- copy summary text to clipboard;
- show lightweight confirmation such as:
  - "Copied."

Do not require external services.

---

# 53. Optional Detailed Share Format

A future or secondary option may include shift details:

    Wagez — Aug 17–23

    Mon: 4:00 PM–11:30 PM · 7h 30m · $150
    Tue: 5:00 PM–10:45 PM · 5h 45m · $115
    Thu: 4:15 PM–11:45 PM · 7h 30m · $150
    Fri: 3:00 PM–2:00 AM · 11h · $220

    Total:
    31h 45m · $635

Do not overengineer export formats in the MVP.

No PDF generator is required.

---

# 54. PWA

Wagez should be installable as a Progressive Web App.

The existing Wagez concept is ideal for offline/local operation.

Implement:

- proper web app manifest;
- application name;
- short name;
- icons;
- theme colors;
- installable metadata;
- standalone display mode;
- basic offline behavior.

Recommended:

```text
name: Wagez
short_name: Wagez
display: standalone
```

---

# 55. Offline Requirement

Once Wagez has successfully loaded and relevant assets are cached, the core calculator should continue to function without a network connection.

Core offline functionality should include:

- entering times;
- entering rate;
- calculation;
- viewing local saved shifts;
- adding/editing/deleting local shifts;
- weekly totals.

Do not build network dependencies into core calculations.

---

# 56. Live Running Wage — Post-MVP Feature

Architect the application so a later feature can support:

> What am I making right now?

This feature is NOT required for the initial MVP unless explicitly instructed.

Concept:

User enters:

- clock-in time;
- hourly rate;

but no clock-out time.

Wagez displays a live earnings amount.

Example:

    You have made:

    $83.47

The value updates while the current shift is active.

---

# 57. Live Wage Calculation

Future implementation:

    elapsedNow =
      currentTime - clockInTime

    currentEarnings =
      elapsedNow × rate

The visible display may update approximately once per second.

Do not perform unnecessary high-frequency rendering.

Do not store hundreds of timer events.

Use one timer.

Stop it when:

- the component unmounts;
- the live shift ends;
- clock-out is entered;
- live mode is disabled.

---

# 58. Architecture for Live Wage

Although the feature is deferred, avoid architecture that makes it difficult.

The calculation layer should already have reusable helpers for:

- elapsed minutes;
- rate calculation;
- duration formatting;
- currency formatting.

Do not implement live wage by duplicating the normal wage calculation logic.

---

# 59. Features Explicitly Out of Scope

Do NOT implement any of the following unless explicitly requested later:

- user accounts;
- email login;
- passwords;
- OAuth;
- Supabase;
- Firebase;
- database servers;
- employer accounts;
- employee management;
- payroll processing;
- direct deposit;
- tax withholding;
- tax filing;
- tax estimates;
- HR tools;
- time-clock geolocation;
- employee GPS tracking;
- shift scheduling;
- manager dashboards;
- company dashboards;
- teams;
- workplace invitations;
- payroll integrations;
- QuickBooks integration;
- ADP integration;
- Gusto integration;
- invoicing;
- expense tracking;
- tips;
- commissions;
- paid-time-off tracking;
- benefits;
- employee classification;
- legal overtime determination;
- labor-law compliance claims;
- AI chatbot;
- advertisements;
- subscriptions;
- payment processing.

These would damage the intended simplicity of Wagez v2.

---

# 60. Technical Stack

Use a modern supported stack.

## Required

- Next.js using the App Router.
- React.
- Plain JavaScript.
- Tailwind CSS.
- ESLint.
- npm unless the repository already establishes another package manager.

## Do Not Use

- TypeScript.
- Create React App.
- Chakra UI.
- Formik.
- Redux.
- Zustand unless complexity later clearly justifies it.
- Luxon unless native date/time logic proves insufficient.
- Moment.js.
- large component frameworks.
- backend/database infrastructure for MVP.

---

# 61. Dependency Policy

The application is small.

Keep dependencies aggressively minimal.

Before installing a package, ask:

> Can this be implemented clearly with the platform, React, Next.js, or Tailwind?

If yes:

Do not install the package.

Reasonable exceptions include packages required for:

- robust testing;
- PWA integration if the implementation clearly benefits;
- tiny focused utilities that materially reduce fragile custom code.

Do not install a package merely for:

- one icon;
- one button;
- one formatter;
- one modal.

---

# 62. Framework Version Policy

Do not blindly hardcode framework versions from this document.

Before initialization:

1. Check the currently supported stable Next.js releases.
2. Check current Next.js security advisories.
3. Prefer a supported security-patched release.
4. Check React compatibility.
5. Use the current supported Tailwind release compatible with the framework.
6. Avoid prerelease/canary versions unless explicitly instructed.

Security and stability are more important than using the largest version number.

Record the versions actually selected in the repository's package files.

---

# 63. JavaScript Only

This project uses plain JavaScript.

Do not:

- create `.ts` files;
- create `.tsx` files;
- install TypeScript merely because Next.js supports it;
- add TypeScript configuration.

Use:

- `.js`;
- `.jsx` where useful.

JSDoc may be used where it improves clarity.

Do not create pseudo-TypeScript through excessive JSDoc complexity.

---

# 64. Next.js Application Structure

Use the App Router.

Recommended starting structure:

```text
/
├── app/
│   ├── layout.js
│   ├── page.js
│   ├── globals.css
│   └── manifest.js
│
├── components/
│   ├── calculator/
│   ├── week/
│   ├── settings/
│   └── ui/
│
├── lib/
│   ├── calculations/
│   ├── storage/
│   ├── formatters/
│   └── dates/
│
├── public/
│   └── icons/
│
├── docs/
│   └── build-plan.md
│
├── tests/
│
├── package.json
└── ...
```

This is guidance, not a requirement to create pointless folders.

Create folders as they become useful.

Do not create dozens of empty files in advance.

---

# 65. Client vs Server Components

Wagez relies heavily on:

- browser interaction;
- localStorage;
- current time;
- form state;
- interactive controls.

The primary calculator will therefore require client-side React.

Use `"use client"` only where required.

Do not convert the entire application into unnecessary client components.

Static layout and metadata can remain server-side where appropriate.

Keep browser-only APIs out of server code.

---

# 66. State Management

Do not install a global state library initially.

Use:

- React state;
- small custom hooks;
- context only if state genuinely needs to be shared across distant components.

Potential state categories:

```text
current draft shift
current calculated result
saved shifts
settings
selected week
UI mode
```

Prefer clear ownership over global state.

---

# 67. Draft Shift vs Calculated Shift

Keep these concepts distinct.

Example:

```js
draftShift;
```

contains what the user is currently editing.

```js
calculatedResult;
```

contains the last result generated by pressing:

> Do Math.

This prevents a critical UX bug:

Changing the draft after calculation should update the top input display but should NOT falsely imply the bottom result has already been recalculated.

---

# 68. Dirty Result State

After a successful calculation, if the user changes an input:

- the top display changes immediately;
- the previous calculated result may remain visible temporarily;
- clearly indicate that inputs have changed since the calculation.

Possible subtle approach:

- dim the old result;
- show:
  - "Inputs changed — Do Math. again."

Do not show stale earnings as though they match the new inputs.

This is important.

---

# 69. Suggested Application State

Conceptually:

```js
const [draftShift, setDraftShift] = useState(...)
const [result, setResult] = useState(null)
const [resultInputSignature, setResultInputSignature] = useState(null)
```

Create a deterministic signature or comparison of calculation-relevant inputs.

If current draft differs from the inputs used to calculate the existing result:

```text
resultIsStale = true
```

Use that state to communicate clearly.

Do not automatically recalculate.

---

# 70. Input Validation

Validation should be friendly and immediate enough to help, but not obnoxious.

Required for calculation:

- valid start time;
- valid end time.

Optional:

- rate;
- date;
- break.

If rate exists:

- it must be valid.

If break exists:

- it must be valid.

If date exists:

- it must be valid.

---

# 71. Error Messages

Error messages should sound like Wagez.

Prefer:

> What time did you clock in?

over:

> Invalid start_time value.

Prefer:

> That break is longer than the shift.

over:

> Validation error.

Keep errors concise.

---

# 72. Accessibility

Wagez must be keyboard accessible and screen-reader friendly.

Requirements:

- every input has a label;
- interactive elements are actual buttons;
- no clickable `<div>` when a button is appropriate;
- visible keyboard focus states;
- logical tab order;
- semantic headings;
- sufficient text contrast;
- touch targets approximately 44×44 CSS pixels or larger;
- errors associated with inputs;
- dialog focus managed correctly;
- reduced-motion preferences respected.

Do not sacrifice accessibility for visual minimalism.

---

# 73. Motion

Motion should be subtle.

Allowed:

- small fade;
- slight vertical transition;
- button press state;
- result transition;
- week item insertion animation.

Do not:

- bounce major text;
- animate the gradient continuously;
- create long transitions;
- delay interaction for animation;
- make calculation feel slower.

Honor:

```css
prefers-reduced-motion
```

---

# 74. Responsive Design

Design mobile first.

Primary targets:

- modern iPhone portrait;
- modern Android portrait;
- small mobile landscape;
- tablet;
- desktop browser.

The core calculator should remain centered and visually balanced.

Avoid desktop layouts that become microscopic mobile forms.

---

# 75. Mobile Viewport

Ensure the app works correctly with mobile browser chrome.

Prefer:

```css
min-height: 100dvh;
```

where appropriate.

Avoid relying exclusively on:

```css
100vh
```

if it causes layout jumping or cropped content on mobile Safari.

---

# 76. Safe Areas

For installed/mobile use, account for device safe areas where appropriate.

Example:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Buttons and results should not collide with the iPhone home indicator.

---

# 77. Desktop Layout

Do not dramatically redesign Wagez on desktop.

The same core vertical composition should remain recognizable.

A reasonable maximum width may be applied to the central editor.

The giant top and bottom values may use larger responsive caps.

---

# 78. Settings

Settings should be lightweight.

Recommended settings:

- default hourly rate;
- week starts Sunday/Monday;
- overtime enabled;
- overtime threshold;
- overtime multiplier;
- reset stored data.

Do not create a giant Settings page.

A small sheet, modal, drawer, or compact route is sufficient.

---

# 79. Clear Stored Data

Settings may include:

> Clear Wagez data

This should:

- require explicit confirmation;
- delete saved shifts;
- restore settings defaults;
- clear the Wagez local storage key.

Do not make this action easy to trigger accidentally.

---

# 80. Privacy

Wagez v2 should be private by architecture.

MVP data remains on the device.

Do not add analytics that capture:

- wages;
- work schedules;
- shift times;
- saved earnings.

If analytics are added later, they must avoid sensitive input values unless explicitly designed and approved.

---

# 81. SEO and Metadata

Use meaningful metadata.

Title:

```text
Wagez — Shift & Wage Calculator
```

Description should accurately describe the utility.

Do not retain Create React App placeholder metadata.

Provide:

- favicon;
- PWA icons;
- theme color;
- Open Graph basics if appropriate.

---

# 82. Testing Strategy

Calculation accuracy is more important than visual cleverness.

Testing must cover the pure calculation helpers heavily.

Use a modern compatible test setup appropriate to the selected framework.

Do not skip tests because the application is small.

Small calculation apps are exactly where incorrect edge-case math becomes embarrassing.

---

# 83. Calculation Unit Tests

Required test cases include at minimum:

### Normal shift

    9:00 AM → 5:00 PM
    = 8 hours

### Partial hour

    9:15 AM → 5:45 PM
    = 8 hours 30 minutes

### Overnight

    10:00 PM → 3:00 AM
    = 5 hours

### Midnight

    11:00 PM → 12:00 AM
    = 1 hour

### From midnight

    12:00 AM → 8:00 AM
    = 8 hours

### Noon

    12:00 PM → 1:00 PM
    = 1 hour

### Break

    9:00 AM → 5:00 PM
    30 minute break
    = 7 hours 30 minutes paid

### No hourly rate

Calculate duration successfully with no money result.

### Decimal rate

Correct currency result for a non-integer hourly rate.

### Same start/end

Returns validation error.

### Invalid break

Reject a break longer than shift.

---

# 84. Weekly Calculation Tests

Test:

- shifts sort chronologically;
- multiple shifts sum correctly;
- different hourly rates calculate correctly;
- breaks sum correctly;
- overnight shifts remain correct;
- shifts outside selected week are excluded;
- duplicate shifts receive unique IDs;
- edited shifts update totals;
- deleted shifts update totals.

---

# 85. Overtime Tests

Required examples:

### Exactly threshold

    40 hours
    => 40 regular
    => 0 overtime

### One hour over

    41 hours
    => 40 regular
    => 1 overtime

### Threshold crossed mid-shift

Previous:

    38h

Current shift:

    8h

Expected:

    2h regular
    6h overtime

### Different rates

Ensure overtime portion uses the rate of the shift where the overtime occurs.

### Break before threshold

Ensure unpaid break minutes do not count toward threshold.

---

# 86. Storage Tests

Test:

- valid data loads;
- data saves;
- malformed JSON does not crash;
- wrong schema/version does not crash;
- defaults load when storage is empty;
- deleted data actually clears;
- saved shifts persist after reload.

---

# 87. UI Tests

Test critical user flows.

At minimum:

### Single shift

1. Enter start.
2. Enter end.
3. Enter rate.
4. Confirm top display updates before calculation.
5. Confirm bottom result does not appear prematurely.
6. Press Do Math.
7. Confirm result.

### Change after calculation

1. Calculate.
2. Change end time.
3. Confirm top display changes.
4. Confirm previous result is marked stale.
5. Press Do Math.
6. Confirm fresh result.

### Save to week

1. Calculate shift.
2. Add date.
3. Add to week.
4. Open Week.
5. Confirm shift appears.

### Persistence

1. Save shift.
2. Reload.
3. Confirm shift still exists.

### Edit

1. Edit saved shift.
2. Save.
3. Confirm weekly totals change.

### Delete

1. Delete shift.
2. Confirm it disappears.
3. Confirm totals change.

---

# 88. Browser Testing

At minimum test:

- current Safari;
- current Chrome;
- mobile Safari;
- Chromium-based mobile browser where practical.

Pay particular attention to:

- custom time input;
- keyboard behavior;
- localStorage;
- PWA behavior;
- viewport height;
- Web Share API fallback.

---

# 89. Visual Testing

Verify the following manually:

- exact background gradient;
- centered input area;
- giant top text;
- giant bottom text;
- no clipping;
- no horizontal scrolling;
- readable text over gradient;
- correct mobile safe-area spacing;
- work-week cards are readable;
- input controls are not tedious.

Take screenshots during development at representative viewport sizes.

---

# 90. Performance

Wagez should feel instantaneous.

Targets:

- no artificial delays;
- no network requirement for calculations;
- minimal JavaScript dependencies;
- no unnecessary rerenders;
- local calculation helpers;
- small component tree.

Do not optimize prematurely, but do not introduce obvious waste.

---

# 91. Error Boundaries and Failure Behavior

A corrupted saved shift must not make the entire application unusable.

Where reasonable:

- validate storage data;
- ignore malformed entries;
- preserve valid entries;
- show a lightweight recovery path.

Do not show raw stack traces to users.

---

# 92. Phase-Based Implementation Plan

The project should be implemented in discrete phases.

Each phase should leave the repository functional.

Do not implement the entire application in one enormous uncontrolled pass.

---

# PHASE 1 — Foundation

## Goal

Create the clean modern Wagez project foundation.

## Tasks

1. Inspect repository state.
2. Verify current stable/security-patched framework versions.
3. Initialize Next.js App Router if not already initialized.
4. Use plain JavaScript.
5. Configure Tailwind CSS.
6. Configure ESLint.
7. Remove starter/demo content.
8. Create baseline folder structure.
9. Create `docs/` if necessary.
10. Add global CSS reset/base styles.
11. Implement exact Wagez gradient.
12. Implement application metadata.
13. Verify local development server.
14. Verify production build.

## Acceptance Criteria

- App runs.
- Production build succeeds.
- No TypeScript exists.
- Gradient is exact.
- No CRA remains.
- No unnecessary legacy dependencies exist.
- No Chakra.
- No Formik.
- No Luxon unless explicitly justified.
- Page has basic Wagez title/metadata.

---

# PHASE 2 — Calculation Engine

## Goal

Build and test all pure single-shift calculation logic before complicated UI work.

## Tasks

Create pure helpers for:

- parsing times;
- normalizing times;
- elapsed minutes;
- overnight handling;
- break deduction;
- hourly-rate normalization;
- wage calculation;
- currency formatting;
- duration formatting;
- validation.

Keep helpers free of React.

## Acceptance Criteria

- Normal shifts calculate correctly.
- Overnight shifts calculate correctly.
- Breaks calculate correctly.
- Rate calculations use stable money handling.
- No-rate shifts calculate duration.
- Same start/end validation works.
- Unit tests pass.

---

# PHASE 3 — Core Single-Shift UI

## Goal

Recreate the essential Wagez experience with the new architecture.

## Tasks

1. Build full-screen calculator layout.
2. Create top display region.
3. Create center input panel.
4. Create bottom results region.
5. Create start time input.
6. Create end time input.
7. Create hourly rate input.
8. Create Do Math. button.
9. Create Reset action.
10. Connect state.
11. Implement calculation submission.

## Acceptance Criteria

- User can calculate a basic shift.
- Results are accurate.
- Top/middle/bottom structure is recognizable.
- Text is huge and bold.
- Gradient remains visible.
- Mobile UI fits screen.
- Do Math. triggers calculation.
- There is no artificial delay.

---

# Wagez v2 — Build Plan

## 0. Purpose of This Document

This document is the authoritative implementation plan for the next major version of **Wagez**.

Wagez is intentionally a small, focused wage and shift calculator.

The goal of Wagez v2 is **not** to turn Wagez into payroll software, workforce management software, scheduling software, or an HR platform.

The goal is to take the original Wagez concept and rebuild it with:

- a modern technical foundation;
- much faster and cleaner time entry;
- immediate visual feedback;
- support for saving multiple dated shifts into a work week;
- optional practical enhancements such as breaks and overtime;
- local persistence;
- excellent mobile usability;
- installable/offline PWA behavior;
- the recognizable visual identity of the original Wagez.

The application should feel like a polished utility rather than a business application.

Wagez should remain:

- fast;
- simple;
- visually bold;
- fun to use;
- obvious without instructions;
- useful within seconds of opening it.

This file is intended primarily for an AI coding agent such as Codex or Claude Code.

---

# 1. Instructions for the AI Coding Agent

## 1.1 Read This File First

At the beginning of every implementation session:

1. Read this entire file.
2. Inspect the current repository state.
3. Determine which phases and subphases are already complete.
4. Do not redo completed work unless it is necessary to correct a defect.
5. Do not silently change architectural decisions described here.
6. Do not add features merely because they appear useful.
7. Do not substantially redesign Wagez without explicit approval.
8. Prefer the simplest correct implementation.
9. Keep dependencies minimal.
10. Preserve plain JavaScript throughout the project.

If implementation reality conflicts with this plan:

1. Identify the conflict.
2. Determine whether the plan can still be followed.
3. Prefer preserving the product intent over blindly preserving an implementation detail.
4. Document significant deviations.
5. Do not introduce major scope changes without explicit instruction.

---

# 2. Product Philosophy

Wagez should answer a very simple question extremely well:

> I worked from this time to this time, at this rate. How long did I work, and how much did I make?

Wagez v2 expands that concept slightly:

> I worked several shifts this week. How much time did I work, and how much did I make?

Everything should revolve around those two workflows.

The single-shift calculator remains the primary experience.

The weekly functionality should extend that experience rather than replacing it.

The homepage should never feel like a timesheet, spreadsheet, payroll dashboard, or enterprise application.

---

# 3. Original Wagez Behavior to Preserve

The original Wagez application contains three primary inputs:

1. Clock-in time.
2. Clock-out time.
3. Hourly wage.

The user presses:

> Do Math.

The application displays:

- entered clock-in time;
- entered clock-out time;
- entered hourly wage;
- calculated time worked;
- calculated money earned.

This fundamental behavior must remain.

The wording **"Do Math."** should be preserved.

Do not rename the primary action to:

- Calculate;
- Submit;
- Compute;
- Save;
- Run;
- Continue.

The personality of the original application matters.

---

# 4. Visual Identity That Must Be Preserved

## 4.1 Background Gradient

The background gradient is a defining visual feature of Wagez.

Preserve the exact gradient:

```css
linear-gradient(
  45deg,
  #00FF87 0%,
  #00FFD0 50%,
  #60EFFF 100%
)
```

Do not:

- alter the gradient stops;
- replace it with a different green;
- use a different blue;
- change the angle;
- animate it by default;
- replace it with a photograph;
- replace it with a flat color.

The gradient should fill the entire visible application background.

On mobile devices it must cover the complete viewport, including dynamic viewport changes.

Prefer modern viewport units such as `dvh` where appropriate.

---

# 5. Core Screen Composition

The original Wagez concept uses three strong vertical regions.

Preserve this concept.

The primary calculator screen should visually read as:

    TOP THIRD
    Current entered values

    CENTER
    Input controls
    Do Math.

    BOTTOM THIRD
    Calculated results

The exact pixel dimensions do not need to match the old application.

The conceptual layout does.

---

# 6. Top Display Region

The top portion of the screen shows the current input state.

Example:

    Clocked-in:
    4:15 PM

    Clocked-out:
    11:47 PM

    Pay rate:
    $22/hour

The major values should be:

- extremely large;
- bold;
- visually dominant;
- immediately readable.

Responsive sizing should be implemented with CSS such as `clamp()` rather than fixed desktop-only font sizes.

Example conceptual sizing:

```css
font-size: clamp(3rem, 10vw, 7rem);
font-weight: 800;
```

Do not blindly use that exact value if it produces poor results on actual devices.

Test it.

---

# 7. Critical v2 Behavior: Live Input Display

This is a major behavioral change from Wagez v1.

The displayed input state must update immediately when the user changes an input.

Example:

1. User changes Clocked In from 4:00 PM to 4:15 PM.
2. The large top display should immediately change to:

   4:15 PM

3. The user should NOT need to press "Do Math." for the displayed input state to update.

The same applies to:

- start time;
- end time;
- hourly rate;
- selected date when applicable.

However:

**Calculated results must still require pressing "Do Math."**

Therefore Wagez has two distinct concepts:

### Input State

Updates immediately.

### Calculated Result

Updates only when the user presses:

> Do Math.

Do not accidentally make the application automatically recalculate earnings whenever an input changes.

That would change the intended interaction.

---

# 8. Remove Artificial Delay

Wagez v1 deliberately waited approximately 500 ms before producing a result.

Wagez v2 must not do this.

When the user presses "Do Math.":

- validate input;
- calculate immediately;
- render the result immediately.

There should be no artificial loading spinner or artificial delay.

The calculation is local and effectively instantaneous.

Treat it accordingly.

---

# 9. Center Input Region

The center of the page contains the active shift editor.

The primary controls are:

1. Start time.
2. End time.
3. Hourly rate.
4. Optional date/day.
5. Optional break.
6. Primary "Do Math." button.

The interface must be extremely fast to operate on a phone.

This area should remain visually compact.

Do not create a huge conventional form.

---

# 10. Time Entry UX

## 10.1 Primary Objective

Time entry in Wagez v1 is tedious.

Wagez v2 should make entering a shift extremely fast.

Optimize for mobile first.

A user should be able to enter:

    4:15 PM → 11:30 PM

with very little interaction.

---

# 11. Time Input Implementation Strategy

Do not blindly rely on the old browser-native `<input type="time">` experience as the only interface.

Build a time-entry component optimized for Wagez.

The implementation may still use a native time input internally or as a fallback, but the visible interaction should be deliberate.

The preferred interaction is a compact control consisting logically of:

    HOUR
    MINUTE
    AM / PM

Potential presentation:

    4 : 15 PM

Each part should be directly editable.

---

# 12. Time Entry Requirements

The component should support:

- direct touch interaction;
- keyboard entry;
- hour selection;
- minute selection;
- AM/PM selection;
- correct conversion between display values and internal values;
- accessible labels;
- large touch targets;
- correct focus handling;
- quick editing;
- immediate synchronization with application state.

Useful quick minute choices should include:

- `:00`
- `:15`
- `:30`
- `:45`

If a custom minute picker or keyboard input is used, any minute from:

    00–59

must still be valid.

---

# 13. "Now" Shortcut

Provide an optional small:

> Now

control for start or end time.

When pressed:

1. Read the current local time.
2. Set the selected field to the current hour/minute.
3. Update the large top display immediately.
4. Do not automatically run calculations.

Do not include seconds.

---

# 14. Internal Time Representation

Do not use formatted strings such as:

    "4:15 PM"

as the primary calculation representation.

Prefer normalized data.

For a standalone time value, acceptable internal representation is:

```js
{
  hour: 16,
  minute: 15
}
```

or normalized:

```text
16:15
```

Choose one consistent representation.

Do not mix representations unnecessarily.

Formatting functions should handle conversion for display.

---

# 15. Hourly Rate

Hourly rate must:

- accept decimals;
- reject negative values;
- allow zero if intentionally entered;
- allow values such as:
  - 7.25
  - 15
  - 22.50
  - 50.75;
- display cleanly.

Do not use floating-point arithmetic directly for final currency accumulation when it can be avoided.

Prefer integer cents internally.

Example:

```text
$22.50/hour
```

should internally become:

```text
2250 cents/hour
```

---

# 16. Hourly Rate May Be Optional

Preserve the useful behavior of the original Wagez calculator:

A shift may be calculated without an hourly rate.

If:

- start time exists;
- end time exists;
- hourly rate is blank;

then Wagez should still calculate:

> time worked

but should not calculate:

> money earned.

Example:

    You worked:
    7 hours + 30 min.

No earnings value should be invented.

---

# 17. Default Hourly Rate

Wagez v2 should allow the user to save a default hourly rate.

Example:

    Default rate:
    $22/hour

When configured:

- new shift forms begin with that rate;
- the user may override it for any individual shift;
- changing one shift's rate must not automatically modify the saved default.

Store the default rate locally.

No account is required.

---

# 18. Add a Day / Date to a Shift

A user must be able to optionally attach a date to a calculated shift.

The UI may initially show a small action such as:

> - Add day

When activated, reveal a date selector.

Prefer storing an actual date rather than only strings such as:

    Monday

Use:

```text
YYYY-MM-DD
```

internally.

This makes chronological sorting reliable.

The UI can display:

    MON
    AUG 17

or:

    Monday, Aug 17

depending on available space.

---

# 19. Why Dates Matter

Dates enable:

- chronological sorting;
- work-week grouping;
- duplicate-shift behavior;
- clear overnight handling;
- future weekly summaries;
- accurate historical shift storage.

Do not store only weekday names.

---

# 20. Standalone Shift vs Saved Shift

A user should be able to use Wagez forever without saving anything.

The default workflow remains:

1. Enter start.
2. Enter end.
3. Optionally enter rate.
4. Press "Do Math."
5. Read result.
6. Reset or change input.

Saving to a week must remain optional.

---

# 21. "Add to Week"

After a valid calculation, show:

> - Add to week

This control should appear only when adding the current calculation makes sense.

If the shift does not yet have a date:

1. Prompt for/select a date.
2. Once valid, save the shift.

If the shift already has a date:

1. Save immediately.

Do not automatically add every calculated shift to the week.

Calculation and saving are separate actions.

---

# 22. Work Week Mode

Wagez v2 introduces a work-week view.

This is the primary new feature.

The work-week view contains saved shifts in chronological order.

Example:

    MON · AUG 17
    4:00 PM → 11:30 PM
    7h 30m
    $150.00

    TUE · AUG 18
    5:00 PM → 10:45 PM
    5h 45m
    $115.00

The presentation should remain bold and clean.

It should not look like a spreadsheet.

---

# 23. Work Week Navigation

Provide a lightweight way to move between:

- Shift
- Week

Possible UI:

    Shift     Week

or:

    SHIFT / WEEK

Do not build a large navigation bar.

The application has essentially two views.

Keep navigation compact and obvious.

---

# 24. Week Grouping

Saved shifts should be grouped into seven-day weeks.

Week boundaries should use a single consistent rule.

Recommended implementation:

- add a user preference for:
  - Sunday start;
  - Monday start;
- use Sunday as the default for a U.S.-oriented Wagez installation unless implementation requirements dictate otherwise.

Store the preference locally.

Do not make this preference prominent on the calculator screen.

Put it in lightweight settings.

---

# 25. Chronological Sorting

Shifts in a week must automatically sort by:

1. date;
2. start time.

Do not depend on insertion order.

Example:

If the user adds Wednesday first and Monday second, the week should display:

    Monday
    Wednesday

not:

    Wednesday
    Monday

---

# 26. Editing Saved Shifts

Every saved shift must be editable.

A user should be able to change:

- date;
- start;
- end;
- hourly rate;
- break.

After editing:

1. recalculate the shift;
2. update stored data;
3. update weekly totals;
4. preserve the shift ID.

Do not create a duplicate when editing an existing shift.

---

# 27. Deleting Saved Shifts

Each saved shift must be removable.

Deletion should be deliberate but not annoying.

A lightweight confirmation is appropriate.

Example:

> Delete this shift?

Avoid browser `window.confirm()` if a small accessible custom confirmation is easy to implement.

---

# 28. Duplicate Shift

A saved shift should offer:

> Duplicate

Example:

Monday:

    9:00 AM → 5:00 PM
    $20/hour
    30 min break

User presses Duplicate.

Create a new editable shift with:

- same start time;
- same end time;
- same hourly rate;
- same break duration;
- a new unique ID.

Prompt for or intelligently suggest a new date.

Recommended default:

    original date + 1 day

Do not silently overwrite another shift.

---

# 29. Break Deduction

Add optional unpaid break support.

Keep the control unobtrusive.

Default:

    No break

Quick choices:

- None
- 15 min
- 30 min
- 45 min
- 60 min
- Custom

Custom break must accept a sensible non-negative minute value.

---

# 30. Break Calculation

Given:

    start = 9:00 AM
    end = 5:00 PM
    raw duration = 8 hours
    break = 30 minutes

paid duration is:

    7 hours 30 minutes

The break must be deducted before calculating earnings.

Formula:

    paidMinutes = elapsedMinutes - breakMinutes

Validation:

    breakMinutes >= 0

and:

    breakMinutes < elapsedMinutes

A break equal to or longer than the entire shift is invalid.

---

# 31. Overnight Shifts

Wagez must handle overnight work correctly.

Example:

    Start: 10:00 PM
    End:   3:00 AM

Result:

    5 hours

When no date exists, if end time is earlier than start time:

- assume the shift ends the following day.

When a start date exists:

- use that date as the shift's starting date;
- if end time is earlier than start time, infer that the shift ended on the following calendar day.

Example:

    Saturday Aug 22
    10:00 PM → 3:00 AM

means:

    Saturday Aug 22 10:00 PM
    →
    Sunday Aug 23 3:00 AM

Do not return a negative duration.

---

# 32. Invalid Zero-Length Shift

If:

    start === end

do not automatically interpret that as a 24-hour shift.

Treat it as invalid by default.

Display a clear message such as:

> Start and end time can't be the same.

Do not silently calculate 24 hours.

---

# 33. Duration Calculations

Use minutes as the primary duration unit.

Example:

    7 hours 32 minutes

becomes:

    452 minutes

This simplifies:

- breaks;
- earnings;
- overtime;
- weekly totals;
- formatting.

Recommended helper concepts:

```js
getElapsedMinutes();
getPaidMinutes();
formatDuration();
calculateBasePay();
calculateWeeklyTotals();
```

Keep calculation code separate from React rendering code.

---

# 34. Earnings Calculation

For a simple shift with no overtime:

    earnedCents =
      round(
        paidMinutes *
        hourlyRateCents /
        60
      )

Perform final rounding consistently.

Currency display should always be based on integer cents.

Example:

    452 minutes
    $22/hour

should produce a deterministic cent value.

---

# 35. Money Formatting

Use `Intl.NumberFormat`.

Example:

```js
new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
```

Avoid manually concatenating dollar signs and decimal strings.

---

# 36. Duration Formatting

Preserve the personality of Wagez.

Preferred long-form result:

    7 hours + 32 min.

Examples:

    1 hour.
    2 hours.
    1 hour + 15 min.
    7 hours + 32 min.
    45 min.

Use grammatically correct singular/plural handling.

Weekly summaries may use compact forms such as:

    38h 45m

where space is limited.

---

# 37. Result Display

The lower third should retain the original Wagez style.

Example:

    You worked:

    7 hours + 32 min.

    and made:

    $165.73

The values should be visually huge.

The earnings amount should remain especially prominent.

The original used green for money.

The new version may experiment with text colors, but maintain very high contrast and visual hierarchy.

---

# 38. Recommended Color Tokens

Start with these legacy-derived colors:

```text
Background start:     #00FF87
Background middle:    #00FFD0
Background end:       #60EFFF

Primary dark:         #16161D
Secondary gray:       #717171
Legacy earnings:      #00AD07
Primary action purple:#736BFB
Panel background:     rgba(248, 248, 255, 0.7)
```

These should be represented as reusable design tokens or CSS custom properties.

Example:

```css
:root {
  --wagez-bg-start: #00ff87;
  --wagez-bg-mid: #00ffd0;
  --wagez-bg-end: #60efff;

  --wagez-ink: #16161d;
  --wagez-muted: #717171;
  --wagez-money: #00ad07;
  --wagez-action: #736bfb;
  --wagez-panel: rgba(248, 248, 255, 0.7);
}
```

Text colors may evolve during implementation.

The background gradient may not.

---

# 39. Central Input Panel

The original Wagez uses a translucent light panel.

Preserve the spirit of this element.

Recommended properties:

- translucent off-white;
- moderate rounded corners;
- subtle backdrop blur;
- adequate padding;
- strong contrast;
- no heavy border;
- no excessive shadow.

Do not turn the calculator into a generic white SaaS card.

The gradient must remain visually dominant.

---

# 40. Primary Button

The main button reads:

> Do Math.

Start from the original purple:

```text
#736BFB
```

The button should:

- span an appropriate width;
- have a large touch target;
- use bold text;
- visibly react on hover;
- visibly react on press;
- visibly react on keyboard focus.

The old hover color:

```text
#16161D
```

is an acceptable starting point.

---

# 41. Reset Behavior

Provide a lightweight reset/new-shift action.

Reset should clear:

- current start;
- current end;
- optional current date;
- current break;
- current calculated result.

Default hourly rate behavior:

If a saved default hourly rate exists, reset may restore that default rate rather than blanking it.

Reset must NOT:

- delete saved weekly shifts;
- erase settings;
- clear localStorage globally.

Weekly data should have a separate destructive action.

---

# 42. Local Persistence

Wagez v2 does not require:

- user accounts;
- authentication;
- a database;
- a backend.

Use browser local storage.

Persist:

- saved shifts;
- default hourly rate;
- week-start preference;
- overtime settings;
- relevant UI preferences.

Do not persist transient validation errors.

---

# 43. Storage Versioning

Do not dump arbitrary state into localStorage without a schema.

Use a versioned structure.

Example:

```js
{
  version: 1,
  settings: {
    defaultHourlyRateCents: 2200,
    weekStartsOn: "sunday",
    overtime: {
      enabled: false,
      thresholdMinutes: 2400,
      multiplier: 1.5
    }
  },
  shifts: []
}
```

Use a clear storage key such as:

```text
wagez:v2
```

Build storage helpers.

Example responsibilities:

```text
loadWagezData
saveWagezData
validateStoredData
migrateStoredData
clearWagezData
```

If stored data is malformed:

- fail safely;
- do not crash the application;
- fall back to clean defaults.

---

# 44. Saved Shift Data Model

Recommended shape:

```js
{
  id: "unique-id",
  date: "2026-08-17",

  startTime: "16:00",
  endTime: "23:30",

  hourlyRateCents: 2000,

  breakMinutes: 0,

  elapsedMinutes: 450,
  paidMinutes: 450,

  basePayCents: 15000,

  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

Do not unnecessarily store every derived value if deriving it dynamically is cleaner.

If derived values are stored:

- ensure recalculation is centralized;
- never let stale derived values survive an edit.

The source-of-truth fields should be:

- date;
- start time;
- end time;
- rate;
- break.

---

# 45. Unique IDs

Do not use array indexes as shift IDs.

Use a real unique ID.

Prefer browser-native:

```js
crypto.randomUUID();
```

where supported by the application's target browsers.

---

# 46. Weekly Summary

At the bottom or top of Week mode, show a clear summary.

Example:

    THIS WEEK

    4 shifts

    31 hours + 45 min.

    $635.00

Keep it visually bold.

This summary is more important than charts.

Do not add charts to the MVP.

---

# 47. Weekly Total Calculation

Weekly totals should derive from saved shifts in the selected week.

Calculate:

- shift count;
- total elapsed minutes;
- total break minutes;
- total paid minutes;
- base earnings;
- overtime earnings if enabled;
- total earnings.

Do not trust precomputed weekly values stored in localStorage.

Derive them from shifts.

---

# 48. Overtime Support

Overtime should exist as an optional feature.

It should be disabled by default.

Settings should allow:

- enable/disable overtime;
- threshold hours;
- multiplier.

Recommended default configuration:

```text
Threshold: 40 hours
Multiplier: 1.5x
```

These are user-configurable calculation assumptions.

Do NOT describe Wagez as determining legal overtime eligibility.

Do NOT claim that 40 hours / 1.5x universally applies.

Use language such as:

> Overtime calculation

not:

> Legally required overtime

---

# 49. Overtime Calculation Rules

When overtime is enabled:

1. Sort shifts chronologically.
2. Track accumulated paid minutes.
3. Minutes before the threshold are regular minutes.
4. Minutes after the threshold are overtime minutes.
5. If the threshold is crossed during a shift, split that shift logically.

Example:

    Threshold = 40 hours
    Accumulated before Friday = 38 hours
    Friday paid duration = 8 hours

Friday contains:

    2 regular hours
    6 overtime hours

If Friday's hourly rate is $20:

    2 hours × $20
    +
    6 hours × $20 × 1.5

If different shifts have different hourly rates, apply the shift's own rate to its regular/overtime portions.

Do not average hourly rates unless explicitly requested in the future.

---

# 50. Overtime and Breaks

Break minutes are unpaid.

Therefore:

1. calculate elapsed shift time;
2. subtract unpaid break;
3. obtain paid minutes;
4. apply regular/overtime allocation to paid minutes.

Do not include unpaid break minutes toward the overtime threshold.

---

# 51. Weekly Overtime Display

When overtime is disabled:

Do not clutter the interface with overtime rows.

When enabled, summary may display:

    Regular:
    40h

    Overtime:
    4h 30m

    Total:
    44h 30m

    Gross:
    $1,023.50

Keep this concise.

---

# 52. Share / Copy Weekly Summary

Provide a:

> Share

or:

> Copy summary

action.

Generate plain text.

Example:

    Wagez — Aug 17–23

    4 shifts
    31h 45m
    $635.00 gross

If supported, use the Web Share API.

If unavailable:

- copy summary text to clipboard;
- show lightweight confirmation such as:
  - "Copied."

Do not require external services.

---

# 53. Optional Detailed Share Format

A future or secondary option may include shift details:

    Wagez — Aug 17–23

    Mon: 4:00 PM–11:30 PM · 7h 30m · $150
    Tue: 5:00 PM–10:45 PM · 5h 45m · $115
    Thu: 4:15 PM–11:45 PM · 7h 30m · $150
    Fri: 3:00 PM–2:00 AM · 11h · $220

    Total:
    31h 45m · $635

Do not overengineer export formats in the MVP.

No PDF generator is required.

---

# 54. PWA

Wagez should be installable as a Progressive Web App.

The existing Wagez concept is ideal for offline/local operation.

Implement:

- proper web app manifest;
- application name;
- short name;
- icons;
- theme colors;
- installable metadata;
- standalone display mode;
- basic offline behavior.

Recommended:

```text
name: Wagez
short_name: Wagez
display: standalone
```

---

# 55. Offline Requirement

Once Wagez has successfully loaded and relevant assets are cached, the core calculator should continue to function without a network connection.

Core offline functionality should include:

- entering times;
- entering rate;
- calculation;
- viewing local saved shifts;
- adding/editing/deleting local shifts;
- weekly totals.

Do not build network dependencies into core calculations.

---

# 56. Live Running Wage — Post-MVP Feature

Architect the application so a later feature can support:

> What am I making right now?

This feature is NOT required for the initial MVP unless explicitly instructed.

Concept:

User enters:

- clock-in time;
- hourly rate;

but no clock-out time.

Wagez displays a live earnings amount.

Example:

    You have made:

    $83.47

The value updates while the current shift is active.

---

# 57. Live Wage Calculation

Future implementation:

    elapsedNow =
      currentTime - clockInTime

    currentEarnings =
      elapsedNow × rate

The visible display may update approximately once per second.

Do not perform unnecessary high-frequency rendering.

Do not store hundreds of timer events.

Use one timer.

Stop it when:

- the component unmounts;
- the live shift ends;
- clock-out is entered;
- live mode is disabled.

---

# 58. Architecture for Live Wage

Although the feature is deferred, avoid architecture that makes it difficult.

The calculation layer should already have reusable helpers for:

- elapsed minutes;
- rate calculation;
- duration formatting;
- currency formatting.

Do not implement live wage by duplicating the normal wage calculation logic.

---

# 59. Features Explicitly Out of Scope

Do NOT implement any of the following unless explicitly requested later:

- user accounts;
- email login;
- passwords;
- OAuth;
- Supabase;
- Firebase;
- database servers;
- employer accounts;
- employee management;
- payroll processing;
- direct deposit;
- tax withholding;
- tax filing;
- tax estimates;
- HR tools;
- time-clock geolocation;
- employee GPS tracking;
- shift scheduling;
- manager dashboards;
- company dashboards;
- teams;
- workplace invitations;
- payroll integrations;
- QuickBooks integration;
- ADP integration;
- Gusto integration;
- invoicing;
- expense tracking;
- tips;
- commissions;
- paid-time-off tracking;
- benefits;
- employee classification;
- legal overtime determination;
- labor-law compliance claims;
- AI chatbot;
- advertisements;
- subscriptions;
- payment processing.

These would damage the intended simplicity of Wagez v2.

---

# 60. Technical Stack

Use a modern supported stack.

## Required

- Next.js using the App Router.
- React.
- Plain JavaScript.
- Tailwind CSS.
- ESLint.
- npm unless the repository already establishes another package manager.

## Do Not Use

- TypeScript.
- Create React App.
- Chakra UI.
- Formik.
- Redux.
- Zustand unless complexity later clearly justifies it.
- Luxon unless native date/time logic proves insufficient.
- Moment.js.
- large component frameworks.
- backend/database infrastructure for MVP.

---

# 61. Dependency Policy

The application is small.

Keep dependencies aggressively minimal.

Before installing a package, ask:

> Can this be implemented clearly with the platform, React, Next.js, or Tailwind?

If yes:

Do not install the package.

Reasonable exceptions include packages required for:

- robust testing;
- PWA integration if the implementation clearly benefits;
- tiny focused utilities that materially reduce fragile custom code.

Do not install a package merely for:

- one icon;
- one button;
- one formatter;
- one modal.

---

# 62. Framework Version Policy

Do not blindly hardcode framework versions from this document.

Before initialization:

1. Check the currently supported stable Next.js releases.
2. Check current Next.js security advisories.
3. Prefer a supported security-patched release.
4. Check React compatibility.
5. Use the current supported Tailwind release compatible with the framework.
6. Avoid prerelease/canary versions unless explicitly instructed.

Security and stability are more important than using the largest version number.

Record the versions actually selected in the repository's package files.

---

# 63. JavaScript Only

This project uses plain JavaScript.

Do not:

- create `.ts` files;
- create `.tsx` files;
- install TypeScript merely because Next.js supports it;
- add TypeScript configuration.

Use:

- `.js`;
- `.jsx` where useful.

JSDoc may be used where it improves clarity.

Do not create pseudo-TypeScript through excessive JSDoc complexity.

---

# 64. Next.js Application Structure

Use the App Router.

Recommended starting structure:

```text
/
├── app/
│   ├── layout.js
│   ├── page.js
│   ├── globals.css
│   └── manifest.js
│
├── components/
│   ├── calculator/
│   ├── week/
│   ├── settings/
│   └── ui/
│
├── lib/
│   ├── calculations/
│   ├── storage/
│   ├── formatters/
│   └── dates/
│
├── public/
│   └── icons/
│
├── docs/
│   └── build-plan.md
│
├── tests/
│
├── package.json
└── ...
```

This is guidance, not a requirement to create pointless folders.

Create folders as they become useful.

Do not create dozens of empty files in advance.

---

# 65. Client vs Server Components

Wagez relies heavily on:

- browser interaction;
- localStorage;
- current time;
- form state;
- interactive controls.

The primary calculator will therefore require client-side React.

Use `"use client"` only where required.

Do not convert the entire application into unnecessary client components.

Static layout and metadata can remain server-side where appropriate.

Keep browser-only APIs out of server code.

---

# 66. State Management

Do not install a global state library initially.

Use:

- React state;
- small custom hooks;
- context only if state genuinely needs to be shared across distant components.

Potential state categories:

```text
current draft shift
current calculated result
saved shifts
settings
selected week
UI mode
```

Prefer clear ownership over global state.

---

# 67. Draft Shift vs Calculated Shift

Keep these concepts distinct.

Example:

```js
draftShift;
```

contains what the user is currently editing.

```js
calculatedResult;
```

contains the last result generated by pressing:

> Do Math.

This prevents a critical UX bug:

Changing the draft after calculation should update the top input display but should NOT falsely imply the bottom result has already been recalculated.

---

# 68. Dirty Result State

After a successful calculation, if the user changes an input:

- the top display changes immediately;
- the previous calculated result may remain visible temporarily;
- clearly indicate that inputs have changed since the calculation.

Possible subtle approach:

- dim the old result;
- show:
  - "Inputs changed — Do Math. again."

Do not show stale earnings as though they match the new inputs.

This is important.

---

# 69. Suggested Application State

Conceptually:

```js
const [draftShift, setDraftShift] = useState(...)
const [result, setResult] = useState(null)
const [resultInputSignature, setResultInputSignature] = useState(null)
```

Create a deterministic signature or comparison of calculation-relevant inputs.

If current draft differs from the inputs used to calculate the existing result:

```text
resultIsStale = true
```

Use that state to communicate clearly.

Do not automatically recalculate.

---

# 70. Input Validation

Validation should be friendly and immediate enough to help, but not obnoxious.

Required for calculation:

- valid start time;
- valid end time.

Optional:

- rate;
- date;
- break.

If rate exists:

- it must be valid.

If break exists:

- it must be valid.

If date exists:

- it must be valid.

---

# 71. Error Messages

Error messages should sound like Wagez.

Prefer:

> What time did you clock in?

over:

> Invalid start_time value.

Prefer:

> That break is longer than the shift.

over:

> Validation error.

Keep errors concise.

---

# 72. Accessibility

Wagez must be keyboard accessible and screen-reader friendly.

Requirements:

- every input has a label;
- interactive elements are actual buttons;
- no clickable `<div>` when a button is appropriate;
- visible keyboard focus states;
- logical tab order;
- semantic headings;
- sufficient text contrast;
- touch targets approximately 44×44 CSS pixels or larger;
- errors associated with inputs;
- dialog focus managed correctly;
- reduced-motion preferences respected.

Do not sacrifice accessibility for visual minimalism.

---

# 73. Motion

Motion should be subtle.

Allowed:

- small fade;
- slight vertical transition;
- button press state;
- result transition;
- week item insertion animation.

Do not:

- bounce major text;
- animate the gradient continuously;
- create long transitions;
- delay interaction for animation;
- make calculation feel slower.

Honor:

```css
prefers-reduced-motion
```

---

# 74. Responsive Design

Design mobile first.

Primary targets:

- modern iPhone portrait;
- modern Android portrait;
- small mobile landscape;
- tablet;
- desktop browser.

The core calculator should remain centered and visually balanced.

Avoid desktop layouts that become microscopic mobile forms.

---

# 75. Mobile Viewport

Ensure the app works correctly with mobile browser chrome.

Prefer:

```css
min-height: 100dvh;
```

where appropriate.

Avoid relying exclusively on:

```css
100vh
```

if it causes layout jumping or cropped content on mobile Safari.

---

# 76. Safe Areas

For installed/mobile use, account for device safe areas where appropriate.

Example:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Buttons and results should not collide with the iPhone home indicator.

---

# 77. Desktop Layout

Do not dramatically redesign Wagez on desktop.

The same core vertical composition should remain recognizable.

A reasonable maximum width may be applied to the central editor.

The giant top and bottom values may use larger responsive caps.

---

# 78. Settings

Settings should be lightweight.

Recommended settings:

- default hourly rate;
- week starts Sunday/Monday;
- overtime enabled;
- overtime threshold;
- overtime multiplier;
- reset stored data.

Do not create a giant Settings page.

A small sheet, modal, drawer, or compact route is sufficient.

---

# 79. Clear Stored Data

Settings may include:

> Clear Wagez data

This should:

- require explicit confirmation;
- delete saved shifts;
- restore settings defaults;
- clear the Wagez local storage key.

Do not make this action easy to trigger accidentally.

---

# 80. Privacy

Wagez v2 should be private by architecture.

MVP data remains on the device.

Do not add analytics that capture:

- wages;
- work schedules;
- shift times;
- saved earnings.

If analytics are added later, they must avoid sensitive input values unless explicitly designed and approved.

---

# 81. SEO and Metadata

Use meaningful metadata.

Title:

```text
Wagez — Shift & Wage Calculator
```

Description should accurately describe the utility.

Do not retain Create React App placeholder metadata.

Provide:

- favicon;
- PWA icons;
- theme color;
- Open Graph basics if appropriate.

---

# 82. Testing Strategy

Calculation accuracy is more important than visual cleverness.

Testing must cover the pure calculation helpers heavily.

Use a modern compatible test setup appropriate to the selected framework.

Do not skip tests because the application is small.

Small calculation apps are exactly where incorrect edge-case math becomes embarrassing.

---

# 83. Calculation Unit Tests

Required test cases include at minimum:

### Normal shift

    9:00 AM → 5:00 PM
    = 8 hours

### Partial hour

    9:15 AM → 5:45 PM
    = 8 hours 30 minutes

### Overnight

    10:00 PM → 3:00 AM
    = 5 hours

### Midnight

    11:00 PM → 12:00 AM
    = 1 hour

### From midnight

    12:00 AM → 8:00 AM
    = 8 hours

### Noon

    12:00 PM → 1:00 PM
    = 1 hour

### Break

    9:00 AM → 5:00 PM
    30 minute break
    = 7 hours 30 minutes paid

### No hourly rate

Calculate duration successfully with no money result.

### Decimal rate

Correct currency result for a non-integer hourly rate.

### Same start/end

Returns validation error.

### Invalid break

Reject a break longer than shift.

---

# 84. Weekly Calculation Tests

Test:

- shifts sort chronologically;
- multiple shifts sum correctly;
- different hourly rates calculate correctly;
- breaks sum correctly;
- overnight shifts remain correct;
- shifts outside selected week are excluded;
- duplicate shifts receive unique IDs;
- edited shifts update totals;
- deleted shifts update totals.

---

# 85. Overtime Tests

Required examples:

### Exactly threshold

    40 hours
    => 40 regular
    => 0 overtime

### One hour over

    41 hours
    => 40 regular
    => 1 overtime

### Threshold crossed mid-shift

Previous:

    38h

Current shift:

    8h

Expected:

    2h regular
    6h overtime

### Different rates

Ensure overtime portion uses the rate of the shift where the overtime occurs.

### Break before threshold

Ensure unpaid break minutes do not count toward threshold.

---

# 86. Storage Tests

Test:

- valid data loads;
- data saves;
- malformed JSON does not crash;
- wrong schema/version does not crash;
- defaults load when storage is empty;
- deleted data actually clears;
- saved shifts persist after reload.

---

# 87. UI Tests

Test critical user flows.

At minimum:

### Single shift

1. Enter start.
2. Enter end.
3. Enter rate.
4. Confirm top display updates before calculation.
5. Confirm bottom result does not appear prematurely.
6. Press Do Math.
7. Confirm result.

### Change after calculation

1. Calculate.
2. Change end time.
3. Confirm top display changes.
4. Confirm previous result is marked stale.
5. Press Do Math.
6. Confirm fresh result.

### Save to week

1. Calculate shift.
2. Add date.
3. Add to week.
4. Open Week.
5. Confirm shift appears.

### Persistence

1. Save shift.
2. Reload.
3. Confirm shift still exists.

### Edit

1. Edit saved shift.
2. Save.
3. Confirm weekly totals change.

### Delete

1. Delete shift.
2. Confirm it disappears.
3. Confirm totals change.

---

# 88. Browser Testing

At minimum test:

- current Safari;
- current Chrome;
- mobile Safari;
- Chromium-based mobile browser where practical.

Pay particular attention to:

- custom time input;
- keyboard behavior;
- localStorage;
- PWA behavior;
- viewport height;
- Web Share API fallback.

---

# 89. Visual Testing

Verify the following manually:

- exact background gradient;
- centered input area;
- giant top text;
- giant bottom text;
- no clipping;
- no horizontal scrolling;
- readable text over gradient;
- correct mobile safe-area spacing;
- work-week cards are readable;
- input controls are not tedious.

Take screenshots during development at representative viewport sizes.

---

# 90. Performance

Wagez should feel instantaneous.

Targets:

- no artificial delays;
- no network requirement for calculations;
- minimal JavaScript dependencies;
- no unnecessary rerenders;
- local calculation helpers;
- small component tree.

Do not optimize prematurely, but do not introduce obvious waste.

---

# 91. Error Boundaries and Failure Behavior

A corrupted saved shift must not make the entire application unusable.

Where reasonable:

- validate storage data;
- ignore malformed entries;
- preserve valid entries;
- show a lightweight recovery path.

Do not show raw stack traces to users.

---

# 92. Phase-Based Implementation Plan

The project should be implemented in discrete phases.

Each phase should leave the repository functional.

Do not implement the entire application in one enormous uncontrolled pass.

---

# PHASE 1 — Foundation

## Goal

Create the clean modern Wagez project foundation.

## Tasks

1. Inspect repository state.
2. Verify current stable/security-patched framework versions.
3. Initialize Next.js App Router if not already initialized.
4. Use plain JavaScript.
5. Configure Tailwind CSS.
6. Configure ESLint.
7. Remove starter/demo content.
8. Create baseline folder structure.
9. Create `docs/` if necessary.
10. Add global CSS reset/base styles.
11. Implement exact Wagez gradient.
12. Implement application metadata.
13. Verify local development server.
14. Verify production build.

## Acceptance Criteria

- App runs.
- Production build succeeds.
- No TypeScript exists.
- Gradient is exact.
- No CRA remains.
- No unnecessary legacy dependencies exist.
- No Chakra.
- No Formik.
- No Luxon unless explicitly justified.
- Page has basic Wagez title/metadata.

---

# PHASE 2 — Calculation Engine

## Goal

Build and test all pure single-shift calculation logic before complicated UI work.

## Tasks

Create pure helpers for:

- parsing times;
- normalizing times;
- elapsed minutes;
- overnight handling;
- break deduction;
- hourly-rate normalization;
- wage calculation;
- currency formatting;
- duration formatting;
- validation.

Keep helpers free of React.

## Acceptance Criteria

- Normal shifts calculate correctly.
- Overnight shifts calculate correctly.
- Breaks calculate correctly.
- Rate calculations use stable money handling.
- No-rate shifts calculate duration.
- Same start/end validation works.
- Unit tests pass.

---

# PHASE 3 — Core Single-Shift UI

## Goal

Recreate the essential Wagez experience with the new architecture.

## Tasks

1. Build full-screen calculator layout.
2. Create top display region.
3. Create center input panel.
4. Create bottom results region.
5. Create start time input.
6. Create end time input.
7. Create hourly rate input.
8. Create Do Math. button.
9. Create Reset action.
10. Connect state.
11. Implement calculation submission.

## Acceptance Criteria

- User can calculate a basic shift.
- Results are accurate.
- Top/middle/bottom structure is recognizable.
- Text is huge and bold.
- Gradient remains visible.
- Mobile UI fits screen.
- Do Math. triggers calculation.
- There is no artificial delay.

---

# PHASE 4 — Modern Time Entry

## Goal

Make entering time significantly faster than Wagez v1.

## Tasks

1. Build/refine custom time control.
2. Add hour editing.
3. Add minute editing.
4. Add AM/PM control.
5. Add quick minute values.
6. Add keyboard support.
7. Add Now shortcut.
8. Ensure all changes sync immediately.
9. Test on mobile.
10. Test accessibility.

## Acceptance Criteria

- Entering a shift is fast.
- Time can be edited without cumbersome native picker interaction.
- Keyboard input still works.
- Any valid minute is possible.
- Touch targets are large.
- No scroll-jank or accidental zoom.
- Top display updates immediately.

---

# PHASE 5 — Live Input State / Stale Results

## Goal

Implement the intended distinction between live input display and manual calculation.

## Tasks

1. Separate draft state from result state.
2. Update top display on every valid edit.
3. Preserve Do Math. as calculation trigger.
4. Detect when result no longer matches draft.
5. Mark stale result clearly.
6. Recalculate only when Do Math. is pressed.

## Acceptance Criteria

Example:

1. Enter:
   - 4:00 PM
   - 11:00 PM
   - $20
2. Top displays values immediately.
3. Bottom remains uncalculated.
4. Press Do Math.
5. Bottom displays result.
6. Change 11:00 PM to 11:30 PM.
7. Top immediately shows 11:30 PM.
8. Old result is visibly stale.
9. Bottom does not silently recalculate.
10. Press Do Math.
11. Correct new result appears.

---

# PHASE 6 — Dates and Saved Work Week

## Goal

Allow calculated shifts to be dated, saved, persisted, and grouped into weeks.

## Tasks

1. Add optional Add day/date control.
2. Store dates using ISO date strings.
3. Create saved-shift data model.
4. Create unique shift IDs.
5. Create storage layer.
6. Add Add to week action.
7. Create Week view.
8. Sort shifts chronologically.
9. Group shifts by week.
10. Add weekly totals.
11. Persist data.
12. Restore data on reload.

## Acceptance Criteria

- User can still calculate without a date.
- User can date a shift.
- User can add shift to week.
- Saved shift persists after refresh.
- Shifts sort chronologically.
- Weekly duration total is correct.
- Weekly wage total is correct.

---

# PHASE 7 — Shift Management

## Goal

Make the work week practical to maintain.

## Tasks

1. Add shift edit.
2. Add shift delete.
3. Add duplicate shift.
4. Add clear edit/cancel flow.
5. Recalculate on edit.
6. Keep IDs stable during edit.
7. Suggest next date during duplicate.
8. Update weekly totals immediately.

## Acceptance Criteria

- Editing changes totals.
- Deleting changes totals.
- Duplicate creates new ID.
- Duplicate does not overwrite source.
- Chronological order remains correct.

---

# PHASE 8 — Default Rate and Breaks

## Goal

Add practical quality-of-life features without cluttering the core workflow.

## Tasks

1. Add saved default hourly rate.
2. Load default rate for new shifts.
3. Allow per-shift override.
4. Add optional break selector.
5. Add quick break options.
6. Add custom break.
7. Integrate breaks into calculations.
8. Add validation.
9. Persist settings.

## Acceptance Criteria

- Default rate survives reload.
- Shift may override default.
- Break defaults to zero.
- Break subtracts from paid time.
- Earnings use paid time.
- Invalid break is rejected.
- UI remains compact.

---

# PHASE 9 — Overtime

## Goal

Add optional configurable weekly overtime calculation.

## Tasks

1. Add overtime settings.
2. Keep disabled by default.
3. Add threshold.
4. Add multiplier.
5. Calculate chronologically.
6. Split threshold-crossing shifts.
7. Support different shift rates.
8. Update weekly summary.
9. Add overtime tests.
10. Add clear disclaimer language.

## Acceptance Criteria

- Disabled mode behaves exactly like normal calculation.
- 40-hour threshold example works.
- Threshold-crossing shift works.
- Different rates work.
- Breaks do not count as paid/overtime time.
- No legal claims are made.

---

# PHASE 10 — Sharing

## Goal

Allow users to quickly export their weekly summary without creating an account.

## Tasks

1. Build text summary formatter.
2. Add Share action.
3. Use Web Share API when supported.
4. Use clipboard fallback.
5. Show success state.
6. Handle unsupported clipboard gracefully.

## Acceptance Criteria

- Weekly summary is readable.
- Sharing works on compatible mobile browsers.
- Copy works as fallback.
- No backend is needed.

---

# PHASE 11 — PWA / Offline

## Goal

Make Wagez installable and useful offline.

## Tasks

1. Create proper manifest.
2. Add app icons.
3. Configure theme metadata.
4. Add standalone display behavior.
5. Add appropriate caching/offline strategy.
6. Verify calculator offline.
7. Verify saved shifts offline.
8. Verify installability where supported.
9. Test mobile safe areas.

## Acceptance Criteria

- Wagez has real metadata.
- Wagez can be added to home screen where supported.
- Core functionality works without network after required assets are cached.
- Stored shifts remain accessible offline.

---

# PHASE 12 — Accessibility and Responsive Polish

## Goal

Ensure Wagez feels excellent rather than merely functional.

## Tasks

1. Keyboard audit.
2. Screen-reader label audit.
3. Contrast audit.
4. Focus-state audit.
5. Mobile layout audit.
6. Desktop layout audit.
7. Safe-area audit.
8. Reduced-motion audit.
9. Touch-target audit.
10. Form error audit.
11. Visual spacing refinement.
12. Text color experimentation if desired.

## Acceptance Criteria

- No critical accessibility problems.
- UI is usable without mouse.
- Text has strong contrast.
- No clipped content on mobile.
- No horizontal overflow.
- Giant text remains readable.
- Layout still resembles Wagez.

---

# PHASE 13 — Final QA

## Goal

Verify the complete application before release.

## Tasks

Run:

- lint;
- unit tests;
- UI tests;
- production build.

Manually verify:

- single shift;
- no-rate shift;
- overnight shift;
- break;
- saved shift;
- editing;
- deletion;
- duplication;
- weekly totals;
- overtime;
- persistence;
- share;
- PWA;
- offline behavior;
- mobile layout;
- desktop layout.

Perform a final code review for:

- dead code;
- duplicate logic;
- unnecessary dependencies;
- stale comments;
- console errors;
- placeholder metadata;
- starter assets;
- TypeScript artifacts.

## Acceptance Criteria

- Tests pass.
- Lint passes.
- Production build passes.
- No console errors during normal use.
- Core calculations have been spot-checked manually.
- Mobile experience is fast.
- No artificial delay exists.
- No unnecessary backend exists.

---

# PHASE 14 — Deployment

## Goal

Deploy Wagez v2 cleanly.

The hosting provider may be selected separately.

The architecture should remain compatible with modern Next.js hosting.

If deploying to Netlify:

1. Verify current official Next.js support.
2. Follow the current adapter/platform guidance.
3. Do not copy old CRA deployment configuration blindly.

If deploying elsewhere:

1. Verify Next.js support.
2. Verify PWA/offline behavior.
3. Verify HTTPS.
4. Verify production metadata.
5. Verify actual mobile deployment.

## Post-Deployment Checks

On the production URL:

1. Open homepage.
2. Calculate test shift.
3. Refresh.
4. Add shift to week.
5. Refresh again.
6. Confirm persistence.
7. Test installed/mobile experience.
8. Test share.
9. Test offline where supported.
10. Check browser console.
11. Check layout at several screen sizes.

---

# 93. Future Phase — Live Running Wage

Do not implement unless instructed.

Potential later phase:

## Goal

Allow user to see estimated money earned while currently working.

## Workflow

1. Enter start time.
2. Enter hourly rate.
3. Select:
   - "Still working"
     or equivalent.
4. Wagez displays:
   - elapsed time;
   - current estimated earnings.
5. Value updates periodically.
6. Enter clock-out time to finalize shift.

Architect current helpers so this feature can reuse them.

---

# 94. Potential Future Features Worth Preserving Space For

These are ideas, not current requirements.

Do not implement them without instruction.

Possible later features:

- recurring shift template;
- multiple saved job/rate presets;
- weekly history;
- simple monthly history;
- CSV export;
- theme variants that preserve the Wagez visual identity;
- home-screen quick actions;
- custom week boundaries;
- optional paid breaks;
- optional shift notes.

Do not prebuild unused infrastructure for them.

---

# 95. Components — Suggested Breakdown

Use judgment.

A reasonable component hierarchy might include:

```text
WagezApp

CalculatorView
├── CurrentInputDisplay
├── ShiftEditor
│   ├── TimeInput
│   ├── RateInput
│   ├── DateInput
│   ├── BreakInput
│   └── DoMathButton
├── ResultDisplay
└── AddToWeekButton

WeekView
├── WeekHeader
├── WeekSummary
├── ShiftList
│   └── ShiftCard
└── ShareWeekButton

Settings
├── DefaultRateSetting
├── WeekStartSetting
├── OvertimeSettings
└── ClearDataAction
```

Do not mechanically create components for every `<div>`.

Create components when they:

- have meaningful responsibility;
- are reusable;
- contain meaningful logic;
- improve readability.

---

# 96. Calculation Layer — Suggested Breakdown

A reasonable structure:

```text
lib/calculations/
├── shift.js
├── wages.js
├── overtime.js
└── validation.js
```

Possible pure functions:

```js
parseTime;
timeToMinutes;
calculateElapsedMinutes;
calculatePaidMinutes;
calculateShiftPay;
calculateShift;
calculateWeeklyTotals;
allocateOvertime;
```

Formatting belongs separately.

Example:

```text
lib/formatters/
├── time.js
├── duration.js
└── currency.js
```

Storage belongs separately.

Example:

```text
lib/storage/
├── schema.js
├── storage.js
└── migrations.js
```

Do not mix formatting, storage, calculation, and UI into one large utility file.

---

# 97. CSS / Tailwind Strategy

Tailwind is the primary styling approach.

Use CSS custom properties for permanent Wagez design tokens.

Use Tailwind classes for:

- layout;
- spacing;
- typography;
- responsiveness;
- common interaction states.

Use global CSS for:

- Wagez gradient;
- root variables;
- resets;
- special browser behavior;
- safe-area handling;
- highly reusable custom patterns.

Avoid massive arbitrary-value class strings repeated everywhere.

Extract repeated patterns intelligently.

---

# 98. Visual Character

The design should feel:

- bold;
- clean;
- slightly playful;
- modern;
- energetic;
- minimal.

It should NOT feel:

- corporate;
- fintech-serious;
- HR-like;
- enterprise;
- dashboard-heavy;
- sterile;
- pastel;
- template-generated.

Wagez should still look like Wagez.

---

# 99. Copy Style

Keep copy extremely short.

Good:

    Clocked-in:
    Clocked-out:
    Pay rate:
    You worked:
    and made:
    Do Math.
    Add to week
    This week
    Reset
    Edit
    Duplicate
    Delete

Avoid:

    Please select the time at which your work shift commenced.

Do not over-explain obvious controls.

---

# 100. Important Calculation Integrity Rules

Never:

- infer an hourly rate;
- infer a missing shift;
- silently repair obviously invalid user data;
- count unpaid break as paid time;
- interpret identical start/end as 24 hours without explicit support;
- use insertion order for overtime calculations;
- apply one shift's rate to another shift;
- round every intermediate operation repeatedly.

Centralize calculation rules.

---

# 101. Important UX Integrity Rules

Never:

- automatically save a shift merely because it was calculated;
- automatically calculate simply because an input changed;
- hide the "Do Math." interaction;
- force date entry for standalone calculations;
- force hourly rate entry for duration calculations;
- force account creation;
- require internet for basic use;
- cover the original gradient with an opaque application shell.

---

# 102. Important Data Integrity Rules

Never:

- use display text as a database key;
- use array indexes as shift IDs;
- store currency as uncontrolled floating point;
- depend solely on formatted dates;
- mutate saved shifts in place unpredictably;
- write to localStorage on the server;
- assume localStorage always contains valid data.

---

# 103. Definition of MVP Complete

Wagez v2 MVP is complete when all of the following are true:

## Single Shift

- Start time works.
- End time works.
- Hourly rate works.
- Rate may be omitted.
- Input values display immediately.
- Do Math. manually triggers calculation.
- Duration is correct.
- Earnings are correct.
- Overnight shifts are correct.
- Reset works.

## Visual Identity

- Exact gradient is preserved.
- Input state occupies upper visual region.
- Inputs occupy center.
- Results occupy lower visual region.
- Major values use huge bold typography.
- UI feels recognizably descended from Wagez v1.

## Work Week

- Date can be added.
- Calculated shift can be added to week.
- Multiple shifts can be saved.
- Shifts sort chronologically.
- Weekly time total is correct.
- Weekly earnings total is correct.
- Saved data survives reload.

## Practical Features

- Default hourly rate works.
- Break deduction works.
- Editing works.
- Deleting works.
- Duplicating works.
- Share/copy summary works.

## Optional Overtime

- Can be enabled.
- Can be disabled.
- Threshold is configurable.
- Multiplier is configurable.
- Math is tested.

## Application Quality

- Responsive.
- Accessible.
- Installable as PWA where supported.
- Core app works offline after initial caching.
- No backend required.
- No account required.
- No artificial calculation delay.
- Production build succeeds.
- Tests pass.

---

# 104. Final Product Principle

Whenever there are multiple ways to implement something, choose the option that best preserves this sequence:

    Open Wagez.
    Enter a shift.
    Press Do Math.
    Immediately understand the answer.

Everything else is secondary.

The work-week functionality should make Wagez more useful.

It must not make the calculator harder to use.

The best version of Wagez v2 is not the version with the most features.

It is the version where the original idea feels dramatically faster, smarter, cleaner, and more complete without losing its personality.

---

# PHASE 6 — Dates and Saved Work Week

## Goal

Allow calculated shifts to be dated, saved, persisted, and grouped into weeks.

## Tasks

1. Add optional Add day/date control.
2. Store dates using ISO date strings.
3. Create saved-shift data model.
4. Create unique shift IDs.
5. Create storage layer.
6. Add Add to week action.
7. Create Week view.
8. Sort shifts chronologically.
9. Group shifts by week.
10. Add weekly totals.
11. Persist data.
12. Restore data on reload.

## Acceptance Criteria

- User can still calculate without a date.
- User can date a shift.
- User can add shift to week.
- Saved shift persists after refresh.
- Shifts sort chronologically.
- Weekly duration total is correct.
- Weekly wage total is correct.

---

# PHASE 7 — Shift Management

## Goal

Make the work week practical to maintain.

## Tasks

1. Add shift edit.
2. Add shift delete.
3. Add duplicate shift.
4. Add clear edit/cancel flow.
5. Recalculate on edit.
6. Keep IDs stable during edit.
7. Suggest next date during duplicate.
8. Update weekly totals immediately.

## Acceptance Criteria

- Editing changes totals.
- Deleting changes totals.
- Duplicate creates new ID.
- Duplicate does not overwrite source.
- Chronological order remains correct.

---

# PHASE 8 — Default Rate and Breaks

## Goal

Add practical quality-of-life features without cluttering the core workflow.

## Tasks

1. Add saved default hourly rate.
2. Load default rate for new shifts.
3. Allow per-shift override.
4. Add optional break selector.
5. Add quick break options.
6. Add custom break.
7. Integrate breaks into calculations.
8. Add validation.
9. Persist settings.

## Acceptance Criteria

- Default rate survives reload.
- Shift may override default.
- Break defaults to zero.
- Break subtracts from paid time.
- Earnings use paid time.
- Invalid break is rejected.
- UI remains compact.

---

# PHASE 9 — Overtime

## Goal

Add optional configurable weekly overtime calculation.

## Tasks

1. Add overtime settings.
2. Keep disabled by default.
3. Add threshold.
4. Add multiplier.
5. Calculate chronologically.
6. Split threshold-crossing shifts.
7. Support different shift rates.
8. Update weekly summary.
9. Add overtime tests.
10. Add clear disclaimer language.

## Acceptance Criteria

- Disabled mode behaves exactly like normal calculation.
- 40-hour threshold example works.
- Threshold-crossing shift works.
- Different rates work.
- Breaks do not count as paid/overtime time.
- No legal claims are made.

---

# PHASE 10 — Sharing

## Goal

Allow users to quickly export their weekly summary without creating an account.

## Tasks

1. Build text summary formatter.
2. Add Share action.
3. Use Web Share API when supported.
4. Use clipboard fallback.
5. Show success state.
6. Handle unsupported clipboard gracefully.

## Acceptance Criteria

- Weekly summary is readable.
- Sharing works on compatible mobile browsers.
- Copy works as fallback.
- No backend is needed.

---

# PHASE 11 — PWA / Offline

## Goal

Make Wagez installable and useful offline.

## Tasks

1. Create proper manifest.
2. Add app icons.
3. Configure theme metadata.
4. Add standalone display behavior.
5. Add appropriate caching/offline strategy.
6. Verify calculator offline.
7. Verify saved shifts offline.
8. Verify installability where supported.
9. Test mobile safe areas.

## Acceptance Criteria

- Wagez has real metadata.
- Wagez can be added to home screen where supported.
- Core functionality works without network after required assets are cached.
- Stored shifts remain accessible offline.

---

# PHASE 12 — Accessibility and Responsive Polish

## Goal

Ensure Wagez feels excellent rather than merely functional.

## Tasks

1. Keyboard audit.
2. Screen-reader label audit.
3. Contrast audit.
4. Focus-state audit.
5. Mobile layout audit.
6. Desktop layout audit.
7. Safe-area audit.
8. Reduced-motion audit.
9. Touch-target audit.
10. Form error audit.
11. Visual spacing refinement.
12. Text color experimentation if desired.

## Acceptance Criteria

- No critical accessibility problems.
- UI is usable without mouse.
- Text has strong contrast.
- No clipped content on mobile.
- No horizontal overflow.
- Giant text remains readable.
- Layout still resembles Wagez.

---

# PHASE 13 — Final QA

## Goal

Verify the complete application before release.

## Tasks

Run:

- lint;
- unit tests;
- UI tests;
- production build.

Manually verify:

- single shift;
- no-rate shift;
- overnight shift;
- break;
- saved shift;
- editing;
- deletion;
- duplication;
- weekly totals;
- overtime;
- persistence;
- share;
- PWA;
- offline behavior;
- mobile layout;
- desktop layout.

Perform a final code review for:

- dead code;
- duplicate logic;
- unnecessary dependencies;
- stale comments;
- console errors;
- placeholder metadata;
- starter assets;
- TypeScript artifacts.

## Acceptance Criteria

- Tests pass.
- Lint passes.
- Production build passes.
- No console errors during normal use.
- Core calculations have been spot-checked manually.
- Mobile experience is fast.
- No artificial delay exists.
- No unnecessary backend exists.

---

# PHASE 14 — Deployment

## Goal

Deploy Wagez v2 cleanly.

The hosting provider may be selected separately.

The architecture should remain compatible with modern Next.js hosting.

If deploying to Netlify:

1. Verify current official Next.js support.
2. Follow the current adapter/platform guidance.
3. Do not copy old CRA deployment configuration blindly.

If deploying elsewhere:

1. Verify Next.js support.
2. Verify PWA/offline behavior.
3. Verify HTTPS.
4. Verify production metadata.
5. Verify actual mobile deployment.

## Post-Deployment Checks

On the production URL:

1. Open homepage.
2. Calculate test shift.
3. Refresh.
4. Add shift to week.
5. Refresh again.
6. Confirm persistence.
7. Test installed/mobile experience.
8. Test share.
9. Test offline where supported.
10. Check browser console.
11. Check layout at several screen sizes.

---

# 93. Future Phase — Live Running Wage

Do not implement unless instructed.

Potential later phase:

## Goal

Allow user to see estimated money earned while currently working.

## Workflow

1. Enter start time.
2. Enter hourly rate.
3. Select:
   - "Still working"
     or equivalent.
4. Wagez displays:
   - elapsed time;
   - current estimated earnings.
5. Value updates periodically.
6. Enter clock-out time to finalize shift.

Architect current helpers so this feature can reuse them.

---

# 94. Potential Future Features Worth Preserving Space For

These are ideas, not current requirements.

Do not implement them without instruction.

Possible later features:

- recurring shift template;
- multiple saved job/rate presets;
- weekly history;
- simple monthly history;
- CSV export;
- theme variants that preserve the Wagez visual identity;
- home-screen quick actions;
- custom week boundaries;
- optional paid breaks;
- optional shift notes.

Do not prebuild unused infrastructure for them.

---

# 95. Components — Suggested Breakdown

Use judgment.

A reasonable component hierarchy might include:

```text
WagezApp

CalculatorView
├── CurrentInputDisplay
├── ShiftEditor
│   ├── TimeInput
│   ├── RateInput
│   ├── DateInput
│   ├── BreakInput
│   └── DoMathButton
├── ResultDisplay
└── AddToWeekButton

WeekView
├── WeekHeader
├── WeekSummary
├── ShiftList
│   └── ShiftCard
└── ShareWeekButton

Settings
├── DefaultRateSetting
├── WeekStartSetting
├── OvertimeSettings
└── ClearDataAction
```

Do not mechanically create components for every `<div>`.

Create components when they:

- have meaningful responsibility;
- are reusable;
- contain meaningful logic;
- improve readability.

---

# 96. Calculation Layer — Suggested Breakdown

A reasonable structure:

```text
lib/calculations/
├── shift.js
├── wages.js
├── overtime.js
└── validation.js
```

Possible pure functions:

```js
parseTime;
timeToMinutes;
calculateElapsedMinutes;
calculatePaidMinutes;
calculateShiftPay;
calculateShift;
calculateWeeklyTotals;
allocateOvertime;
```

Formatting belongs separately.

Example:

```text
lib/formatters/
├── time.js
├── duration.js
└── currency.js
```

Storage belongs separately.

Example:

```text
lib/storage/
├── schema.js
├── storage.js
└── migrations.js
```

Do not mix formatting, storage, calculation, and UI into one large utility file.

---

# 97. CSS / Tailwind Strategy

Tailwind is the primary styling approach.

Use CSS custom properties for permanent Wagez design tokens.

Use Tailwind classes for:

- layout;
- spacing;
- typography;
- responsiveness;
- common interaction states.

Use global CSS for:

- Wagez gradient;
- root variables;
- resets;
- special browser behavior;
- safe-area handling;
- highly reusable custom patterns.

Avoid massive arbitrary-value class strings repeated everywhere.

Extract repeated patterns intelligently.

---

# 98. Visual Character

The design should feel:

- bold;
- clean;
- slightly playful;
- modern;
- energetic;
- minimal.

It should NOT feel:

- corporate;
- fintech-serious;
- HR-like;
- enterprise;
- dashboard-heavy;
- sterile;
- pastel;
- template-generated.

Wagez should still look like Wagez.

---

# 99. Copy Style

Keep copy extremely short.

Good:

    Clocked-in:
    Clocked-out:
    Pay rate:
    You worked:
    and made:
    Do Math.
    Add to week
    This week
    Reset
    Edit
    Duplicate
    Delete

Avoid:

    Please select the time at which your work shift commenced.

Do not over-explain obvious controls.

---

# 100. Important Calculation Integrity Rules

Never:

- infer an hourly rate;
- infer a missing shift;
- silently repair obviously invalid user data;
- count unpaid break as paid time;
- interpret identical start/end as 24 hours without explicit support;
- use insertion order for overtime calculations;
- apply one shift's rate to another shift;
- round every intermediate operation repeatedly.

Centralize calculation rules.

---

# 101. Important UX Integrity Rules

Never:

- automatically save a shift merely because it was calculated;
- automatically calculate simply because an input changed;
- hide the "Do Math." interaction;
- force date entry for standalone calculations;
- force hourly rate entry for duration calculations;
- force account creation;
- require internet for basic use;
- cover the original gradient with an opaque application shell.

---

# 102. Important Data Integrity Rules

Never:

- use display text as a database key;
- use array indexes as shift IDs;
- store currency as uncontrolled floating point;
- depend solely on formatted dates;
- mutate saved shifts in place unpredictably;
- write to localStorage on the server;
- assume localStorage always contains valid data.

---

# 103. Definition of MVP Complete

Wagez v2 MVP is complete when all of the following are true:

## Single Shift

- Start time works.
- End time works.
- Hourly rate works.
- Rate may be omitted.
- Input values display immediately.
- Do Math. manually triggers calculation.
- Duration is correct.
- Earnings are correct.
- Overnight shifts are correct.
- Reset works.

## Visual Identity

- Exact gradient is preserved.
- Input state occupies upper visual region.
- Inputs occupy center.
- Results occupy lower visual region.
- Major values use huge bold typography.
- UI feels recognizably descended from Wagez v1.

## Work Week

- Date can be added.
- Calculated shift can be added to week.
- Multiple shifts can be saved.
- Shifts sort chronologically.
- Weekly time total is correct.
- Weekly earnings total is correct.
- Saved data survives reload.

## Practical Features

- Default hourly rate works.
- Break deduction works.
- Editing works.
- Deleting works.
- Duplicating works.
- Share/copy summary works.

## Optional Overtime

- Can be enabled.
- Can be disabled.
- Threshold is configurable.
- Multiplier is configurable.
- Math is tested.

## Application Quality

- Responsive.
- Accessible.
- Installable as PWA where supported.
- Core app works offline after initial caching.
- No backend required.
- No account required.
- No artificial calculation delay.
- Production build succeeds.
- Tests pass.

---

# 104. Final Product Principle

Whenever there are multiple ways to implement something, choose the option that best preserves this sequence:

    Open Wagez.
    Enter a shift.
    Press Do Math.
    Immediately understand the answer.

Everything else is secondary.

The work-week functionality should make Wagez more useful.

It must not make the calculator harder to use.

The best version of Wagez v2 is not the version with the most features.

It is the version where the original idea feels dramatically faster, smarter, cleaner, and more complete without losing its personality.
