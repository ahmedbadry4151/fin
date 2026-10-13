# FinTwin — Frontend-Only Build

A living financial digital twin: model your finances, test scenarios, run Monte Carlo simulations, and generate reports. **This is now a frontend-only project** — the backend API and Postgres database have been removed and replaced with an in-memory demo data layer.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Other scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

### Demo login

- **Email:** `demo@fintwin.app`
- **Password:** `fintwin123`

On the login page there is also an **"Explore the demo Twin"** button that logs you straight in. No environment variables are needed — there is no `DATABASE_URL` or `SESSION_SECRET` anymore.

## What changed

The project was converted from a full-stack app (Next.js + API routes + Drizzle ORM + PostgreSQL) into a **frontend-only demo** with in-memory data.

### Removed (backend + database)

- `src/app/api/` — all 17 API route handlers (accounts, transactions, goals, scenarios, simulations, reports, ai, auth, profile, onboarding, search, notifications, assumptions, assets, liabilities, data export, health)
- `src/db/` — Drizzle schema and the `pg` connection pool
- `src/lib/session.ts` — cookie sessions and password hashing
- `src/lib/seed.ts` — database seeding
- `drizzle.config.json`
- Dependencies: `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `dotenv`

### Added / rewritten

| File | Purpose |
|---|---|
| `src/lib/types.ts` | Plain TypeScript row types (same shapes the old Drizzle schema returned) |
| `src/lib/store.ts` | In-memory singleton store, seeded with the demo twin (Nour Adel's data: accounts, 7 months of transactions, goals, scenarios, simulations, notifications, reports) |
| `src/lib/data.ts` | Same query API as before (`getCurrentUser`, `getTwin`, `getTransactions`, `runAndStoreSimulation`, …) but reads/writes the in-memory store instead of the database |
| `src/lib/server-api.ts` | `"use server"` server actions that replicate every old `/api/*` endpoint's request/response contract |
| `src/lib/client-api.ts` | A `fetch` shim that intercepts browser calls to `/api/*` and routes them to the server actions, so **all view components work unchanged**. Also provides `exportAllData()` / `exportReport()` for downloads |

### How it works

1. **Pages** (server components) read from the in-memory store in `src/lib/store.ts`, seeded with realistic demo data on first access.
2. **Client components** still call `fetch("/api/...")` exactly as before. The shim in `src/lib/client-api.ts` (installed via `src/components/providers.tsx`) intercepts those calls, executes the matching server action from `src/lib/server-api.ts`, and returns a normal JSON `Response`.
3. Mutations (add account, edit expenses, run a simulation, delete a goal, …) update the server-side in-memory store, then `revalidatePath` + `router.refresh()` re-render the server components with fresh data — the app behaves exactly like before.
4. The Monte Carlo engine, AI explainer (`src/lib/intelligence.ts`), scenario templates, and all charts are pure frontend code and run unchanged.
5. Download buttons (JSON export, CSV/Excel reports) now generate a Blob in the browser and trigger a download client-side.

### What this means in practice

- **No database, no `.env`, no backend server to run** — everything lives in one Next.js process.
- Data resets when the server restarts (it is rebuilt from the demo seed).
- Auth is simulated: login/signup accept any credentials and route to the demo twin or the onboarding flow.
- Only the **demo user** exists; signing up routes through verify-email → onboarding, which overwrites the demo twin with your own numbers.
- Simulations still run for real (600 paths by default) using the client-requested parameters.

## Other useful scripts

```bash
npm run lint        # ESLint (a few pre-existing warnings/errors in chart components)
npm run typecheck   # tsc --noEmit
```

## Project structure

```
src/
  app/
    (app)/        # main app pages (overview, twin, goals, simulations, …)
    (auth)/       # login, signup, password reset, verify email
    (public)/     # marketing pages (statically prerendered)
    onboarding/   # twin builder flow
    demo/         # autoplay product demo
  components/     # views, charts, shell, UI kit, motion
  lib/
    store.ts      # in-memory data store + demo seed
    types.ts      # row types (mirrors the old DB schema shapes)
    data.ts       # query layer used by server components
    server-api.ts # server actions (the old API handlers, in-memory)
    client-api.ts # browser fetch shim for /api/* + export helpers
    finance.ts / simulation.ts / economy.ts / twin.ts / intelligence.ts  # pure engine logic
```

> **Note:** this is an educational demo, not financial advice. All data is synthetic and in-memory.
# fin
