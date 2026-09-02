# Wagez Pro

A small, fast wage and shift calculator.

> I worked from this time to this time, at this rate.
> How long did I work, and how much did I make?

Wagez runs entirely in the browser. There is no account, no backend, and no
network requirement for the math — saved data lives in local storage on the
device.

## Stack

- Next.js (App Router) with Turbopack
- React
- Plain JavaScript — **no TypeScript**
- Tailwind CSS v4
- ESLint

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Command         | What it does                 |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Production build             |
| `npm start`     | Serve the production build   |
| `npm run lint`  | Lint the project             |
| `npm test`      | Run the test suite           |

## Project layout

```
src/app/         App Router routes, layout, global styles, design tokens, manifest
src/components/  React components, grouped by view
src/lib/         Pure logic: calculations, formatters, dates, time entry — no React
public/          Static files: app icons and the service worker
scripts/         One-off asset generation — the app icons are drawn here
tests/           Vitest unit and component tests
docs/            build-plan.md — the authoritative specification
```

Calculation, formatting and presentation stay in separate layers: nothing in
`src/lib/` imports React, and components never re-implement the math.

## Installing and offline

Wagez is a progressive web app: it can be added to a home screen and opens in a
window of its own. `public/sw.js` keeps a copy of the application on the device
when it is first visited, so the calculator, the week and everything saved in it
keep working with no connection. The worker is registered in production builds
only — `npm run dev` unregisters it instead, so the dev server is never answered
by a copy of a previous build.

The icons are drawn from the Wagez gradient by `scripts/generate-icons.mjs`. Run
`node scripts/generate-icons.mjs` after changing it and commit the result; the
build does not regenerate them.

## Contributing

`docs/build-plan.md` is the source of truth for scope, visual identity and
calculation rules. Read it before changing anything.
