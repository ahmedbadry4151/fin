"use server";

/**
 * In-memory replacement for the deleted /api route handlers.
 * Every function mirrors the request/response contract of the original
 * routes so the client fetch shim can serve /api/* without a backend.
 */

import { revalidatePath } from "next/cache";
import { getStore, nextId } from "./store";
import {
  getCurrentUser,
  getLatestSimulation,
  getScenario,
  getScenarios,
  getSimulations,
  getTransactions,
  getTwin,
  resultsOf,
  runAndStoreSimulation,
} from "./data";
import { answerQuestion } from "./intelligence";
import type { ScenarioParams } from "./simulation";
import { toISODate, formatMoney } from "./format";
import { DEFAULT_ASSUMPTIONS } from "./economy";
import type { Account, Goal, Liability, Report, Scenario, Simulation, Transaction } from "./types";
import type { ApiResult } from "./api-types";

const ok = (body: unknown = { ok: true }): ApiResult => ({ status: 200, body });
const fail = (status: number, error: string): ApiResult => ({ status, body: { error } });

/* ---------------- auth ---------------- */

let pendingSignup = false;

export async function authPost(action: string, body: Record<string, unknown> = {}): Promise<ApiResult> {
  if (action === "signup") {
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!name || !email || password.length < 8) return fail(400, "Name, email and a password of at least 8 characters are required.");
    pendingSignup = true;
    return ok({ ok: true, next: "/verify-email" });
  }

  if (action === "login") return ok({ ok: true, next: "/overview" });

  if (action === "demo") return ok({ ok: true, next: "/overview" });

  if (action === "logout") {
    pendingSignup = false;
    return ok({ ok: true, next: "/" });
  }

  if (action === "forgot") {
    return ok({ ok: true, message: "If an account exists for that email, a reset link has been sent." });
  }

  if (action === "reset") {
    if (String(body.password ?? "").length < 8) return fail(400, "Password must be at least 8 characters.");
    return ok({ ok: true, next: "/login" });
  }

  if (action === "verify") {
    const user = await getCurrentUser();
    user.emailVerified = true;
    const next = pendingSignup || !user.onboarded ? "/onboarding" : "/overview";
    pendingSignup = false;
    return ok({ ok: true, next });
  }

  return fail(404, "Unknown action");
}

/* ---------------- profile ---------------- */

export async function profilePatch(b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  const userKeys = ["name", "country", "city", "currency", "employment", "planningStyle"] as const;
  for (const k of userKeys) if (b[k] !== undefined) (user as unknown as Record<string, unknown>)[k] = String(b[k]);
  if (b.age !== undefined) user.age = b.age ? Number(b.age) : null;
  if (b.settings !== undefined) user.settings = { ...((user.settings as Record<string, unknown>) ?? {}), ...(b.settings as Record<string, unknown>) };

  const profile = s.financialProfiles.find((p) => p.userId === user.id);
  if (profile) {
    const profileKeys = ["monthlyIncome", "additionalIncome", "cashSavings", "emergencySavings", "monthlySavings", "otherLiquid"] as const;
    for (const k of profileKeys) if (b[k] !== undefined) (profile as unknown as Record<string, unknown>)[k] = Number(b[k]);
    if (b.expenses !== undefined) profile.expenses = b.expenses as Record<string, number>;
    if (b.incomeFrequency !== undefined) profile.incomeFrequency = String(b.incomeFrequency);
    profile.updatedAt = new Date();
  }
  revalidatePath("/", "layout");
  return ok();
}

/* ---------------- accounts ---------------- */

