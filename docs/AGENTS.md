# AGENTS.md — FinTwin Implementation Contract

**This file is the contract.** Any agent (opencode / pi / Antigravity / Hermes) working in this repo reads it before writing a line of code, and follows it literally. If a momentary instruction from Ahmed conflicts with this file, **this file wins** — unless Ahmed says explicitly that he is amending it.

- **Repo:** `C:\Users\ahmed\OneDrive\Desktop\fintwin-fable_5.1 (1)` — remote: `github.com/ahmedbadry4151/fin.git`
- **Contract last updated:** 13 November 2026
- **Current shape:** Next.js 16.2.6 / React 19.2.6 / TypeScript 5.9.3 / Tailwind 4.1.17 — **frontend-only**: the backend and Postgres were removed, data lives in an in-memory store. No test runner. No `.env`.

---

## 1. Read first (pointers)

| File | Read it when |
|---|---|
| `docs/Idea.md` | Before any design work — the idea, the scope, the deferred list (single source of truth) |
| `issues/FinTwin-Web-App-Review.md` + `issues/FinTwin-Design-Performance-Report.md` | Before touching UI, or before claiming anything works |
| `graphify-out/GRAPH_REPORT.md` | When you need a map of the repo instead of walking it |
| `README.md` | For the current architecture (written during the frontend-only conversion) |

## 2. The idea in two lines

A **deterministic** personal finance engine that builds a digital twin of an Egyptian household and runs shock scenarios (inflation, fuel, job loss) over a **36-month** horizon — with one **accountable AI surface** on top that explains the numbers in Arabic, where **every number in the prose traces back to a computed value**.

**The premise:** the value is in the engine being correct and explainable — not in the agent count, not in the page count.

## 3. Verified state (13 Nov 2026)

| Command | Actual result |
|---|---|
| `npm run typecheck` | ✅ Clean (zero errors) |
| `npm run lint` | ❌ **Red — 19 problems (18 errors + 1 warning)**, mostly `react-hooks/purity` and `react/no-unescaped-entities` under `src/components/` |
| `npm run test` | ⛔ Does not exist — no test runner, no test file |
| `npm run build` | ✅ Green (built 13 Nov 2026 — the full route table compiled: `(app)` + `(auth)` + `(public)` + demo) |
| `git status` | `docs/`, `issues/`, `brag-output/` **untracked** · `next-env.d.ts` modified · 5 commits |
| Simulation engine | Real and present: `src/lib/simulation.ts` (569 lines, Monte Carlo) · `finance.ts` · `scenarios.ts` · `economy.ts` · `intelligence.ts` |

> The rule that governs everything here: **"on disk" ≠ "verified".** Any number you write anywhere comes out of a command you actually ran.

## 4. Definition of Done

The project is deliverable (viva-defensible) when all six of these hold at the same moment:

1. `npm run typecheck` + `npm run lint` + `npm run test` are **all green**, with the test count written in the README.
2. **A real backtest:** one command prints the engine's error when reproducing Egyptian history (monthly CPI + fuel prices, 2016→2025) against an **explicitly declared error bound**. If the model cannot meet the bound, change the bound and document why — never hide it.
3. **Every number in any screen or report comes from a function in `src/lib/`** — zero hand-typed numbers, zero duplicated sources for the same figure.
4. **At least one AI surface with a one-command eval:** every number in the Arabic prose traces to a computed value (claim→value precision/recall over 30 frozen cases).
5. `npm run build` green, and the demo runs from a clean `git clone` on another machine.
6. **An evidence table:** in the final report, next to every claim, the command that proves it (same pattern as `FREEZE.md` in the AI-Agent-Engineering project).

## 5. Scope

### 5.1 What we keep building
- The existing TypeScript engine in `src/lib/` is the **core deliverable**. Harden it with tests and a backtest. It does not get rewritten in Python/FastAPI.
- Scenarios: **inflation / devaluation** · **fuel and price rises** · **job loss** — over a **36-month** horizon.
- The existing 600-path Monte Carlo stays running as-is, on the condition that one consistent figure appears across every screen.

### 5.2 Deferred work (documented, not rejected)
None of this starts before the DoD is met: RAG · pgvector · LangGraph · 5 agents · reviving the backend/Postgres · extra Monte Carlo variants or weights · CSV import · Docker · any new page · Supabase.

The priority is always **prove it correct** over **make it bigger**.

### 5.3 Frozen files (touched only for a fix named in `issues/`)
`src/lib/store.ts` · `src/lib/types.ts` · `src/lib/data.ts` · `src/lib/server-api.ts` · `src/lib/client-api.ts` · `src/app/**`

## 6. Work order (every phase closes on a written criterion)

### P0 — Repo hygiene and runnable truth
- Commit `docs/`, `issues/`, `brag-output/`; clean up `next-env.d.ts` and `tsconfig.tsbuildinfo`.
- Re-run `npm run build` and record the result in the README.
- **Passes when:** `git status` is clean + `npm run typecheck` green + the `build` result is written down.

