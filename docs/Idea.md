# FinTwin — The Idea, In Full

> *"Your financial future, simulated before it happens."*
> A graduation-project-grade financial digital twin for Egyptian households: model a real household's money, run macro and life shocks against it, and explain the results in Arabic with every number traceable back to the engine.

**Status of this document:** this is the project bible. It is written so that an agent with zero prior context can understand what FinTwin is, what already exists in this repo, what the engine actually computes, and what is deliberately out of scope. Every technical claim below was read out of the code in this repository on **13 November 2026**; anything not verified is marked *(unverified)*.

---

## 1. What FinTwin is

FinTwin is a **personal financial intelligence platform** built around one object: the **Financial Twin** — a structured, updatable model of a single household's income, expenses, cash, emergency savings, investments, assets, liabilities and goals.

The twin is not a budget tracker. It is the input to a **simulation engine** that answers counterfactual questions:

- What happens to this household if inflation runs at 25% instead of 12%?
- How many months of essential spending does the emergency buffer actually cover if fuel prices rise 25%?
- Can this household absorb three months of no income at all?
- Can the "Buy a Home" goal still be hit if expenses grow faster than income?
- If a car is bought on instalments in month 14, what happens to liquid assets and net worth over the next 36 months?
- Which single assumption moves the outcome the most — savings, income growth, inflation, returns, expenses, or the cost of the scenario itself?

**The one-line thesis:** traditional apps answer *"what happened to my money?"*. FinTwin answers *"what could happen to my money — and which decision changes it?"*

**The academic thesis (what makes it defensible):** the value is not in the number of AI agents or the number of screens. It is in a **deterministic financial engine that is validated against published Egyptian macro history**, plus **one accountable AI surface whose prose can be checked against the engine's numbers**.

## 2. The problem

Egyptian households make large, irreversible financial decisions under macro conditions they do not control:

- The EGP was devalued repeatedly after 2022; inflation peaked above 30% (2023) and is still double-digit (CBE headline y/y **13.9%**, core **14.1%** for September 2026).
- Fuel prices are set administratively by a pricing committee in periodic steps, and subsidy reform keeps passing through to transport, food and utilities.
- Instalment ("تقسيط") culture is the norm for cars, appliances and furniture; a single purchase can reshape cash flow for years.
- Marriage, housing and family support are large, planned-for events with short time horizons.

Existing tools fail this household in one of two ways: they *record* the past (spending trackers), or they simulate a **stable-currency** life (ProjectionLab, milize.co.jp and similar). Neither models an Egyptian household inside an Egyptian macro shock. And generic LLM chat advice cannot be audited — there is no way to check whether the number it just stated came from anywhere.

## 3. Who it is for

| | |
|---|---|
| **Primary user** | A salaried Egyptian household, roughly 25–40, income in EGP, one or two income sources, some debt or instalments, planning a marriage / home / car / education goal |
| **Embodied in the demo persona** | **Nour Adel** — the seeded demo user (`src/lib/demo.ts`, `src/lib/store.ts`), income **EGP 32,000/month**, expenses **EGP 21,400/month**, cash **48,200** (CIB), savings account **120,000**, investments **95,000** (Thndr), credit card **−8,500**, car asset **185,000**, gold **30,000**, car loan **41,200** at 12% with **1,250/month** over 38 months |
| **Demo goals** | *Buy a Home* — target **1,500,000**, current **126,000**, **8,500/month**, target date = January 1st eight years out · *Emergency Fund* — 110,700 target / 88,560 current / 1,000 per month · *Japan Trip* — 60,000 target / 18,000 current |
| **Access (demo build)** | `demo@fintwin.app` / `fintwin123`, plus an "Explore the demo Twin" button. Auth is simulated; signup routes through verify-email → onboarding, which overwrites the demo twin with the user's own numbers |
| **Currency** | EGP in the demo; the schema supports EGP, USD, EUR, GBP, SAR, AED, Other |

## 4. The Financial Twin — data model

Input shape (`TwinInput`, `src/lib/finance.ts`):

```
monthlyIncome, additionalIncome, expenses{category→amount}, cashSavings,
emergencySavings, monthlySavings, otherLiquid,
accounts[{type, balance}], assets[{type, value}],
liabilities[{balance, monthlyPayment, interestRate, remainingMonths}]
```

