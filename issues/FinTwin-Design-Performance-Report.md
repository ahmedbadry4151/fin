# FinTwin — Design & Performance Audit

**Date:** 21 October 2026  
**Build tested:** Next.js 16.2.6, React 19.2.6, Tailwind v4, production build (`npm start`)  
**Viewports:** 1440 × 900 and 390 × 844, light and dark themes; 360 px and 320 px overflow sweep  
**Coverage:** 59 valid routes + 6 invalid-ID probes + unknown-path 404  
**Code state:** read-only audit; no source changes were made.

Build passes and typecheck passes. Lint fails with 18 errors and 1 warning. All 59 valid routes returned HTTP 200 and produced no console errors or uncaught exceptions.

---

## Issue summary

| ID | Severity | Area | Issue |
|---|---|---|---|
| D-01 | Critical | Design / responsive | Horizontal page overflow on 12 routes at 390 px |
| P-01 | Critical | Performance / bundle | Full Lucide icon set shipped 3× on every page |
| D-02 | High | Design / contrast | Subtle text, light-theme badges and dark-mode logo fail contrast |
| D-03 | High | Accessibility | 12 toggle/checkbox buttons have no accessible name; overlays lack focus management |
| D-04 | High | Accessibility | Heading levels skip; no skip link; auth pages have no `main` landmark |
| P-02 | High | Performance / payload | `/transactions` sends 303.7 KB of HTML/RSC for a 120-row view |
| P-03 | High | Performance / server | Every app page is `force-dynamic`; simulations re-run on every request |
| D-05 | Medium | Design / routing | Invalid dynamic IDs render a 404 but return HTTP 200 with the wrong title |
| D-06 | Medium | Design / typography | Currency values wrap onto two lines in KPI cards |
| D-07 | Medium | Design / perceived performance | Home hero chart is a blank hatched box for the first 1.8 s |
| D-08 | Medium | Design / discoverability | Hidden-scrollbar horizontal strips clip filters and AI prompts |
| P-04 | Medium | Performance / rendering | 120 transaction rows mount with per-row layout animations |
| P-05 | Medium | Code quality / rendering | 18 React lint errors indicate cascading renders and impure render paths |
| D-09 | Low | Design / desktop | `/transactions` leaves a large empty column beside a 120-row list |
| P-06 | Low | Performance / fonts | Manrope is loaded from a third-party Google Fonts stylesheet |
| P-07 | Low | Build | Multiple lockfiles cause Next to infer the wrong workspace root |

---

# Design issues

## D-01 — Horizontal overflow on mobile (Critical)

At a 390 px viewport, 12 routes expand the document to 441–658 px and become horizontally pannable. Headers, CTA buttons, KPI cards, charts and body copy are clipped at the right edge.

### Measured overflow at 390 px

| Route | Document width | Cause |
|---|---:|---|
| `/` | 441 px | Desktop CTA buttons are visible on mobile |
| `/faq` | 441 px | Same CTA issue |
| `/features` | 441 px | Same CTA issue |
| `/how-it-works` | 441 px | Same CTA issue |
| `/product` | 441 px | Same CTA issue |
| `/security` | 441 px | Same CTA issue |
| `/showcase` | 441 px | Same CTA issue |
| `/accounts/4` | 578 px | `Sparkline` fixed at 520 px |
| `/accounts/7` | 578 px | `Sparkline` fixed at 520 px |
| `/transactions` | 495 px | Single-column grid expands to a 479 px min-content track |
| `/ai` | 574 px | Single-column grid expands to a 558 px min-content track |
| `/analytics/debt` | 658 px | `Sparkline` fixed at 600 px |

### Root causes

1. **Public header CTAs.** `/login` and `/signup` buttons use `className="hidden sm:inline-flex"` in `src/components/views/marketing.tsx:49-50`, but the shared `Button` base class already contains `inline-flex` (`src/components/ui/button.tsx:44`). The base utility wins, so both desktop buttons render at all widths. At 390 px the action group measures 322 px wide and forces the header’s min-content width to 441 px. Setting those two anchors to `display:none` drops the document width from 441 to 390 px.

2. **Sparkline width.** `Sparkline` passes the numeric width as an inline style: `style={{ width, height }}` in `src/components/charts/charts.tsx:75`. This overrides `className="w-full"` passed by callers. At `src/components/views/accounts.tsx:159` the value is `width={520}`; at `src/components/views/analytics.tsx:134` it is `width={600}`. The card padding adds another 40 px, producing 562/642 px content and 578/658 px document widths. Changing the SVG to `width:100%` drops both pages to 390 px.

