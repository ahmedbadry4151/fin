# FinTwin — Security Audit (Source Review)

**Target:** `C:\Users\ahmed\OneDrive\Desktop\fintwin-fable_5.1 (1)`
**Source ref:** commit `9512936` (worktree dirty — many modified/untracked files; reviewed the on-disk worktree as-is)
**Date:** 20 Nov 2026
**Method:** Static, source-first review. No live endpoint, external service, or production identity was touched. No source files were modified.
**Scope:** `src/**`, `next.config.ts`, `package.json`, `README.md`. The project is a **frontend-only educational demo** (README.md:3, 33): no database, no API routes, and **authentication is explicitly simulated** (README.md:66-67). That context is applied to every severity rating below.

---

## Executive summary

The demo is intentionally open — fake auth, one shared in-memory user, no backend. Within that design, most "missing auth" observations are **by design**, not defects. The findings below are the issues that remain real even for a demo, plus the things that become critical the moment this code is deployed or reused as a real multi-user app.

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| F-01 | Every server action is unauthenticated and network-callable; auth is a stub | **High** (Critical if deployed for real users) | Confirmed |
| F-02 | Unclamped numeric input reaches the Monte Carlo engine → memory exhaustion / crash | **Medium** | Confirmed |
| F-03 | CSV / Excel export uses `JSON.stringify()` → broken CSV + spreadsheet formula injection | **Medium** | Confirmed |
| F-04 | Public security page advertises scrypt hashing and signed HTTP-only cookies that do not exist | **Medium** | Confirmed |
| F-05 | No security headers / CSP; `X-Powered-By` exposed | **Low** | Confirmed |
| F-06 | Hardcoded demo credentials in source and UI | **Low / Informational** (by design) | Confirmed |

No exploitable XSS, open redirect, SSRF, path traversal, or SQL injection sink was found (see *Reviewed — no issue*).

---

## F-01 — Unauthenticated, network-callable Server Actions (High)

**Location:** `src/lib/server-api.ts:1` (the entire file), `src/lib/data.ts:20-29`, `src/lib/store.ts:221-227`.

`server-api.ts` carries a single `"use server"` directive at line 1. Under Next.js every exported `async` function in that module is a publicly POST-able Server Action endpoint. There is **no session, cookie, token, role, or CSRF check on any of them**. The only identity function is:

```ts
// src/lib/data.ts:25-29
export async function getCurrentUser(): Promise<User> {
  await touchDynamic();          // imports next/headers cookies() only to force dynamic rendering
  const s = getStore();
  return s.users[0];             // always the same hardcoded user
}
```

`touchDynamic()` (`data.ts:20-23`) awaits `cookies()` purely to opt out of static rendering — it never reads a session. Consequently any network caller can invoke state-destroying actions with no credentials:

- `dataDelete("profile")` (`server-api.ts:605-638`) wipes transactions, accounts, assets, liabilities, goals, scenarios, simulations, reports, AI messages and notifications, and resets the profile.
- `onboardingPost(...)` (`server-api.ts:482-581`) overwrites the user and deletes/recreates all accounts, assets, liabilities and goals.
- `dataExport()` (`server-api.ts:585-603`) returns the full twin dataset.
- All CRUD actions (`accountsOp`, `assetsOp`, `liabilitiesOp`, `transactionsOp`, `goalsOp`, `scenariosOp`, `simulationsOp`, `reportsOp`, `notificationsOp`) mutate the shared store.

The `a.userId === user.id` filters scattered through the file (e.g. lines 118, 130, 149, 159, 187, 200, 247, 288, 302, 316, 339, 350, 384, 404, 450, 457, 469) are **not authorization** — `user.id` is always `s.users[0].id`. There is no role field for users anywhere (`src/lib/types.ts:7-22`).

**Boundary / impact:** A lower-trust network principal can perform every privileged state change and read all data. All visitors also share one module-level singleton store (`store.ts:221-227`) and one module-global `pendingSignup` flag (`server-api.ts:34`). In the shipped demo this is intentional (`README.md:66-67`, synthetic in-memory data that resets on restart), so the practical blast radius is demo data. **If this code is deployed with real user data or behind a real login, this is account takeover and cross-tenant data access with no authentication.**

**Fix:** Treat every exported action as an untrusted endpoint. Validate a real session/token at the start of each action and scope every read/write to the authenticated user id (not `users[0]`). If the project is to remain a demo, gate deployment so it is never exposed with real data, and state that explicitly in the README.

---

## F-02 — Unclamped numeric input reaches the Monte Carlo engine (Medium)

**Location:** `src/lib/data.ts:248-252`, `src/lib/server-api.ts:359-374, 466-473`, `src/lib/simulation.ts:185-189`, `src/lib/economy.ts:85-97`.