Supporting vocabulary already defined in code:

- **13 expense categories**, each flagged essential or flexible: housing, food, transportation, utilities, healthcare, education, debt payments, family support *(essential)*; entertainment, shopping, travel, subscriptions, other *(flexible)*.
- **6 account types:** bank, savings, cash, investment, credit, wallet.
- **7 asset types:** cash, bank, investment, property, vehicle, business, other.
- **6 liability types:** credit card, personal loan, mortgage, car loan, student loan, other.
- **11 goal types:** emergency fund, home, car, marriage, education, travel, retirement, business, debt-free, wealth building, custom.
- **8 employment types:** employed, self-employed, freelancer, business owner, student, unemployed, retired, other.

The persisted twin is relational in shape (`src/lib/types.ts`): User → FinancialProfile, Assumptions, Account[], Transaction[], Asset[], Liability[], Goal[], Scenario[], Simulation[], Notification[], Report[], AiMessage[]. It currently lives in an **in-memory store** (`src/lib/store.ts`) seeded from `src/lib/demo.ts`; the Postgres/Drizzle layer was removed.

## 5. Deterministic finance layer

`computeMetrics()` (`src/lib/finance.ts`) is the auditable core — pure arithmetic, no randomness:

| Metric | Definition |
|---|---|
| income | monthlyIncome + additionalIncome |
| expenses | essential + flexible across the 13 categories |
| savings / savingsRate | income − expenses; savings ÷ income |
| cash / investments | positive accounts split by type (investment type + investment assets = investments) |
| otherAssets / totalAssets / liquid | non-investment assets; liquid + otherAssets; cash + investments |
| totalDebt | negative account balances + liability balances |
| monthlyDebtPayments | liability payments + (card debt × 5%, minimum 250) |
| debtToIncome | monthlyDebtPayments ÷ income |
| emergencyCoverage | emergencySavings ÷ essential expenses (in months) |
| netWorth | totalAssets − totalDebt |
| stability | `fragile` if savings < 0 or coverage < 1.5 months · `watch` if coverage < 3 months, or savingsRate < 10%, or debtToIncome > 0.35 · else `stable` — each with a human-readable `stabilityNote` |

Closed-form helpers already present and testable: `requiredMonthly()` (annuity solve for the contribution needed to reach a target), `goalFutureValue()`, `goalStatus()` (probability ≥ 0.65 on_track · ≥ 0.40 attention · else at_risk), `splitExpenses()`, `monthsBetween()`. Six health dimensions are declared: cash_flow, emergency, debt, savings_rate, goals, net_worth_trend.

## 6. The simulation engine (the centre of the project)

`src/lib/simulation.ts` — 569 lines, pure TypeScript, runs on the server for stored simulations and in the browser for live previews.

**Shape of the computation**

- `runSimulation(twin, assumptions, params, {paths, seed, sensitivity, baseline})` → `SimResults`.
- Horizon: `months = max(12, round(horizonYears × 12))`. Default seed **1337**; stored dashboard simulations use **600 paths**; light previews use `quickProjection()` with **60 paths, seed 7**.
- Randomness: deterministic PRNG (`mulberry32`) + Box–Muller Gaussian, so a run is reproducible given the seed.

**Monthly loop, per path**

1. Income grows monthly at a per-path sampled rate (`incomeGrowth` ± 1.5 pts), then scenario income deltas apply if active in that month.
2. Expenses grow at `expenseGrowth` ± 2 pts, with ±4% monthly noise, then scenario expense deltas, extra monthly costs and one-time costs apply.
3. Debts amortise: interest = balance × rate ÷ 12, payment = min(scheduled payment, balance + interest).
4. Scheduled purchase (car/home): price inflated by the inflation assumption, down payment taken from cash (overflow into investments), a loan appended using the standard annuity payment formula.
5. Investments grow by a sampled monthly return (`investmentReturn`/12 + volatility/√12 × Gaussian); physical assets appreciate at their own monthly rate.
6. Net cash flow (`income − expenses − debt payments`) is allocated **70% to cash while cash is below a 6-month essential-expense buffer, otherwise 30%**; a negative net draws cash down, then investments, and any shortfall past zero is recorded as a **shortfall event** for that path.
7. Goal fund grows at the investment return and receives the goal contribution while inside the goal horizon.
8. Net worth = liquid assets + asset values − liability balances, recorded for every month.