3. **Grid min-content tracks.** `/transactions` uses `grid gap-5 lg:grid-cols-4` (`src/components/views/transactions.tsx:78`) with no mobile column definition. The implicit `auto` track takes the min-content width of the transaction card (479 px) instead of the available 358 px. `/ai` has the same pattern at `src/components/views/ai.tsx:68`: the chat card’s input and suggested-question strip produce a 558 px min-content track. Setting `grid-template-columns: minmax(0, 1fr)` on both grids drops each page to 390 px.

### Additional widths

- At **360 px**, 13 routes overflow. `/demo` is 366 px because its header action group is 247 px wide and ends at 365 px.
- At **320 px**, 17 routes overflow. Additional widths: `/scenarios` 344 px, `/simulations/new` 339 px, `/analytics/net-worth` 347 px, `/settings/simulation` 360 px.

### Impact

Users on phones see clipped CTAs, cut-off body text, partially hidden KPI cards and charts, and a horizontally scrolling page. On the home page the “Build My Financial Twin” and “Explore a Simulation” buttons and the hero card’s right column are visibly cut off at 390 px.

### Fix direction

Remove `inline-flex` from the base button class or mark the desktop CTAs with a selector that also sets `display:none`. Make `Sparkline` use a viewBox with `width: 100%` and no inline pixel width. Add `minmax(0, 1fr)` / `min-w-0` to the transaction and AI grids.

---

## D-02 — Contrast failures (High)

Measured WCAG contrast ratios in the shipped theme tokens:

| Foreground / background | Ratio | Requirement | Where |
|---|---:|---|---|
| `--subtle` `#a19f94` on `--card` `#f9f7ef` (light) | **2.48:1** | 4.5:1 | Card hints, chart captions, timestamps |
| `--subtle` `#a19f94` on `--page` `#f0efe4` (light) | **2.30:1** | 4.5:1 | Page-level helper text |
| `--subtle` `#6f6d64` on `--card` `#1c1c19` (dark) | **3.29:1** | 4.5:1 | Card hints, chart captions |
| `--subtle` `#6f6d64` on `--page` `#121210` (dark) | **3.61:1** | 4.5:1 | Page-level helper text |
| Good badge: `#3f8f5f` on `#dcecdf` (light) | **3.22:1** | 4.5:1 | “On track” / positive badges |
| Warn badge: `#d9924f` on `#f6e3d0` (light) | **2.06:1** | 4.5:1 | “Watch” / warning badges |
| Bad badge: `#c2574c` on `#f3d9d4` (light) | **3.29:1** | 4.5:1 | “Risk” / negative badges |
| Logo ring: `#f7c94c` on `--ink` `#ece9df` (dark) | **1.29:1** | 3:1 (UI component) | Logo on every dark-mode page |

The `text-subtle` class is used at 10–11.5 px for secondary labels, chart captions, footnotes and disclaimers, so the 4.5:1 normal-text threshold applies. Status badges are 11 px semibold, not large text.

The dark-mode logo is the most visible failure: the cream `bg-ink` circle with a yellow `border-accent` ring reads as a blank cream dot in the sidebar, public header and login page. It is visible in every dark-mode screenshot.

### Fix direction

Darken `--subtle` in light mode and lighten it in dark mode to at least 4.5:1. Use darker foregrounds for `good`/`warn`/`bad` badges in light mode, or switch badges to dark text on tinted backgrounds. Give the logo ring a foreground that contrasts with the inverted `bg-ink`.

---

## D-03 — Unnamed controls and missing focus management (High)

### Unnamed toggle/checkbox buttons

The custom `Checkbox` and `Toggle` components render a `<button role="checkbox">` or `<button role="switch">` inside a `<label>` (`src/components/ui/field.tsx:84-127`). A label element does not name a button, and the button has no `aria-label` or `aria-labelledby`. The visible text is a sibling of the button, not its content.

The browser audit found **12 unnamed controls across 5 pages**:

- `/login` — “Remember me” checkbox
- `/scenarios/187` — 1 toggle
- `/simulations/compare` — 3 comparison checkboxes
- `/settings/ai` — 3 toggles
- `/settings/notifications` — 4 toggles