export async function accountsOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (method === "POST") {
    const row: Account = {
      id: nextId(),
      userId: user.id,
      name: String(b.name ?? "Account"),
      type: String(b.type ?? "bank"),
      balance: Number(b.balance ?? 0),
      currency: String(b.currency ?? user.currency),
      institution: b.institution ? String(b.institution) : null,
      updatedAt: new Date(),
    };
    s.accounts.push(row);
    revalidatePath("/", "layout");
    return ok({ account: row });
  }
  if (method === "PATCH") {
    const row = s.accounts.find((a) => a.id === Number(b.id) && a.userId === user.id);
    if (row) {
      if (b.name !== undefined) row.name = String(b.name);
      if (b.type !== undefined) row.type = String(b.type);
      if (b.balance !== undefined) row.balance = Number(b.balance);
      if (b.institution !== undefined) row.institution = b.institution ? String(b.institution) : null;
      row.updatedAt = new Date();
    }
    revalidatePath("/", "layout");
    return ok({ account: row ?? null });
  }
  if (method === "DELETE") {
    s.accounts = s.accounts.filter((a) => !(a.id === Number(b.id) && a.userId === user.id));
    revalidatePath("/", "layout");
    return ok();
  }
  return fail(404, "Unknown method");
}

/* ---------------- assets ---------------- */

export async function assetsOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (method === "POST") {
    const row = { id: nextId(), userId: user.id, name: String(b.name ?? "Asset"), type: String(b.type ?? "other"), value: Number(b.value ?? 0) };
    s.assets.push(row);
    revalidatePath("/", "layout");
    return ok({ asset: row });
  }
  if (method === "PATCH") {
    const row = s.assets.find((a) => a.id === Number(b.id) && a.userId === user.id);
    if (row) {
      if (b.name !== undefined) row.name = String(b.name);
      if (b.type !== undefined) row.type = String(b.type);
      if (b.value !== undefined) row.value = Number(b.value);
    }
    revalidatePath("/", "layout");
    return ok({ asset: row ?? null });
  }
  if (method === "DELETE") {
    s.assets = s.assets.filter((a) => !(a.id === Number(b.id) && a.userId === user.id));
    revalidatePath("/", "layout");
    return ok();
  }
  return fail(404, "Unknown method");
}

/* ---------------- liabilities ---------------- */

export async function liabilitiesOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (method === "POST") {
    const row: Liability = {
      id: nextId(),
      userId: user.id,
      name: String(b.name ?? "Liability"),
      type: String(b.type ?? "other"),
      balance: Number(b.balance ?? 0),
      monthlyPayment: Number(b.monthlyPayment ?? 0),
      interestRate: Number(b.interestRate ?? 0),
      remainingMonths: Number(b.remainingMonths ?? 0),
    };
    s.liabilities.push(row);
    revalidatePath("/", "layout");
    return ok({ liability: row });
  }
  if (method === "PATCH") {
    const row = s.liabilities.find((l) => l.id === Number(b.id) && l.userId === user.id);
    if (row) {
      if (b.name !== undefined) row.name = String(b.name);
      if (b.type !== undefined) row.type = String(b.type);
      if (b.balance !== undefined) row.balance = Number(b.balance);
      if (b.monthlyPayment !== undefined) row.monthlyPayment = Number(b.monthlyPayment);
      if (b.interestRate !== undefined) row.interestRate = Number(b.interestRate);
      if (b.remainingMonths !== undefined) row.remainingMonths = Number(b.remainingMonths);
    }
    revalidatePath("/", "layout");
    return ok({ liability: row ?? null });
  }
  if (method === "DELETE") {
    s.liabilities = s.liabilities.filter((l) => !(l.id === Number(b.id) && l.userId === user.id));
    revalidatePath("/", "layout");
    return ok();
  }
  return fail(404, "Unknown method");
}

/* ---------------- transactions ---------------- */

function applyBalance(userId: number, tx: { accountId: number | null; type: string; amount: number }, direction: 1 | -1) {
  if (!tx.accountId) return;
  const delta = (tx.type === "income" ? tx.amount : tx.type === "expense" ? -tx.amount : 0) * direction;
  if (delta === 0) return;
  const s = getStore();
  const acc = s.accounts.find((a) => a.id === tx.accountId && a.userId === userId);
  if (acc) {
    acc.balance += delta;
    acc.updatedAt = new Date();
  }
}