**What comes out (`SimResults`)**

- Percentile fan: p5, p15, p25, p50, p75, p85, p95 + mean for every month; final-year percentiles plus min/max.
- A 24-bin histogram of terminal net worth (1st–99th percentile range).
- Goal block: hit probability across paths, median/p10/p90 fund at the target month.
- Risk block: `shortfallProbability`, `medianShortfall`, `emergencySurvivalMonths` (depletion months, capped at 240), `minLiquidP10`, a `level` of `low` (<5%) / `moderate` (<15%) / `elevated` (<35%) / `high`, and up to five ranked `drivers` (emergency coverage, debt load, expense-vs-income growth, market volatility exposure, scenario shock, plus income interruption when income falls).
- Cash-flow block: month 1, and month 12 median/p10/p90.
- `baseline`: the same twin simulated with no scenario parameters, so every scenario can be shown *against* the current plan.
- `sensitivity`: six one-at-a-time shifts, each re-run at 200 paths — monthly savings ±20%, income growth ±2 pts, inflation ±2 pts, investment return ±2 pts, expenses ±10%, scenario cost ±20% — sorted by impact.

## 7. Scenarios

`src/lib/scenarios.ts` ships a template library across seven categories:

| Category | Templates present in code |
|---|---|
| Career | Lose My Job · Get a Raise · Change Career · Start Freelancing · Start a Business |
| Life | Get Married · Have a Child · Move to a New City · Major Life Event |
| Housing | Buy a Home · Rent Increase · Take a Mortgage · Relocate Abroad |
| Transportation | Buy a Car · Replace Car · Transport Cost Increase |
| Economic | High Inflation · Recession · Lower Returns · Lower Income Growth |
| Savings | Save 15% More · Spend 10% Less · Accelerate Goal · Delay Goal |
| Custom | Custom Scenario |

25 templates in total, each a preset over the same parameter object.

Every scenario resolves to one `ScenarioParams` object: income change %, start month, duration; expense change % with start/duration; extra monthly expense; extra monthly income; one-time cost and one-time income (each with a month); savings change %; goal delay in months; optional purchase `{price, downPaymentPct, month, loanRate, loanYears, appreciation}`; and per-scenario assumption overrides.

**The scenario set the project commits to delivering (frozen):** inflation/devaluation · fuel and price rises · job loss — over a **36-month** horizon. Everything else in the template library stays available as configuration, not as new product surface.

## 8. Economic assumptions

`src/lib/economy.ts` holds six assumption keys — `inflation`, `incomeGrowth`, `expenseGrowth`, `investmentReturn`, `volatility`, `horizonYears` — each with a human-readable definition, a stated historical rationale, a description of how the model uses it, and a UI range.

Five presets ship with the app:

| Preset | inflation | incomeGrowth | expenseGrowth | investmentReturn | volatility |
|---|---|---|---|---|---|
| Normal | 12% | 8% | 10% | 11% | 14% |
| High Inflation | 25% | 12% | 22% | 13% | 18% |
| Recession | 8% | 2% | 7% | 3% | 24% |
| Low Growth | 9% | 4% | 8% | 6% | 12% |
| Strong Growth | 10% | 12% | 9% | 15% | 16% |

Default assumptions = Normal + a 10-year horizon. Four planning styles nudge the same numbers: cautious (−2 pts return, −2 pts income growth, +1 pt expense growth), balanced, growth (+2 pts return, +1 pt income growth), wide (+8 pts volatility). The assumption definitions carry the Egyptian historical framing in-product (e.g. headline inflation averaging roughly 13% over the last decade and exceeding 30% in 2023).

## 9. The AI surface

`src/lib/intelligence.ts` (355 lines) is a **rule-routed explainer**, not a chatbot wrapper: `detectIntent()` classifies the question, then a handler assembles the answer from engine output. The response contract (`AiAnswer`) is explicit and auditable:

```
intent, text, kpis[], chart?, assumptions[], dataUsed[], simulation?, actions[], followUps[], timestamp
```

