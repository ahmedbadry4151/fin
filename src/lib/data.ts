import {
  type User,
  type FinancialProfile,
  type Assumptions,
  type Account,
  type Asset,
  type Liability,
  type Goal,
  type Transaction,
  type Scenario,
  type Simulation,
} from "./types";
import { getStore, nextId } from "./store";
import { computeMetrics, type TwinInput, type TwinMetrics } from "./finance";
import { applyPlanningStyle, DEFAULT_ASSUMPTIONS } from "./economy";
import { runSimulation, type EconAssumptions, type ScenarioParams, type SimResults } from "./simulation";
import { buildSimTwin } from "./twin";

/** Force dynamic rendering for pages that read the in-memory twin. */
async function touchDynamic() {
  const { cookies } = await import("next/headers");
  await cookies();
}

export async function getCurrentUser(): Promise<User> {
  await touchDynamic();
  const s = getStore();
  return s.users[0];
}

export type TwinData = {
  user: User;
  profile: FinancialProfile;
  assumptions: Assumptions;
  econ: EconAssumptions;
  accounts: Account[];
  assets: Asset[];
  liabilities: Liability[];
  goals: Goal[];
  input: TwinInput;
  metrics: TwinMetrics;
};

export function econFromRow(a: Assumptions | null | undefined, planningStyle = "balanced"): EconAssumptions {
  const base: EconAssumptions = a
    ? {
        inflation: a.inflation,
        incomeGrowth: a.incomeGrowth,
        expenseGrowth: a.expenseGrowth,
        investmentReturn: a.investmentReturn,
        volatility: a.volatility,
        horizonYears: a.horizonYears,
      }
    : DEFAULT_ASSUMPTIONS;
  return applyPlanningStyle(base, planningStyle);
}

export async function getTwin(user: User): Promise<TwinData> {
  await touchDynamic();
  const s = getStore();
  const userId = user.id;

  let profile = s.financialProfiles.find((p) => p.userId === userId);
  if (!profile) {
    profile = { id: nextId(), userId, monthlyIncome: 0, additionalIncome: 0, incomeFrequency: "monthly", expenses: {}, cashSavings: 0, emergencySavings: 0, monthlySavings: 0, otherLiquid: 0, updatedAt: new Date() };
    s.financialProfiles.push(profile);
  }
  let assumptionRow = s.assumptions.find((a) => a.userId === userId);
  if (!assumptionRow) {
    assumptionRow = { id: nextId(), userId, ...DEFAULT_ASSUMPTIONS, preset: "normal", updatedAt: new Date() };
    s.assumptions.push(assumptionRow);
  }

  const accountRows = s.accounts.filter((a) => a.userId === userId).sort((a, b) => a.id - b.id);
  const assetRows = s.assets.filter((a) => a.userId === userId).sort((a, b) => a.id - b.id);
  const liabilityRows = s.liabilities.filter((l) => l.userId === userId).sort((a, b) => a.id - b.id);
  const goalRows = s.goals.filter((g) => g.userId === userId).sort((a, b) => a.id - b.id);

  const input: TwinInput = {
    monthlyIncome: profile.monthlyIncome,
    additionalIncome: profile.additionalIncome,
    expenses: profile.expenses ?? {},
    cashSavings: profile.cashSavings,
    emergencySavings: profile.emergencySavings,
    monthlySavings: profile.monthlySavings,
    otherLiquid: profile.otherLiquid,
    accounts: accountRows.map((a) => ({ type: a.type, balance: a.balance })),
    assets: assetRows.map((a) => ({ type: a.type, value: a.value })),
    liabilities: liabilityRows.map((l) => ({
      balance: l.balance,
      monthlyPayment: l.monthlyPayment,
      interestRate: l.interestRate,
      remainingMonths: l.remainingMonths,
    })),
  };

  return {
    user,
    profile,
    assumptions: assumptionRow,
    econ: econFromRow(assumptionRow, user.planningStyle),
    accounts: accountRows,
    assets: assetRows,
    liabilities: liabilityRows,
    goals: goalRows,
    input,
    metrics: computeMetrics(input),
  };
}

export type TransactionFilters = {
  type?: string;
  category?: string;
  accountId?: number;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export async function getTransactions(userId: number, f: TransactionFilters = {}): Promise<Transaction[]> {
  await touchDynamic();
  const s = getStore();
  let rows = s.transactions.filter((t) => t.userId === userId);
  if (f.type && f.type !== "all") rows = rows.filter((t) => t.type === f.type);
  if (f.category) rows = rows.filter((t) => t.category === f.category);
  if (f.accountId) rows = rows.filter((t) => t.accountId === f.accountId);
  if (f.from) rows = rows.filter((t) => t.date >= f.from!);
  if (f.to) rows = rows.filter((t) => t.date <= f.to!);
  if (f.q) {
    const q = f.q.toLowerCase();
    rows = rows.filter((t) => t.description.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase()));
  }
  rows.sort((a, b) => (a.date === b.date ? b.id - a.id : b.date.localeCompare(a.date)));
  return rows.slice(0, f.limit ?? 500);
  return rows.slice(0, f.limit ?? 500);
}