export async function transactionsOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (method === "POST") {
    const list = (Array.isArray(b.transactions) ? b.transactions : [b]) as Record<string, unknown>[];
    const clean = list
      .map((t) => ({
        description: String(t.description ?? "").trim(),
        category: String(t.category ?? "other"),
        type: ["income", "expense", "transfer"].includes(String(t.type)) ? String(t.type) : "expense",
        amount: Math.abs(Number(t.amount) || 0),
        date: String(t.date ?? "").slice(0, 10),
        accountId: t.accountId ? Number(t.accountId) : null,
      }))
      .filter((t) => t.description && t.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.date));
    if (!clean.length) return fail(400, "No valid transactions.");
    const rows: Transaction[] = clean.map((t) => ({ id: nextId(), userId: user.id, ...t, createdAt: new Date() }));
    s.transactions.push(...rows);
    for (const t of clean) applyBalance(user.id, t, 1);
    if (clean.length > 1) {
      s.notifications.push({ id: nextId(), userId: user.id, kind: "system", title: "Import completed", body: `${clean.length} transactions were imported into your Financial Twin.`, href: "/transactions", read: false, createdAt: new Date() });
    }
    revalidatePath("/", "layout");
    return ok({ transactions: rows });
  }
  if (method === "DELETE") {
    const row = s.transactions.find((t) => t.id === Number(b.id) && t.userId === user.id);
    if (row) {
      applyBalance(user.id, row, -1);
      s.transactions = s.transactions.filter((t) => t.id !== row.id);
    }
    revalidatePath("/", "layout");
    return ok();
  }
  return fail(404, "Unknown method");
}

export async function transactionsGet(f: { type?: string; q?: string; limit?: number } = {}): Promise<ApiResult> {
  const user = await getCurrentUser();
  const rows = await getTransactions(user.id, { type: f.type, q: f.q, limit: f.limit ?? 200 });
  return ok({ transactions: rows });
}

/* ---------------- goals ---------------- */

export async function goalsOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (method === "POST") {
    const row: Goal = {
      id: nextId(),
      userId: user.id,
      name: String(b.name ?? "Goal"),
      type: String(b.type ?? "custom"),
      targetAmount: Number(b.targetAmount ?? 0),
      currentAmount: Number(b.currentAmount ?? 0),
      targetDate: String(b.targetDate ?? "").slice(0, 10),
      monthlyContribution: Number(b.monthlyContribution ?? 0),
      status: "active",
      createdAt: new Date(),
    };
    s.goals.push(row);
    s.notifications.push({ id: nextId(), userId: user.id, kind: "goal", title: "New goal created", body: `“${row.name}” is now part of your Financial Twin and can be tested in scenarios.`, href: `/goals/${row.id}`, read: false, createdAt: new Date() });
    revalidatePath("/", "layout");
    return ok({ goal: row });
  }
  if (method === "PATCH") {
    const row = s.goals.find((g) => g.id === Number(b.id) && g.userId === user.id);
    if (row) {
      if (b.name !== undefined) row.name = String(b.name);
      if (b.type !== undefined) row.type = String(b.type);
      if (b.targetAmount !== undefined) row.targetAmount = Number(b.targetAmount);
      if (b.currentAmount !== undefined) row.currentAmount = Number(b.currentAmount);
      if (b.targetDate) row.targetDate = String(b.targetDate).slice(0, 10);
      if (b.monthlyContribution !== undefined) row.monthlyContribution = Number(b.monthlyContribution);
      if (b.status !== undefined) row.status = String(b.status);
    }
    revalidatePath("/", "layout");
    return ok({ goal: row ?? null });
  }
  if (method === "DELETE") {
    s.goals = s.goals.filter((g) => !(g.id === Number(b.id) && g.userId === user.id));
    revalidatePath("/", "layout");
    return ok();
  }
  return fail(404, "Unknown method");
}