That is already the right shape for accountability — the answer declares which assumptions and which data it used, and can attach the simulation behind it. Suggested questions in the product include "How long could my savings cover my expenses?", "What if I lose my income?", "Can I reach my home goal?", "What if I save 15% more?".

**The rule the project freezes:** the LLM is a **narrator over engine output**. It may not change a number, invent one, or answer a quantitative question without a computed value behind it. That is what makes the AI surface evaluable (see §12).

## 10. What already exists in this repo (verified 13 Nov 2026)

**Stack:** Next.js 16.2.6 · React 19.2.6 · TypeScript 5.9.3 · Tailwind 4.1.17 · framer-motion 14 · lucide-react 1.53. Frontend-only: no API routes, no database, no `.env`; reads/writes go through a `"use server"` action layer (`src/lib/server-api.ts`) reached by a fetch shim (`src/lib/client-api.ts`) installed in `src/components/providers.tsx`, so existing components calling `fetch("/api/...")` keep working.

**Engine and data layer** (`src/lib`, 3,556 lines total): `simulation.ts` 569 · `server-api.ts` 711 · `scenarios.ts` 388 · `intelligence.ts` 355 · `data.ts` 282 · `finance.ts` 236 · `store.ts` 227 · `economy.ts` 168 · `types.ts` 159 · `client-api.ts` 128 · `demo.ts` 100 · `twin.ts` 58 · `format.ts` 86 · `accent.ts` 86.

**UI:** `src/components` ≈ 6,100 lines (views, charts, shell, UI kit, motion); routes grouped as

- `(public)` — landing, features, how-it-works, product, security, faq, showcase
- `(auth)` — login, signup, forgot-password, reset-password, verify-email
- `(app)` — overview, twin, accounts, transactions (+import/new), goals (+planner), scenarios (+ai/new), simulations (+new/compare), analytics (cash-flow, spending, savings, debt, net-worth), economy (+presets), health, reports (+new), ai, notifications, profile, settings (ai, data, notifications, privacy, simulation)
- `onboarding` — the twin builder flow · `demo` — an autoplay product demo

**Repo state:** 5 commits on `origin: github.com/ahmedbadry4151/fin.git`; `docs/`, `issues/` and `brag-output/` untracked; `npm run typecheck` **green**; `npm run build` **green**; `npm run lint` **red — 19 problems (18 errors, 1 warning)**, mostly `react-hooks/purity` and `react/no-unescaped-entities` under `src/components`; **there is no test runner and no test file**.

**Recorded defects** (`issues/FinTwin-Web-App-Review.md`, 20 Oct 2026 — from a full-stack build, so some of these are historical): login 500, simulation 500, AI unavailable, dead Run/Edit/Duplicate actions on `/scenarios` cards, `/scenarios/<number>` 404 (routes are slug-based), generic error copy, FAQ answers collapsed, and — still structurally true today — **the same concept reported with different numbers in different places** (median net worth, goal probability, and **60 paths** in the light projection versus **600** in stored simulations) because two code paths produce them.

## 11. What does not exist yet (honest gap list)

1. **No tests** — the engine has never had a guard. Nothing today proves cash conservation, monotonicity, or amortisation correctness.
2. **No validation against reality** — the engine has never reproduced a published Egyptian CPI or fuel-price series. "The model is plausible" is currently an opinion.
3. **No real data pipeline** — no `data/` directory, no CPI/fuel series, no backtest command.
4. **No AI evaluation** — the narrator is rule-based and untested for numerical faithfulness.
5. **No persistence** — the in-memory store resets on every server restart; data is synthetic.
6. **Inconsistent figures** — multiple code paths produce the same metric differently (see §10).
7. **No CI, no clean-clone proof** — build has not been verified from a fresh clone on another machine.
8. **Lint red** — the quality gate is currently failing.

## 12. Definition of Done (the project's completion gate)

The project is deliverable when all six hold simultaneously:

1. `typecheck` + `lint` + `test` all green, with the test count stated in the README.
2. **A backtest**: one command prints the engine's error when reproducing Egyptian macro history (monthly CPI + fuel prices, 2016→2025) against an **explicitly declared error bound** — and if the bound cannot be met, the bound is changed and the reason documented.
3. Every number in any screen or report originates in a function under `src/lib/`.
4. At least one AI surface with a one-command eval: claim→value precision/recall over 30 frozen cases.
5. `npm run build` green and the demo runs from a clean `git clone`.
6. An evidence table in the final report: each claim paired with the command that proves it.