`runAndStoreSimulation()` clamps `paths` to `[100, 5000]` at `data.ts:250`, but **does not clamp `horizonYears`**:

```ts
// src/lib/data.ts:248-252
const econ = { ...twin.econ, ...(opts.assumptionsOverride ?? {}),
               horizonYears: opts.horizonYears ?? twin.econ.horizonYears };
const paths = Math.min(5000, Math.max(100, opts.paths ?? 600));
const results = runSimulation(simTwin, econ, params, { paths, seed, ... });
```

Both upstream entry points accept arbitrary numbers with `Number()` and no finite/range check — `simulationsOp` at `server-api.ts:369-372` and `assumptionsPatch` at `server-api.ts:471-472` (`Math.round(Number(...))`). The documented valid range is `1..30` (`economy.ts:85-97`) but it is never enforced server-side. `assumptionsOverride` / `paramsOverride` are plain TypeScript `as` casts (`server-api.ts:371-372`, `data.ts:248-249`) with zero runtime shape validation.

The sink in the engine:

```ts
// src/lib/simulation.ts:186-189
const months = Math.max(12, Math.round(a.horizonYears * 12));
const nw: Float64Array[] = Array.from({ length: months + 1 }, () => new Float64Array(paths));
```

A large finite `horizonYears` (e.g. `1e7` → `1.2e8` months × 5000 paths × 8 bytes) drives an enormous allocation; `Infinity`, `NaN`, or a huge exponent from a string like `"1e309"` makes `Array.from({ length: Infinity })` throw a `RangeError`. The same class of unvalidated numbers feeds `savingsChangePct`, `incomeDurationMonths`, etc. from the natural-language parsers (`src/lib/intelligence.ts:119-121, 152-157`, `src/lib/scenarios.ts:299-388`) and overflow / `Infinity` values propagate through `finance.ts` and `store.ts` (e.g. `transactionsOp` `Math.abs(Number(t.amount) || 0)` at `server-api.ts:231` lets `Infinity` set `acc.balance = Infinity` at `server-api.ts:216`).

**Boundary / impact:** Any caller of the (unauthenticated, per F-01) simulation action can force excessive memory allocation or an unhandled exception in the shared server process — a local, bounded availability defect. Because the store is shared, one caller's crash/overwrite affects every visitor.

**Fix:** Validate all numeric server-action inputs with `Number.isFinite` and enforce the bounds from `ASSUMPTION_DEFS` (`economy.ts:19-98`) at the trust boundary: clamp `horizonYears` to `[1, 30]`, `paths` already clamped, and reject `NaN`/`Infinity` before any allocation. Add a regression test for `horizonYears = Infinity`, `1e9`, and negative values.

---

## F-03 — CSV / Excel export: broken quoting and spreadsheet formula injection (Medium)

**Location:** `src/lib/server-api.ts:411-439` (rows built at 416-428), `src/lib/client-api.ts:103-114, 124-128`.

`reportsExport()` builds the CSV body with template literals and `JSON.stringify()`:

```ts
// src/lib/server-api.ts:423, 427
...twin.goals.map((g) => `goal,${JSON.stringify(g.name)},${g.currentAmount}/${g.targetAmount}`),
...tx.map((t) => `${t.date},${JSON.stringify(t.description)},${t.category},${t.type},${t.amount}`),
```

`JSON.stringify()` wraps a string in double quotes but **does not double embedded quotes**, and does not escape commas/newlines in the other fields. More importantly it does **not neutralize a leading `=`, `+`, `-`, or `@`**. Goal names (`goalsOp`, `server-api.ts:273`) and transaction descriptions (`transactionsOp`, `server-api.ts:228`) are fully user-controlled. A description such as `=HYPERLINK(...)` or `=DDE(...)` is written as `"=..."`; spreadsheet applications strip the CSV quotes and evaluate the cell as a formula when a victim opens the downloaded file. `exportReport()` (`client-api.ts:124-128`) then feeds this to `triggerDownload()` with MIME `application/vnd.ms-excel` / `text/csv`.