/* ---------------- scenarios ---------------- */

export async function scenariosOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (method === "POST") {
    if (b.duplicateOf) {
      const src = s.scenarios.find((x) => x.id === Number(b.duplicateOf) && x.userId === user.id);
      if (!src) return fail(404, "Not found");
      const row: Scenario = { ...src, id: nextId(), userId: user.id, name: `${src.name} (copy)`, createdAt: new Date(), lastRunAt: null };
      s.scenarios.push(row);
      revalidatePath("/scenarios");
      return ok({ scenario: row });
    }
    const row: Scenario = {
      id: nextId(),
      userId: user.id,
      name: String(b.name ?? "Scenario"),
      category: String(b.category ?? "custom"),
      templateKey: b.templateKey != null ? String(b.templateKey) : null,
      description: String(b.description ?? ""),
      params: (b.params ?? {}) as Record<string, unknown>,
      createdAt: new Date(),
      lastRunAt: null,
    };
    s.scenarios.push(row);
    revalidatePath("/scenarios");
    return ok({ scenario: row });
  }
  if (method === "PATCH") {
    const row = s.scenarios.find((x) => x.id === Number(b.id) && x.userId === user.id);
    if (row) {
      if (b.name !== undefined) row.name = String(b.name);
      if (b.category !== undefined) row.category = String(b.category);
      if (b.description !== undefined) row.description = String(b.description);
      if (b.params !== undefined) row.params = b.params as Record<string, unknown>;
    }
    revalidatePath("/scenarios");
    return ok({ scenario: row ?? null });
  }
  if (method === "DELETE") {
    s.scenarios = s.scenarios.filter((sc) => !(sc.id === Number(b.id) && sc.userId === user.id));
    revalidatePath("/scenarios");
    return ok();
  }
  return fail(404, "Unknown method");
}

/* ---------------- simulations ---------------- */

export async function simulationsOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  if (method === "POST") {
    const twin = await getTwin(user);
    const scenario = b.scenarioId ? await getScenario(user.id, Number(b.scenarioId)) : null;
    try {
      const row = await runAndStoreSimulation({
        twin,
        scenario,
        goalId: b.goalId ? Number(b.goalId) : undefined,
        paths: b.paths ? Number(b.paths) : undefined,
        horizonYears: b.horizonYears ? Number(b.horizonYears) : undefined,
        assumptionsOverride: (b.assumptions ?? undefined) as Partial<Record<string, number>> | undefined,
        paramsOverride: (b.params ?? undefined) as ScenarioParams | undefined,
        name: b.name ? String(b.name) : undefined,
      });
      revalidatePath("/", "layout");
      return ok({ id: row.id });
    } catch (e) {
      console.error(e);
      return fail(500, "We couldn't complete this simulation.");
    }
  }
  if (method === "DELETE") {
    const s = getStore();
    s.simulations = s.simulations.filter((x) => !(x.id === Number(b.id) && x.userId === user.id));
    revalidatePath("/simulations");
    return ok();
  }
  return fail(404, "Unknown method");
}

/* ---------------- reports ---------------- */

export async function reportsOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (method === "POST") {
    const row: Report = { id: nextId(), userId: user.id, name: String(b.name ?? "Report"), type: String(b.type ?? "snapshot"), config: (b.config ?? {}) as Record<string, unknown>, createdAt: new Date() };
    s.reports.push(row);
    s.notifications.push({ id: nextId(), userId: user.id, kind: "system", title: "Report ready", body: `“${row.name}” has been generated.`, href: `/reports/${row.id}`, read: false, createdAt: new Date() });
    revalidatePath("/reports");
    return ok({ report: row });
  }
  if (method === "DELETE") {
    s.reports = s.reports.filter((r) => !(r.id === Number(b.id) && r.userId === user.id));
    revalidatePath("/reports");
    return ok();
  }
  return fail(404, "Unknown method");
}