Screen readers announce only “button” / “switch” with no purpose. The “Remember me” checkbox is also 20 × 20 px, below the 24 × 24 px minimum target size.

### Overlay focus management

- `Drawer` and `Modal` (`src/components/ui/overlay.tsx:28,59`) set `role="dialog"` and `aria-modal="true"` but do not move focus into the dialog, trap Tab, or restore focus to the trigger on close.
- `CommandPalette` (`src/components/shell/command-palette.tsx`) moves focus to its input, but its input has no `aria-label`; the placeholder is the only name. Focus is not trapped, and closing the palette drops focus to the document.
- Several dialogs have no `aria-labelledby` connecting the visible `<h2>` to the dialog.

### ARIA tabs without keyboard behavior

`SegmentedControl` (`src/components/ui/pill.tsx`) exposes `role="tablist"` and `role="tab"` but does not implement arrow-key navigation, roving `tabIndex`, `aria-controls` or `role="tabpanel"`. The audit found 7 tabs on `/transactions` and 5 on `/settings/simulation`.

### Fix direction

Give every toggle/checkbox a real accessible name (`aria-label` or an `id` + `aria-labelledby`), use a native checkbox where possible, add focus trap/restore to overlays, and either implement the ARIA tab keyboard pattern or use plain buttons with `aria-pressed`.

---

## D-04 — Heading structure and landmarks (High)