### P1 — Engine guards (tests)
- Add the gate with no new dependencies: Node 26 strips TypeScript natively, so `node --test src/**/*.test.ts` runs. Add a script named `test`.
- Test `simulation.ts` and `finance.ts` for: cash conservation (opening + in − out = closing), monotonicity (higher expenses never raise savings), and closed-form amortization (compare against the annuity formula).
- **Determinism:** the same seed produces identical paths (an explicit test) — so plant the seed in `runSimulation`.
- **Passes when:** `npm run test` green, the count is in the README, and the determinism test exists.

### P2 — Egyptian data + backtest
- Extract into `data/`: monthly CPI + fuel prices (administrative steps) from 2016 to the latest available month.
- Write `npm run backtest`: it feeds the engine real shocks and prints the error plus the accepted bound.
- **Passes when:** the command prints an error figure and a declared bound. If the data is unavailable, that is a **scope decision** — document it immediately, never bury it.

**Sources verified (13 Nov 2026):**

| Source | Form | Note |
|---|---|---|
| World Bank API | Free JSON, no key | `api.worldbank.org/v2/country/EGY/indicator/FP.CPI.TOTL.ZG?date=2015:2025&format=json` → 2023: 33.88 · 2024: 28.27 · 2025: 14.07 |
| CBE — Inflation Historical Data | Excel/HTML/PDF download | Updated 9 Nov 2026 · Sep 2026: headline y/y **13.9%**, core **14.1%** |
| CAPMAS CPI | Public statistics API + Parquet mirrors on Hugging Face | Monthly, ~43.8k rows, 2010→2026, governorates, multiple bases |
| Fuel Pricing Committee (FAPC) | Administrative decisions, documented (tables + IMF reports) | **Step functions** — straightforward to encode |
| HIECS microdata | ⚠️ **Unverified** — licence and registration must be checked | If this blocks, the macro framing stops and it becomes a decision |

### P3 — The accountable AI surface (grounded narrator)
- One LLM takes engine JSON and writes Arabic prose. **Behind an interface**, so that with no API key a local mock (Ollama) keeps the experience running.
- One-command eval over **30 frozen cases**: every number in the prose must trace to a computed value → precision/recall.
- **Passes when:** `npm run eval:narrator` prints precision/recall and passes at the declared threshold.

### P4 — Second AI surface: Arabic → scenario spec parser
- A sentence like «لو الأسعار زادت 15% وأنا قعدت 3 شهور بدون شغل» becomes a validated `ScenarioParams` object.
- Eval: exact-match over **40 sentences**.
- **Passes when:** `npm run eval:parser` prints the accuracy.

### P5 — Report + evidence table
- Updated README + a report covering: problem, design, implementation, results (from P2/P3/P4), limitations, future work, and the evidence table.
- **Passes when:** every number in the report sits next to the command that generated it.

## 7. Working rules for every agent

1. **One step = one commit**, message `P<n>: <what changed>`, with `npm run test` green after it. Never commit on a red tree.
2. **Numbers come from the engine only.** Every figure in UI or a report comes from a function in `src/lib/`. A hand-typed number is a bug.
3. **Claims get re-run.** Before writing "working" or "done", run the command and read the output. If you did not run it, write "unverified".
4. **Dependencies:** use tools already present (the Node test runner ships with Node 26). Any new package (test framework, LLM SDK) gets one line in the README explaining why no install-free alternative exists.
5. **Generated artifacts** (`brag-output/`, `graphify-out/`) stay untracked unless Ahmed asks otherwise.
6. **Arabic stays Arabic:** UI copy in Arabic with English technical terms (`Monte Carlo`, `scenario`, `backtest`). Do not translate the terms.

## 8. Known traps (from `issues/` + a real check)

- **One figure per concept:** today the same concept (median / goal probability / paths) shows four different values across the homepage and dashboard, and **60 paths** in one place versus **600** in another. Any work touching a figure unifies it.
- **In-memory store:** data resets on every restart, so whoever generates report figures works in one session and records the command.
- **Dead links:** `/scenarios` cards have Run/Edit/Duplicate that do nothing, and `/scenarios/<number>` 404s (the route is slug-based).
- **Generic error messages** ("Something went wrong.") — a new message states the cause and the next step.
- **The fan chart** had a hydration mismatch, fixed in commit `9512936` — any chart change is checked against `npm run build`, not just `dev`.
- **`next-env.d.ts` and `tsconfig.tsbuildinfo`** change on every dev/build run — commit them alongside their work so the tree stays clean.

## 9. Gate commands

```bash
npm run typecheck     # must always be green
npm run lint          # currently red (18 errors) — closes in P0
npm run test          # added in P1 (node --test)
npm run build         # before any claim that the artifact is sound
npm run backtest      # added in P2
npm run eval:narrator # added in P3
npm run eval:parser   # added in P4
```