export async function reportsExport(format = "csv"): Promise<ApiResult> {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const tx = await getTransactions(user.id, { limit: 2000 });
  const m = twin.metrics;
  const lines = [
    "section,key,value",
    `snapshot,net_worth,${m.netWorth}`,
    `snapshot,monthly_income,${m.income}`,
    `snapshot,monthly_expenses,${m.expenses}`,
    `snapshot,monthly_savings,${m.savings}`,
    `snapshot,emergency_coverage_months,${m.emergencyCoverage.toFixed(2)}`,
    ...twin.goals.map((g) => `goal,${JSON.stringify(g.name)},${g.currentAmount}/${g.targetAmount}`),
    ...Object.entries(twin.econ).map(([k, v]) => `assumption,${k},${v}`),
    "",
    "date,description,category,type,amount",
    ...tx.map((t) => `${t.date},${JSON.stringify(t.description)},${t.category},${t.type},${t.amount}`),
  ];
  const body = lines.join("\n");
  const ext = format === "excel" ? "xls" : "csv";
  return {
    status: 200,
    body: {
      filename: `fintwin-report.${ext}`,
      mime: format === "excel" ? "application/vnd.ms-excel" : "text/csv",
      body,
    },
  };
}

/* ---------------- notifications ---------------- */

export async function notificationsOp(method: string, b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (method === "PATCH") {
    if (b.all) {
      for (const n of s.notifications) if (n.userId === user.id) n.read = true;
    } else if (b.id) {
      const n = s.notifications.find((x) => x.id === Number(b.id) && x.userId === user.id);
      if (n) n.read = (b.read as boolean) ?? true;
    }
    revalidatePath("/", "layout");
    return ok();
  }
  if (method === "DELETE") {
    s.notifications = s.notifications.filter((n) => !(n.id === Number(b.id) && n.userId === user.id));
    revalidatePath("/", "layout");
    return ok();
  }
  return fail(404, "Unknown method");
}

/* ---------------- assumptions ---------------- */

export async function assumptionsPatch(b: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  const row = s.assumptions.find((a) => a.userId === user.id);
  if (row) {
    for (const k of ["inflation", "incomeGrowth", "expenseGrowth", "investmentReturn", "volatility"] as const) if (b[k] !== undefined) (row as unknown as Record<string, unknown>)[k] = Number(b[k]);
    if (b.horizonYears !== undefined) row.horizonYears = Math.round(Number(b.horizonYears));
    if (b.preset) row.preset = String(b.preset);
    row.updatedAt = new Date();
  }
  revalidatePath("/", "layout");
  return ok({ assumptions: row ?? null });
}

/* ---------------- onboarding ---------------- */