export type MonthAgg = {
  key: string;
  label: string;
  income: number;
  expense: number;
  transfer: number;
  byCategory: Record<string, number>;
};

export function aggregateByMonth(rows: Transaction[], months = 6): MonthAgg[] {
  const now = new Date();
  const out: MonthAgg[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: d.toLocaleDateString("en-GB", { month: "short" }), income: 0, expense: 0, transfer: 0, byCategory: {} });
  }
  const index = new Map(out.map((m) => [m.key, m]));
  for (const t of rows) {
    const key = String(t.date).slice(0, 7);
    const m = index.get(key);
    if (!m) continue;
    if (t.type === "income") m.income += t.amount;
    else if (t.type === "expense") {
      m.expense += t.amount;
      m.byCategory[t.category] = (m.byCategory[t.category] ?? 0) + t.amount;
    } else m.transfer += t.amount;
  }
  return out;
}

export async function getScenarios(userId: number): Promise<Scenario[]> {
  await touchDynamic();
  const s = getStore();
  return s.scenarios.filter((x) => x.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getScenario(userId: number, id: number): Promise<Scenario | null> {
  await touchDynamic();
  const s = getStore();
  return s.scenarios.find((x) => x.userId === userId && x.id === id) ?? null;
}

export async function getSimulations(userId: number, limit = 50): Promise<Simulation[]> {
  await touchDynamic();
  const s = getStore();
  return s.simulations.filter((x) => x.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

export async function getSimulation(userId: number, id: number): Promise<Simulation | null> {
  await touchDynamic();
  const s = getStore();
  return s.simulations.find((x) => x.userId === userId && x.id === id) ?? null;
}

export async function getLatestSimulation(userId: number): Promise<Simulation | null> {
  await touchDynamic();
  const s = getStore();
  const rows = s.simulations.filter((x) => x.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows[0] ?? null;
}

export async function getNotifications(userId: number) {
  await touchDynamic();
  const s = getStore();
  return s.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);
}

export async function getUnreadCount(userId: number) {
  await touchDynamic();
  const s = getStore();
  return s.notifications.filter((n) => n.userId === userId && !n.read).length;
}

export async function getReports(userId: number) {
  await touchDynamic();
  const s = getStore();
  return s.reports.filter((r) => r.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getReport(userId: number, id: number) {
  await touchDynamic();
  const s = getStore();
  return s.reports.find((r) => r.userId === userId && r.id === id) ?? null;
}

export async function getAiMessages(userId: number) {
  await touchDynamic();
  const s = getStore();
  return s.aiMessages.filter((m) => m.userId === userId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(0, 60);
}

export function resultsOf(sim: Simulation | null | undefined): SimResults | null {
  return (sim?.results as unknown as SimResults | null) ?? null;
}

/** Run the Monte Carlo engine for a user and store the result in memory. */
export async function runAndStoreSimulation(opts: {
  twin: TwinData;
  scenario: Scenario | null;
  goalId?: number | null;
  paths?: number;
  horizonYears?: number;
  assumptionsOverride?: Partial<EconAssumptions>;
  paramsOverride?: ScenarioParams;
  name?: string;
}): Promise<Simulation> {
  const { twin } = opts;
  const goal = opts.goalId ? twin.goals.find((g) => g.id === opts.goalId) ?? null : twin.goals[0] ?? null;
  const simTwin = buildSimTwin(twin.input, goal ? { ...goal, targetDate: String(goal.targetDate) } : null);
  const econ: EconAssumptions = { ...twin.econ, ...(opts.assumptionsOverride ?? {}), horizonYears: opts.horizonYears ?? twin.econ.horizonYears };
  const params: ScenarioParams = opts.paramsOverride ?? ((opts.scenario?.params ?? {}) as ScenarioParams);
  const paths = Math.min(5000, Math.max(100, opts.paths ?? 600));
  const seed = 1000 + Math.floor(Math.random() * 100000);
  const results = runSimulation(simTwin, econ, params, { paths, seed, sensitivity: true, baseline: true });
  const row: Simulation = {
    id: nextId(),
    userId: twin.user.id,
    scenarioId: opts.scenario?.id ?? null,
    goalId: goal?.id ?? null,
    name: opts.name ?? opts.scenario?.name ?? "Current Plan",
    horizonYears: econ.horizonYears,
    paths,
    status: "completed",
    assumptions: econ as unknown as Record<string, number>,
    results: results as unknown as Record<string, unknown>,
    createdAt: new Date(),
  };
  const s = getStore();
  s.simulations.push(row);
  if (opts.scenario) {
    opts.scenario.lastRunAt = new Date();
  }
  s.notifications.push({
    id: nextId(),
    userId: twin.user.id,
    kind: "simulation",
    title: "Simulation finished",
    body: `“${row.name}” completed with ${paths} paths over ${econ.horizonYears} years.`,
    href: `/simulations/${row.id}`,
    read: false,
    createdAt: new Date(),
  });
  return row;
}
