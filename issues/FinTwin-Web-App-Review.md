# FinTwin — Web App Review (Issues Report)

**URL reviewed:** https://symmetrical-waffle-x5675x9r56c9764-3000.app.github.dev/
**Date:** 20 Oct 2026 · Browser: Chrome (CDP), Windows 11
**Scope:** Every public page + every authenticated dashboard route, with real flows exercised (login, simulation run, AI question, FAQ accordions, report builder, scenario card interactions).

---

## 1. Blocker Issues

### 1.1 Login is completely broken (HTTP 500)
- **What happened:** Submitting the login form with the site's own advertised demo credentials (`demo@fintwin.app` / `fintwin123`) fails every time with only "Something went wrong."
- **Evidence (captured from the page's own fetch log):**
  - `POST /api/auth/login` → **HTTP 500**, response `{"error":"Something went wrong."}`
  - A second, stray request `POST /login` → **HTTP 500** with `"Invalid Server Actions request."` and digest `74011437@E80`
- **Also:** the same two endpoints are **404** when probed directly from outside the page — the API layer isn't mounted where the client expects it.
- **Impact:** A first-time visitor following the login page's own hint cannot get in. Only the "Explore the demo Twin" workaround path works.

### 1.2 The Monte Carlo simulation engine fails to run (HTTP 500)
- **What happened:** On `/simulations/new`, clicking **Run Simulation** (tested twice: once with a goal + scenario selected, once as pure baseline with no goal and no scenario) returns:
  - **"We couldn't complete this simulation. The engine returned an error. Check that your Twin has income and expenses, then try again."**
- **Evidence:** The demo Twin clearly has income (EGP 32,000) and expenses (EGP 21,400), so the error message is misleading. This is the product's core promise ("Simulate what's next") and it is broken in the running dev build.
- Note: historical simulation rows (Current Plan / Lose My Job / Save 15% More) exist with plausible numbers, so the engine worked at some point — currently it does not.

### 1.3 The AI Financial Intelligence feature is down
- **What happened:** On `/ai?q=What happens if I lose my income?`, the answer panel shows:
  - **"AI analysis is temporarily unavailable. Your data is intact — try again in a moment."**
- **Evidence:** The AI page's "Financial Context" sidebar loads fine (Net Worth EGP 428,500, etc.), so data access works — the AI generation path itself is failing. On a demo marketed as having "Grounded AI explanations," this is a headline feature that does not work.

---

## 2. Major UX / Design Issues

### 2.1 "Run" buttons on scenario cards do nothing
- On `/scenarios`, each card shows **Run / Edit / Duplicate** actions. Clicking **Run** does nothing: no navigation, no loading state, no API call (verified by hooking `window.fetch` — zero requests fired).
- The card body is an `<a>` tag but has **no `href`** — clicking the card body also does nothing.
- Actual scenario detail pages exist only at guessed URLs (`/scenarios/lose-my-job`); there is no discoverable navigation to them from the cards.
- `/scenarios/1` (numeric id) renders a styled 404 — "This page isn't part of the model."

### 2.2 Generic, unhelpful error messages everywhere
- Login: **"Something went wrong."** — no field errors, no hint whether email or password was wrong, no retry guidance.
- Simulation: **"The engine returned an error. Check that your Twin has income and expenses"** — misleading, since the Twin does have both.
- AI: **"AI analysis is temporarily unavailable."** — no error code, no diagnostic.
- No toast/snackbar/toast-duration patterns; errors just appear as static text.

### 2.3 FAQ page ships with all answers collapsed
- `/faq` initially shows only 6 question labels with no visible content — the page reads as empty until each accordion item is manually expanded.
- This hurts both users and SEO (search engines and screen readers may index nothing useful from this page).

### 2.4 Homepage live-widget numbers are internally inconsistent
- On the landing page hero, the same dashboard shows **two different snapshots at different times**:
  - First load: `CASH FLOW +EGP 10,600`, `BUY A HOME 50%`, `Median EGP 3.07M`, `5th–95th 1.92M–4.49M`
  - After navigating away and back: `CASH FLOW +EGP 12,190`, `BUY A HOME 67%`, `Median EGP 3.55M`, `5th–95th 2.42M–4.89M`
- Meanwhile, the authenticated Overview page reports **Median EGP 3.13M** for the Current Plan and the marketing copy claims **3.4M median / 52% goal probability**. Four different numbers for the same concept.
- The homepage chart also says "60 simulated paths" while the dashboard uses "600 paths" — inconsistent path counts for the same underlying model.

### 2.5 `/scenarios` "Run" labels are ambiguous
- Each scenario card's timestamp reads "Run 9 min ago" / "Run 13 min ago" — a button label ("Run") jammed against a timestamp reads like a confusing command, not a status.

---

## 3. Performance Issues

### 3.1 Dev-mode bundle: heavy, unminified, waterfalls
- Every page loads the **Next.js Turbopack dev client** (`[turbopack]_browser_dev_hmr-client…`, `next-devtools`, `__nextjs_original-stack-frames`) — dozens of separate unminified chunks per page instead of one production bundle.
- The homepage alone pulled **~30 JS chunk requests**, including one dedicated chunk per lucide-react icon (`node_modules_lucide-react_dist_esm_icons_index_mjs…`, `…_0jo5mc3…`, `…_0nk5au4…`) — the icon library is not tree-shaken.
- Google Fonts is loaded as a **render-blocking external stylesheet** (`fonts.googleapis.com/css2?family=Manrope…`), plus a second font (`geist-latin.woff2`) served by Next — two competing font systems (Manrope vs Geist) on the same site.
- These are expected in dev mode but must be flagged: **the app has never been shown in a production build** in this review, so real performance cannot be certified.

### 3.2 SPA navigation stalls and tab crashes under normal clicking
- Several route transitions timed out mid-navigation (`Page.navigate timed out after 5s`) and left the tab dead (`chrome-error://chromewebdata/`) requiring full re-open.
- This happened twice during a normal click-through session — under real user conditions, a hung navigation or a dead tab is a crash, not a glitch.

### 3.3 No caching signals
- No `Cache-Control` strategy is observable on chunk responses (Codespace tunneling may mask this, but there's also no evidence of an optimization pass: no code-splitting beyond Next defaults, no image optimization evident, no preload hints).

### 3.4 Client-side only data fetching with no loading affordance
- The dashboard is a pure client-side SPA: after clicking a sidebar item, the shell renders instantly but data pops in 1–3 s later with **no skeleton/loading state** on most pages (Overview, Twin, Analytics, Health) — the layout jumps as numbers fill in (Cumulative Layout Shift).

### 4.2 No loading indicators on most dashboard pages (see §3.4)
### 4.3 `/demo` page is nearly empty
- `/demo` renders only three buttons — **Pause / Restart / Build mine** — with no visible content, no product, nothing to watch.
- On a page literally called "Watch the demo," there is nothing to see.

---

## 4. Content / Trust Issues

### 4.1 Homepage contradicts the product's own positioning
- The hero says **"FINANCIAL TWIN · LIVE"** with `NET WORTH EGP 428,500` and a chart labelled **"60 simulated paths"** — while the dashboard (Overview) uses **600 paths** and different medians. A skeptical user comparing them will notice.
- The "Why FinTwin" section quotes 5th/median/95th as **1.9M / 3.4M / 5.6M** while the live hero widget shows 1.92M–4.49M with median 3.07M — three different distributions on one page.

### 4.2 FAQ answers are honest but hidden
- Good, honest copy ("The median is a summary, not a promise") — but users have to click 6 times to read it.

### 4.3 Demo account advertised on the login page
- Printing `demo@fintwin.app · fintwin123` on the public login page is fine for a demo, but there's no "demo mode" badge anywhere else in the app; the dashboard looks like a real account ("Nour Adel", Cairo, 31, verified email) with no indication that this is seeded demo data.

---

## 5. Tech Stack (evidence-backed)

| Layer | Finding | Evidence |
|---|---|---|
| Framework | **Next.js App Router + Turbopack (dev build)** | Resource URLs `/_next/static/chunks/src_app_globals_…css`, `src_app_(public)_layout_tsx…`, `[turbopack]_browser_dev_hmr-client…`, `next-devtools` chunk, `__nextjs_original-stack-frames` |
| React Server Components | Yes (RSC flight responses) | Login POST returned RSC flight payload (`0:{"a":"$@1",…}`) and `"development"` marker |
| Routing | App Router with route groups | Chunk names: `src_app_(public)_layout_tsx`, `src_app_error_tsx`, `src_app_not-found_tsx`, `global-error` |
| Fonts | Manrope (Google Fonts CSS2) + Geist (Next font) | `fonts.googleapis.com/css2?family=Manrope:wght@400..800`, `/__nextjs_font/geist-latin.woff2` |
| Icons | lucide-react, un-tree-shaken in dev | Dedicated chunk per icon in resource entries |
| Charts | Hand-rolled SVG (custom component names in fiber tree: MedianLine, PercentileBand, etc.) | 0 canvas elements, SVG-based charts, no chart lib on `window` |
| Backend | Next.js API routes + Server Actions, no external API host | All fetches stay on the same origin (`/api/auth/login`, `/login` server action) |
| Auth | HTTP-only signed session cookies, scrypt hashing (self-described) | `/security` page copy; session cookie observed on authenticated routes |
| Persistence | Server-side session + DB-backed data | Dashboard state (transactions, goals, scenarios) survives navigation |

**Architecture takeaway:** a single Next.js full-stack app — RSC pages + server actions + route handlers, no separate backend, all data server-side in what looks like a real database (not localStorage — localStorage is inaccessible/denied, meaning no client persistence layer). The simulation engine, AI layer, and reports all round-trip to the server.

---

## 6. Verdict

| Dimension | Rating |
|---|---|
| **As a demo / portfolio piece** | **7/10** — Genuinely original concept (financial digital twin + Monte Carlo + grounded AI), complete information architecture across 16+ routes, honest "not financial advice" framing throughout, consistent visual design. Held back by broken core actions. |
| **As a production app** | **3/10** — Login 500, simulation engine 500, AI generation down, silent failure on scenario Run buttons, dev-mode bundle, no error specificity, and inconsistent numbers between marketing page and product. Not shippable in this state. |

**Bottom line:** the product thinking, information architecture and visual design are well above typical graduation-project quality — the gap is engineering reliability: three headline features (login, simulation engine, AI) all fail at the API layer with generic errors, and the dev build is the only build that has been shown.

---

## 7. Priority Fixes (for the developer)

1. **Fix `/api/auth/login` 500** — likely a DB/env issue in the dev container; log the server-side exception instead of returning "Something went wrong."
2. **Fix the Monte Carlo engine error** — the same engine produced historical rows, so this is a regression or a missing seed; surface the real server error.
3. **Fix AI generation** — appears to be an unconfigured/failed LLM API call; show the actual failure reason, not "temporarily unavailable."
4. **Wire up the scenario-card Run buttons** — currently render as inert `<a>`/buttons with no handler or href.
5. **Unify the numbers** — homepage marketing copy (3.4M / 52%) vs live widget (3.07M / 50%) vs dashboard (3.13M / 35%) must come from one source of truth.
6. **Default-expand the FAQ accordions** (or server-render the answers) for accessibility and SEO.
7. **Replace generic errors** with field-level, actionable messages.
8. **Ship a production build** — the review only ever saw the Turbopack dev bundle; performance claims are unverifiable until then.
9. **Add loading skeletons consistently** and fix the navigation stalls that kill the tab.