export async function onboardingPost(p: Record<string, unknown>): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  const userId = user.id;
  const profile = p.profile as { name: string; age: number; country: string; city: string; currency: string; employment: string; planningStyle: string };
  const income = p.income as { monthlyIncome: number; additionalIncome: number; incomeFrequency: string; incomeGrowth: number };
  const expenses = (p.expenses ?? {}) as Record<string, number>;
  const savings = p.savings as { cashSavings: number; emergencySavings: number; monthlySavings: number; otherLiquid: number };
  const pAssets = (p.assets ?? []) as { name: string; type: string; value: number }[];
  const pLiabilities = (p.liabilities ?? []) as { name: string; type: string; balance: number; monthlyPayment: number; interestRate: number; remainingMonths: number }[];
  const pGoals = (p.goals ?? []) as { name: string; type: string; targetAmount: number; currentAmount: number; targetDate: string; monthlyContribution: number }[];
  const pAssumptions = p.assumptions as { inflation: number; incomeGrowth: number; expenseGrowth: number; investmentReturn: number; volatility: number; horizonYears: number };

  user.name = String(profile.name || user.name);
  user.age = profile.age || null;
  user.country = String(profile.country);
  user.city = String(profile.city);
  user.currency = String(profile.currency || "EGP");
  user.employment = String(profile.employment);
  user.planningStyle = String(profile.planningStyle);
  user.onboarded = true;

  let profileRow = s.financialProfiles.find((x) => x.userId === userId);
  if (!profileRow) {
    profileRow = { id: nextId(), userId, monthlyIncome: 0, additionalIncome: 0, incomeFrequency: "monthly", expenses: {}, cashSavings: 0, emergencySavings: 0, monthlySavings: 0, otherLiquid: 0, updatedAt: new Date() };
    s.financialProfiles.push(profileRow);
  }
  profileRow.monthlyIncome = Number(income.monthlyIncome) || 0;
  profileRow.additionalIncome = Number(income.additionalIncome) || 0;
  profileRow.incomeFrequency = String(income.incomeFrequency);
  profileRow.expenses = expenses;
  profileRow.cashSavings = Number(savings.cashSavings) || 0;
  profileRow.emergencySavings = Number(savings.emergencySavings) || 0;
  profileRow.monthlySavings = Number(savings.monthlySavings) || 0;
  profileRow.otherLiquid = Number(savings.otherLiquid) || 0;
  profileRow.updatedAt = new Date();

  let assumptionRow = s.assumptions.find((a) => a.userId === userId);
  if (!assumptionRow) {
    assumptionRow = { id: nextId(), userId, ...DEFAULT_ASSUMPTIONS, preset: "custom", updatedAt: new Date() };
    s.assumptions.push(assumptionRow);
  }
  assumptionRow.inflation = Number(pAssumptions.inflation);
  assumptionRow.incomeGrowth = income.incomeGrowth ?? pAssumptions.incomeGrowth;
  assumptionRow.expenseGrowth = Number(pAssumptions.expenseGrowth);
  assumptionRow.investmentReturn = Number(pAssumptions.investmentReturn);
  assumptionRow.volatility = Number(pAssumptions.volatility);
  assumptionRow.horizonYears = Math.round(Number(pAssumptions.horizonYears));
  assumptionRow.preset = "custom";
  assumptionRow.updatedAt = new Date();

  // Liquid savings become accounts; non-liquid become assets.
  const liquidTypes = new Set(["cash", "bank", "investment"]);
  const currency = String(profile.currency || "EGP");
  s.accounts = s.accounts.filter((a) => a.userId !== userId);
  s.assets = s.assets.filter((a) => a.userId !== userId);
  const accountRows: Account[] = [
    ...(Number(savings.cashSavings) > 0 ? [{ name: "Main account", type: "bank", balance: Number(savings.cashSavings) }] : []),
    ...(Number(savings.emergencySavings) > 0 ? [{ name: "Emergency savings", type: "savings", balance: Number(savings.emergencySavings) }] : []),
    ...(Number(savings.otherLiquid) > 0 ? [{ name: "Other liquid assets", type: "savings", balance: Number(savings.otherLiquid) }] : []),
    ...pAssets
      .filter((a) => liquidTypes.has(a.type))
      .map((a) => ({ name: a.name, type: a.type === "cash" ? "cash" : a.type === "bank" ? "bank" : "investment", balance: a.value })),
  ].map((a) => ({ id: nextId(), userId, name: a.name, type: a.type, balance: Number(a.balance), currency, institution: null, updatedAt: new Date() }));
  s.accounts.push(...accountRows);
  s.assets = pAssets
    .filter((a) => !liquidTypes.has(a.type))
    .map((a) => ({ id: nextId(), userId, name: a.name, type: a.type, value: Number(a.value) }));

  s.liabilities = pLiabilities.map((l) => ({
    id: nextId(),
    userId,
    name: String(l.name),
    type: String(l.type),
    balance: Number(l.balance),
    monthlyPayment: Number(l.monthlyPayment),
    interestRate: Number(l.interestRate),
    remainingMonths: Number(l.remainingMonths),
  }));

  s.goals = s.goals.filter((g) => g.userId !== userId);
  for (const g of pGoals) {
    s.goals.push({
      id: nextId(),
      userId,
      name: String(g.name),
      type: String(g.type),
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      targetDate: String(g.targetDate).slice(0, 10),
      monthlyContribution: Number(g.monthlyContribution),
      status: "active",
      createdAt: new Date(),
    });
  }

  s.notifications.push({ id: nextId(), userId, kind: "system", title: "Your Financial Twin is ready", body: "Explore your overview, then test a decision with a scenario.", href: "/overview", read: false, createdAt: new Date() });
  revalidatePath("/", "layout");
  return ok();
}