## 13. Scope: committed vs deferred

**Committed:** the existing TypeScript engine hardened with tests and a backtest · three scenario families (inflation/devaluation, fuel and price rises, job loss) at a 36-month horizon · one grounded Arabic narrator with a numerical-faithfulness eval · one Arabic → scenario-spec parser with an accuracy eval · report with evidence table.

**Deferred (documented, not rejected):** RAG · pgvector · LangGraph · multi-agent orchestration · reviving the backend/Postgres · extra Monte Carlo variants or reweighting · CSV import · Docker · any new page · Supabase.

**Why the scope is frozen here:** a prior architecture for this project (NestJS + Prisma + PostgreSQL), and a second one for a different project, were designed in detail and never existed on disk. The failure mode is designing instead of shipping. Every item above is a *later* item, not a *never* item.

## 14. Egyptian data sources (checked 13 Nov 2026)

| Source | Form | What it gives | Note |
|---|---|---|---|
| World Bank API | Free JSON, no key | Annual CPI inflation, Egypt | `api.worldbank.org/v2/country/EGY/indicator/FP.CPI.TOTL.ZG?date=2015:2025&format=json` returned 2023: 33.88 · 2024: 28.27 · 2025: 14.07 *(verified)* |
| Central Bank of Egypt | Excel / HTML / PDF downloads | Headline and core inflation, m/m and y/y, historical series | Page updated 9 Nov 2026; September 2026 headline y/y **13.9%**, core **14.1%** *(verified)* |
| CAPMAS | Public statistics portal + a statistics API for the CPI catalogue | Monthly CPI, multiple base years (1995/96 → 2018/19), urban/rural/total and governorate breakdowns | Third-party mirrors publish the same data as Parquet (~43,800 rows, 2010→2026, monthly) *(verified that the sources exist; the API contract itself unverified)* |
| Fuel Pricing Committee (FAPC) | Administrative price decisions, publicly documented | Fuel price steps — a piecewise-constant series, straightforward to encode | Supported by IMF reporting on subsidy reform *(verified)* |
| HIECS household survey | Public-use microdata, registration/licence gated | Household income and expenditure distribution | **Unverified** — check licence before relying on it |

The Egypt-specific angle is the differentiation: a stable-currency simulator structurally cannot model these shocks.

## 15. Honesty constraints (product-level, non-negotiable)

- FinTwin **does not** connect to bank accounts and **does not** execute transactions.
- FinTwin **does not** store real financial data in the current build — all data is synthetic and in-memory.
- Simulation output is an **estimate conditional on assumptions**, not a prediction. Every stored simulation carries its assumptions and seed.
- The product is **not financial advice**; the app says so in-product.
- Any number presented to the user — in a chart, a KPI, a report or Arabic prose — must be reproducible from the twin input, the assumptions, the scenario parameters and the seed.

## 16. Glossary

**Twin** — the structured model of one household's finances. **Scenario** — a set of parameter deltas applied to the twin. **Simulation** — one run of the engine over a scenario (or the baseline) at N paths and a seed. **Baseline / Current Plan** — the same twin with no scenario parameters, used as the comparison. **Path** — one Monte Carlo realisation of the next N months. **Shortfall** — a path whose liquid assets hit zero. **Emergency survival** — how many months the emergency savings cover essential expenses. **Sensitivity** — how much terminal net worth moves when one assumption shifts. **Backtest** — feeding the engine real historical shocks and measuring the error. **Fan chart** — the p5–p95 percentile band over time.

## 17. How this document was produced

Repo inspection (engine, data layer, routes, git state, lint/build/typecheck runs) on 13 November 2026, plus an LLM-council review of the original FinTwin proposal — five independent advisors, a peer-review round, and a chairman synthesis — whose verdict set the frozen scope in §12–§13: keep the deterministic engine as the deliverable, cut the multi-agent orchestration from the critical path, localise to Egyptian macro data, and make exactly one AI surface measurable.

The companion file `docs/AGENTS.md` turns this into an enforced contract: work order P0→P5, gate commands, frozen files, and the working rules every agent follows in this repo.