**Boundary / impact:** The exporter writes attacker-controlled text into a file consumed by a different, higher-privilege context (an operator's spreadsheet application). Classic CSV/formula injection: data exfiltration or command execution on the machine that opens the report. Also produces malformed CSV for ordinary descriptions containing quotes/commas.

**Fix:** Implement real CSV escaping (double every `"`, quote fields containing `,`, `"`, `\n`, `\r`) and prefix any cell whose first character is `= + - @` (or tab/CR) with a single quote before quoting. Add a unit test with a description like `=1+1` and one containing embedded quotes/commas.

---

## F-04 — Public security page makes false protection claims (Medium)

**Location:** `src/components/views/public-pages.tsx:87` (the "Session security" commitment), compared with `src/lib/server-api.ts:36-73`, `src/lib/data.ts:20-29`, `src/lib/store.ts:100`, and `README.md:39, 66-67`.

The `/security` page states:

> "Signed, HTTP-only session cookies with a 30-day lifetime. Passwords are hashed with scrypt."

None of this exists in the current build. There are no cookies at all (`data.ts:20-23` calls `cookies()` only to force dynamic rendering), no password hashing (the single user's `passwordHash` is the literal string `"demo"` at `store.ts:100`, and `authPost("login")` / `authPost("demo")` always return success at `server-api.ts:46,48`), and no scrypt/session implementation (`README.md:39` lists `src/lib/session.ts` as removed).

**Boundary / impact:** A visitor evaluating a **financial** tool is told that strong, specific protections guard their data when none do. This is a security misrepresentation that can lead users to entrust real financial data to a system that does not protect it — a real, owner-observable harm independent of the demo's synthetic data.

**Fix:** Either remove/reword the claim to describe the actual demo behaviour (no auth, in-memory synthetic data, nothing persisted), or implement the claimed controls. Do not ship security assurances that the code does not enforce.

---

## F-05 — Missing security headers and CSP (Low)

**Location:** `next.config.ts:1-5` (empty config), `src/app/layout.tsx:51-54`.

`next.config.ts` is empty: no `headers()`, no CSP, no `X-Content-Type-Options`, no `X-Frame-Options`/`frame-ancestors`, no `Referrer-Policy`, no `Permissions-Policy`, no HSTS, and `poweredByHeader` is left at the default so `X-Powered-By: Next.js` is exposed. The page loads Google Fonts from `fonts.googleapis.com` / `fonts.gstatic.com` (`layout.tsx:51-53`) without SRI and executes an inline script via `dangerouslySetInnerHTML` (`layout.tsx:54`), so a strict CSP would currently require a nonce/hash or `'unsafe-inline'` for that script.

**Boundary / impact:** Hardening gap; no single exploit is demonstrated, but clickjacking, MIME sniffing, and unrestricted third-party script/style origins are possible. Low severity for a demo.

**Fix:** Add `poweredByHeader: false` and an `async headers()` block setting `Content-Security-Policy` (with a nonce for the theme script), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` / `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.

---

## F-06 — Hardcoded demo credentials (Low / Informational, by design)

**Location:** `src/lib/constants.ts:1-2`, `src/lib/store.ts:100`, `src/components/views/auth.tsx:12, 101`, `README.md:24-29`.

`DEMO_EMAIL = "demo@fintwin.app"` and `DEMO_PASSWORD = "fintwin123"` are committed in source and rendered on the login page. This is intentional for a demo and is documented in the README. Note it is largely moot: login accepts any credentials (`server-api.ts:46`), so no credential is actually checked. No `process.env`, `NEXT_PUBLIC_*`, API keys, or tokens exist in `src/`.

**Fix:** Acceptable for a demo. If the code is ever reused for a real deployment, remove the constants, read credentials from a secret store, and implement genuine authentication (see F-01).

---

## Reviewed — no issue found

- **DOM XSS / code execution:** the only raw-HTML sink is the compile-time constant theme script at `src/app/layout.tsx:54`; it validates the localStorage colour with `/^[0-9a-fA-F]{6}$/` (`layout.tsx:27`) before `setProperty`. No `eval`, `new Function`, `.innerHTML`, `outerHTML`, or `insertAdjacentHTML` anywhere in `src/`. React-rendered user text (AI answers, report names, CSV descriptions) is auto-escaped.
- **Open redirect:** all navigation targets are server-determined constants or numeric IDs; transaction query hrefs are `encodeURIComponent`-encoded (`server-api.ts:661`); no `window.location`, `window.open`, `document.write`, or unvalidated `redirect`/`next`/`return` parameter flows into navigation.
- **SSRF / path traversal / SQL injection:** no server-side HTTP clients, no filesystem path construction from user input, no SQL/database layer in this build.
- **Prototype pollution:** `profilePatch` spreads `b.settings` (`server-api.ts:83`) into a plain object; no prototype-writing key handling found in sinks.
- **CSRF:** no cookies/session exist in the demo, so cross-site state changes are possible but affect only the shared synthetic demo state; this is covered by F-01's remediation.

---

## Limitations

- Only the on-disk worktree (commit `9512936`, dirty) was reviewed; no prior audit ledger existed for comparison.
- No target code was executed and no live endpoint was probed; findings are source-grounded. Availability impact in F-02 is inferred from the allocation maths, not from a triggered crash.
- This is a partial, point-in-time review of a small frontend demo, not an exhaustive proof that no other issue exists.