/* ---------------- data export & deletion ---------------- */

export async function dataExport(): Promise<ApiResult> {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const [tx, sc, sims] = await Promise.all([getTransactions(user.id, { limit: 5000 }), getScenarios(user.id), getSimulations(user.id, 200)]);
  const payload = {
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email, currency: user.currency },
    profile: twin.profile,
    assumptions: twin.assumptions,
    accounts: twin.accounts,
    assets: twin.assets,
    liabilities: twin.liabilities,
    goals: twin.goals,
    transactions: tx,
    scenarios: sc,
    simulations: sims.map((sim: Simulation) => ({ ...sim, results: undefined })),
  };
  return { status: 200, body: { filename: "fintwin-export.json", mime: "application/json", body: JSON.stringify(payload, null, 2) } };
}

export async function dataDelete(scope: string): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  if (scope === "transactions") {
    s.transactions = s.transactions.filter((t) => t.userId !== user.id);
  } else if (scope === "profile") {
    s.transactions = s.transactions.filter((t) => t.userId !== user.id);
    s.accounts = s.accounts.filter((a) => a.userId !== user.id);
    s.assets = s.assets.filter((a) => a.userId !== user.id);
    s.liabilities = s.liabilities.filter((l) => l.userId !== user.id);
    s.goals = s.goals.filter((g) => g.userId !== user.id);
    s.scenarios = s.scenarios.filter((x) => x.userId !== user.id);
    s.simulations = s.simulations.filter((x) => x.userId !== user.id);
    s.reports = s.reports.filter((r) => r.userId !== user.id);
    s.aiMessages = s.aiMessages.filter((m) => m.userId !== user.id);
    s.notifications = s.notifications.filter((n) => n.userId !== user.id);
    const profileRow = s.financialProfiles.find((x) => x.userId === user.id);
    if (profileRow) {
      profileRow.monthlyIncome = 0;
      profileRow.additionalIncome = 0;
      profileRow.expenses = {};
      profileRow.cashSavings = 0;
      profileRow.emergencySavings = 0;
      profileRow.monthlySavings = 0;
      profileRow.otherLiquid = 0;
      profileRow.updatedAt = new Date();
    }
    user.onboarded = false;
  } else if (scope === "account") {
    return fail(400, "The shared demo account cannot be deleted. Sign up to create your own.");
  }
  revalidatePath("/", "layout");
  return ok();
}

/* ---------------- search ---------------- */