- Most app pages go directly from `h1` to `h3`: `/overview`, `/twin`, `/accounts`, `/accounts/4`, `/accounts/7`, `/goals/11`, `/goals/11/planner`, `/scenarios`, `/simulations/192`, `/ai`, every `/analytics/*` page, `/economy`, `/economy/inflation`, `/reports`, `/profile`, `/settings`, `/settings/data`, `/settings/privacy`, `/settings/simulation`.
- `/reports/199` contains **two `h1` elements** and no `h2`.
- No page provides a “Skip to content” link. Keyboard users must tab through the full sidebar (about 17 links) on every app page.
- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` and `/demo` have no `<main>` landmark.

`CardTitle` always emits `h3` (`src/components/ui/card.tsx:19`) while `PageHeader` emits `h1`; there is no `h2` level between them. Screen-reader users therefore get an incomplete document outline.

### Fix direction

Use `h2` for card titles or insert a visually hidden `h2` per section, allow a configurable heading level in `CardTitle`, add a skip link as the first focusable element, and wrap auth content in `<main>`.

---

## D-05 — Soft 404s for invalid dynamic IDs (Medium)

Six invalid-ID routes render the 404 page but return **HTTP 200** and keep the parent page’s metadata title:

| URL | Status | `<title>` |
|---|---:|---|
| `/accounts/999` | 200 | `Account · FinTwin` |
| `/goals/999` | 200 | `Goal · FinTwin` |
| `/scenarios/999` | 200 | `Edit Scenario · FinTwin` |
| `/reports/999` | 200 | `Report Preview · FinTwin` |
| `/simulations/999` | 200 | `Simulation Results · FinTwin` |
| `/economy/nope` | 200 | `Assumption · FinTwin` |

The response body contains the streamed app shell plus a `NEXT_HTTP_ERROR_FALLBACK;404` marker and the correct “This page isn’t part of the model.” content. The root unknown path `/definitely-not-a-page` correctly returns 404, so the problem is specific to `notFound()` inside the dynamic app pages.

The 404 content is also rendered inside the full app shell (`min-h-screen` inside `<main>`), producing a scrollbar and a vertically off-centre error state on an otherwise empty page.

### Impact

Search engines and link checkers treat invalid IDs as valid pages. Analytics records them as successes. CDNs and browsers may cache the 200 response. The title still claims “Account” or “Goal”, which is wrong for an error state.

### Fix direction

Resolve and validate the ID before the `(app)/loading.tsx` boundary streams, or move the validation into route-level metadata/middleware so the response status can become 404. Give the 404 route its own title and avoid nesting its full-height layout inside the app main area.

---

## D-06 — Currency values wrap in KPI cards (Medium)

At 390 px, the overview KPI grid is two 171 px columns. Every currency card renders the currency on its own line:

```
EGP
428,500
```

The same happens for `EGP 32,000`, `EGP 21,400`, `EGP 10,600`, and the “FINANCIAL STABILITY” label wraps to two lines. Card heights become uneven and the eye cannot compare values by position.

At 1440 px, the home hero demo card has four mini cards. “EGP 428,500” and “+EGP 10,600” wrap to two lines while “263k” and “50%” stay on one line, so the Net Worth and Cash Flow cards are taller than Savings and Buy a Home.

The cause is a normal space between currency and amount in `formatMoney` plus a 26–30 px value in a narrow card, with no `whitespace-nowrap` and no stacked-currency treatment.

### Fix direction

Render currency as a separate label above/beside the number, or apply `white-space: nowrap` with a smaller responsive value size.

---

## D-07 — Hero chart is blank for the first 1.8 s (Medium)

`src/components/views/marketing.tsx:78-79` uses timers to stage the hero:

- `0–1.8 s`: a 190 px hatched placeholder (`phase === 0`, line 107)
- `1.8 s`: the fan chart appears (`phase >= 1`, line 106)
- `4.6 s`: the baseline line is added (`phase === 2`)

On first paint, the most prominent visual on the home page is an empty hatched rectangle with no axes, no “generating” label and no data. It reads as a broken chart, especially on slower connections where the 1.8 s timer starts before the user has finished parsing the page.

### Fix direction

Render the chart immediately and animate the line/band reveal, or show a labelled “Running 60 paths…” state with axes visible.

---

## D-08 — Horizontal scrollers hide their overflow (Medium)

Several filter and prompt strips are wider than their container and hide the scrollbar with `no-scrollbar`. There is no fade, arrow or other cue that more content exists.

| Location | Content width | Visible width | Viewport |
|---|---:|---:|---:|
| `/transactions` category strip | 1550 px | 1137 px | 1440 px |
| `/transactions` category strip | 1550 px | 358 px | 390 px |
| `/ai` suggested questions | 1447 px | 677 px | 1440 px |
| `/ai` suggested questions | 1447 px | 484 px | 390 px |
| `/analytics` tab strip | 505 px | 356 px | 390 px |

The categories “Subscriptions”, “Transportation”, “Travel” and several AI prompts are entirely off-screen at common widths. On touch devices they can be swiped, but there is no visual affordance. At 320 px the analytics and settings tab strips also clip.

### Fix direction

Keep the scrollbar or add edge fades/chevrons; expose the scrollable region with `role="region"` and an accessible label.

---

## D-09 — Empty desktop column on `/transactions` (Low)

`/transactions` uses a 3/1 grid (`src/components/views/transactions.tsx:78`). The left card contains 120 rows; the right column contains only two short cards and ends around 500 px. The remaining ~700 px of the right column is empty for the rest of the page. At 1440 px this reads as an unfinished layout rather than a deliberate sidebar.

### Fix direction

Make the sidebar sticky, add contextual content (monthly summary, top merchants), or let the list span the full width below the summary cards.

---

# Performance issues

## P-01 — Full Lucide icon set shipped three times per page (Critical)

`src/components/ui/states.tsx:5` imports the entire icon namespace:

```ts
import { icons, type LucideProps } from "lucide-react";
```

and resolves icons dynamically at line 10:

```ts
const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[name] ?? icons.Circle;
```

This defeats tree-shaking. The build emits five 751 KB chunks, and each one contains the complete icon catalogue (verified by finding `ZapOff`, `AArrowDown` and `Accessibility` in all five). Every page loads **three** of those chunks.

### Measured JS

| Page | Script requests | Decoded JS | Encoded JS | 751 KB icon chunks |
|---|---:|---:|---:|---:|
| `/login` | 17 | 3,067 KB | 813 KB | 3 |
| `/` | 17 | 3,067 KB | 813 KB | 3 |
| `/overview` | 19 | 3,110 KB | 827 KB | 3 |

Across all 59 routes, encoded JavaScript ranges from **629 KB to 1,060 KB** per page (median 852 KB, average 856 KB). Each duplicate icon chunk is 751 KB decoded / 189 KB encoded; the three copies account for 2.25 MB decoded and 567 KB encoded on their own.

### Impact

- The browser must download, parse and compile roughly 3 MB of JavaScript before the page is interactive.
- On a 1.6 Mbps connection, 813 KB of JS alone is about 4.1 seconds of transfer before React hydration begins.
- The cost is paid even on `/login` and marketing pages that use only a handful of icons.
- It scales with every new page because the dynamic `Icon` API keeps the whole namespace in the graph.

### Fix direction

Replace the namespace import with a static `Record<string, Component>` containing only the icons used by the app, importing each icon individually. Remove the dynamic string lookup or generate the map at build time.

---

## P-02 — `/transactions` sends 303.7 KB of HTML/RSC for a 120-row view (High)

`src/app/(app)/transactions/page.tsx:10` requests `limit: 600` transactions and passes all of them to the client component at line 15. The view only renders the first 120 (`src/components/views/transactions.tsx:85`).

| Page | Raw HTML | vs `/transactions` |
|---|---:|---:|
| `/transactions` | 303,698 bytes (296.6 KiB) | 1.0× |
| `/overview` | 95,068 bytes (92.8 KiB) | 3.2× smaller |
| `/twin` | 66,208 bytes (64.7 KiB) | 4.6× smaller |
| `/` | 65,699 bytes (64.2 KiB) | 4.6× smaller |

The seed contains 173 transactions, so the page serializes 173 objects (and would serialize up to 600) into the RSC payload even though 120 rows are shown and the “Showing the first 120 of 173” notice is below all 120 rows. The document transfer is compressed to ~22 KB, but the browser still parses ~300 KB of HTML/RSC, hydrates 173 records, and runs the client-side filter/total memos over the full array.

### Impact

Extra parse and hydration work, larger client memory, slower first interaction, and a hidden “first 120” notice. On a page whose main content is a list, this is the largest HTML payload in the app by a wide margin.

### Fix direction

Pass only the 120 rows that are rendered, or paginate server-side. Keep totals server-side instead of recomputing them from 173 records on the client.

---

## P-03 — Every app page is dynamic and re-runs simulations (High)

`src/app/(app)/layout.tsx:5` sets `export const dynamic = "force-dynamic"`, and each app page repeats it. Every app response carries `Cache-Control: no-store, must-revalidate, no-cache, max-age=0, private`; public pages are prerendered with `s-maxage=31536000`.

Server work on each request:

- `/twin`: runs `120` Monte Carlo paths for each goal (3 goals) in `src/app/(app)/twin/page.tsx:13-17`.
- `/goals/[id]`: runs `300` baseline paths plus `150` paths for each of 4 scenarios = **900 paths** per request (`src/app/(app)/goals/[id]/page.tsx:19-24`).
- `/overview`: runs `200` paths when no baseline simulation exists (`src/app/(app)/overview/page.tsx:16-19`).

Measured TTFB on localhost (repeated requests):

| Route | TTFB range |
|---|---:|
| `/twin` | 56–137 ms |
| `/goals/11` | 77–97 ms |
| `/transactions` | 83–109 ms |
| `/analytics/debt` | 20–26 ms |

Even on localhost, the simulation-heavy routes are 3–5× slower than a static dashboard page. There is no shared cache or persistence of computed probabilities.

### Impact

CPU cost per page view, higher production/serverless latency, and no CDN caching for the entire authenticated app. The values are deterministic for a given user and seed, so the recomputation is repeated work.

### Fix direction

Cache simulation results per user/goal/seed, move the Monte Carlo runs behind a cached server function, and remove `force-dynamic` from pages that do not need per-request cookies beyond the user lookup.

---

## P-04 — 120 rows mount with per-row layout animations (Medium)

`/transactions` renders 120 `ReflowItem` components. Each one uses Framer Motion `layout` plus `initial={{ opacity: 0, y: -10, scale: 0.98 }}` and a staggered delay of `Math.min(index, 12) * 0.04` (`src/components/motion/primitives.tsx`, `ReflowItem`). The list is not virtualized.

On mount, the browser must measure and animate 120 layout nodes; the last visible items start around 480 ms. Filtering re-runs the animation on the surviving rows. The page also loads 19–20 scripts because of P-01, so this animation work competes with hydration.

### Impact

Jank and delayed interactivity on mid-range phones, especially when the 120-row list is first painted or filtered. The animation adds no information after the first screen.

### Fix direction

Disable `layout` animations for long lists, animate only the first screenful, and paginate or virtualize the rows.

---

## P-05 — React lint errors indicate cascading renders (Medium)

`npm run lint` fails with **18 errors and 1 warning**. The performance-relevant ones:

- `react-hooks/set-state-in-effect` in `src/components/motion/count-up.tsx:18`, `src/components/providers.tsx:53`, `src/components/shell/app-shell.tsx:94`, `src/components/shell/command-palette.tsx:37,47`, `src/components/views/onboarding.tsx:54`, `src/components/views/transactions.tsx:35`.
- `react-hooks/purity`: `Date.now()` called during render in `src/components/views/transactions.tsx:39:44` and `src/components/views/goal-planner.tsx:23:102`.
- `react-hooks/immutability`: `offset += len` after render in `src/components/charts/charts.tsx:166`.
- 8 `react/no-unescaped-entities` errors in marketing/auth/transaction/onboarding copy.

These are not cosmetic. Synchronous `setState` inside effects causes an extra render pass on mount; `Date.now()` inside a memoized filter makes the memo impure and can produce different results on re-render; the chart offset mutation violates the render purity contract.

### Fix direction

Derive initial state instead of syncing it in an effect, move `Date.now()` outside render or into an event, compute the donut offsets with `reduce` without mutation, and escape the apostrophes.

---

## P-06 — Third-party Google Fonts request (Low)

`src/app/layout.tsx:47-49` loads Manrope via:

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

This adds a third-party DNS lookup, TLS connection and render-blocking stylesheet before the page can use its font. `display=swap` avoids invisible text but introduces a font swap and potential layout shift. Next lint reports `@next/next/no-page-custom-font`. There is no `next/font` self-hosting or preload of the actual font files.

### Impact

Extra latency and a third-party availability/privacy dependency on every page, including login and offline-ish demo use.

### Fix direction

Use `next/font/local` or `next/font/google` with the needed weights and `display: swap`, which self-hosts the files and generates metric-matched fallbacks.

---

## P-07 — Build warning: multiple lockfiles (Low)

`npm run build` warns that Next inferred the workspace root as `C:\Users\ahmed` because both `C:\Users\ahmed\package-lock.json` and the project lockfile exist. This can make file tracing for standalone output include the wrong tree and inflate deployment artifacts.

### Fix direction

Set `outputFileTracingRoot` to the project directory in `next.config.ts`, or remove the stray parent lockfile.

---

## Appendix A — Routes tested

**Public / auth:** `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/faq`, `/features`, `/how-it-works`, `/product`, `/security`, `/showcase`, `/demo`

**Onboarding:** `/onboarding`, `/onboarding/build`, `/onboarding/complete`

**App:** `/overview`, `/twin`, `/accounts`, `/accounts/new`, `/accounts/4`, `/accounts/7`, `/transactions`, `/transactions/import`, `/transactions/new`, `/goals`, `/goals/new`, `/goals/11`, `/goals/11/planner`, `/scenarios`, `/scenarios/new`, `/scenarios/ai`, `/scenarios/187`, `/simulations`, `/simulations/new`, `/simulations/compare`, `/simulations/192`, `/ai`, `/analytics`, `/analytics/cash-flow`, `/analytics/debt`, `/analytics/net-worth`, `/analytics/savings`, `/analytics/spending`, `/health`, `/economy`, `/economy/presets`, `/economy/inflation`, `/reports`, `/reports/new`, `/reports/199`, `/profile`, `/notifications`, `/settings`, `/settings/ai`, `/settings/data`, `/settings/notifications`, `/settings/privacy`, `/settings/simulation`

Additional dynamic IDs tested: `/accounts/5`, `/accounts/6`, `/goals/12`, `/goals/13`, `/scenarios/188`–`191`, `/reports/200`, `/simulations/193`–`198`.

**Invalid-ID probes:** `/accounts/999`, `/goals/999`, `/scenarios/999`, `/reports/999`, `/simulations/999`, `/economy/nope`.  
**Unknown path:** `/definitely-not-a-page` (correct 404).

## Appendix B — Measurement notes

- Widths are `document.documentElement.scrollWidth` at a 390 px layout viewport, confirmed with `visualViewport.width = 390`.
- JS bytes are `encodedBodySize` from Chrome PerformanceResourceTiming, summed over `initiatorType === "script"`. Decoded sizes are `decodedBodySize`.
- HTML byte counts are the raw response bodies from the production server; the browser receives a compressed response (~22 KB for `/transactions`), but the DOM/RSC parse size is unchanged.
- TTFB values are from repeated localhost requests; they are lower bounds and do not include production network latency.
- No console errors or uncaught exceptions were observed on any of the 59 valid routes.
