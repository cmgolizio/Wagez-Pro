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

## Project layout

```
src/app/       App Router routes, layout, global styles and design tokens
docs/          build-plan.md — the authoritative specification
```

## Contributing

`docs/build-plan.md` is the source of truth for scope, visual identity and
calculation rules. Read it before changing anything.