export async function searchGet(q: string): Promise<ApiResult> {
  const user = await getCurrentUser();
  const query = (q ?? "").trim();
  if (query.length < 2) return ok({ results: [] });
  const like = query.toLowerCase();
  const s = getStore();
  const match = (v: string | null | undefined) => (v ?? "").toLowerCase().includes(like);
  const acc = s.accounts.filter((a) => a.userId === user.id && match(a.name)).slice(0, 4);
  const gl = s.goals.filter((g) => g.userId === user.id && match(g.name)).slice(0, 4);
  const sc = s.scenarios.filter((x) => x.userId === user.id && match(x.name)).slice(0, 4);
  const sim = s.simulations.filter((x) => x.userId === user.id && match(x.name)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4);
  const tx = s.transactions.filter((t) => t.userId === user.id && match(t.description)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const rp = s.reports.filter((r) => r.userId === user.id && match(r.name)).slice(0, 3);
  const ai = s.aiMessages.filter((m) => m.userId === user.id && m.role === "user" && match(m.content)).slice(-3).reverse();
  const results = [
    ...acc.map((a) => ({ id: `acc-${a.id}`, label: a.name, hint: formatMoney(a.balance, a.currency), icon: "Wallet", group: "Accounts", href: `/accounts/${a.id}` })),
    ...gl.map((g) => ({ id: `goal-${g.id}`, label: g.name, hint: `${formatMoney(g.currentAmount, user.currency)} of ${formatMoney(g.targetAmount, user.currency)}`, icon: "Target", group: "Goals", href: `/goals/${g.id}` })),
    ...sc.map((x) => ({ id: `sc-${x.id}`, label: x.name, hint: x.category, icon: "GitBranch", group: "Scenarios", href: `/scenarios/${x.id}` })),
    ...sim.map((x) => ({ id: `sim-${x.id}`, label: x.name, hint: `${x.paths} paths · ${x.horizonYears}y`, icon: "Activity", group: "Simulations", href: `/simulations/${x.id}` })),
    ...tx.map((t) => ({ id: `tx-${t.id}`, label: t.description, hint: `${t.date} · ${formatMoney(t.amount, user.currency)}`, icon: "Receipt", group: "Transactions", href: `/transactions?q=${encodeURIComponent(t.description)}` })),
    ...rp.map((r) => ({ id: `rp-${r.id}`, label: r.name, hint: r.type, icon: "FileText", group: "Reports", href: `/reports/${r.id}` })),
    ...ai.map((m) => ({ id: `ai-${m.id}`, label: m.content, hint: "AI conversation", icon: "Sparkles", group: "AI conversations", href: "/ai" })),
  ];
  return ok({ results });
}

/* ---------------- ai ---------------- */

export async function aiPost(question: string): Promise<ApiResult> {
  const user = await getCurrentUser();
  const q = String(question ?? "").trim().slice(0, 500);
  if (!q) return fail(400, "Ask a question first.");
  const twin = await getTwin(user);
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const tx = await getTransactions(user.id, { from: toISODate(since), limit: 1000 });
  const scenarioRows = await getScenarios(user.id);
  const latest = await getLatestSimulation(user.id);
  const latestResults = resultsOf(latest);
  const answer = answerQuestion(q, {
    currency: user.currency,
    input: twin.input,
    metrics: twin.metrics,
    econ: twin.econ,
    goals: twin.goals.map((g) => ({ ...g, targetDate: String(g.targetDate) })),
    recentTransactions: tx.map((t) => ({ description: t.description, category: t.category, type: t.type, amount: t.amount, date: String(t.date) })),
    scenarios: scenarioRows.map((sc) => ({ id: sc.id, name: sc.name, params: sc.params as ScenarioParams })),
    latestSimulation: latest && latestResults ? { id: latest.id, name: latest.name, results: latestResults } : null,
  });
  const s = getStore();
  s.aiMessages.push(
    { id: nextId(), userId: user.id, role: "user", content: q, meta: null, createdAt: new Date() },
    { id: nextId(), userId: user.id, role: "assistant", content: answer.text, meta: answer as unknown as Record<string, unknown>, createdAt: new Date() },
  );
  return ok({ answer });
}

export async function aiDelete(): Promise<ApiResult> {
  const user = await getCurrentUser();
  const s = getStore();
  s.aiMessages = s.aiMessages.filter((m) => m.userId !== user.id);
  return ok();
}

/* ---------------- health ---------------- */

export async function health(): Promise<ApiResult> {
  return ok({ ok: true });
}

