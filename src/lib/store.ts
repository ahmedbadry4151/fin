import type {
  User,
  FinancialProfile,
  Assumptions,
  Account,
  Transaction,
  Asset,
  Liability,
  Goal,
  Scenario,
  Simulation,
  Notification,
  Report,
  AiMessage,
} from "./types";
import { DEMO_EMAIL } from "./constants";
import { runSimulation } from "./simulation";
import { buildSimTwin } from "./twin";
import { templateByKey } from "./scenarios";
import { DEFAULT_ASSUMPTIONS } from "./economy";
import { toISODate } from "./format";

export type Store = {
  users: User[];
  financialProfiles: FinancialProfile[];
  assumptions: Assumptions[];
  accounts: Account[];
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  goals: Goal[];
  scenarios: Scenario[];
  simulations: Simulation[];
  notifications: Notification[];
  reports: Report[];
  aiMessages: AiMessage[];
};

const DEMO_EXPENSES: Record<string, number> = {
  housing: 7500,
  food: 4200,
  transportation: 1800,
  utilities: 1100,
  healthcare: 600,
  education: 0,
  debt: 1750,
  family: 1500,
  entertainment: 900,
  shopping: 800,
  travel: 500,
  subscriptions: 350,
  other: 400,
};

function rnd(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let idCounter = 0;
export function nextId() {
  return ++idCounter;
}

function buildDemoTransactions(userId: number, ids: { bank: number; savings: number; credit: number }): Transaction[] {
  const rows: Omit<Transaction, "id">[] = [];
  const now = new Date();
  const r = rnd(20240601);
  const push = (day: number, base: Date, description: string, category: string, type: string, amount: number, accountId: number) => {
    const d = new Date(base.getFullYear(), base.getMonth(), Math.min(day, 28));
    if (d > now) return;
    rows.push({ userId, accountId, description, category, type, amount: Math.round(amount), date: toISODate(d), createdAt: d });
  };
  for (let mo = 6; mo >= 0; mo--) {
    const base = new Date(now.getFullYear(), now.getMonth() - mo, 1);
    push(1, base, "Salary — Horizon Digital", "salary", "income", 32000, ids.bank);
    push(2, base, "Apartment rent", "housing", "expense", 7500, ids.bank);
    push(3, base, "Transfer to savings", "savings", "transfer", 10000, ids.bank);
    push(5, base, "Car loan instalment", "debt", "expense", 1250, ids.bank);
    push(6, base, "Credit card payment", "debt", "expense", 500, ids.bank);
    push(8, base, "Electricity & water", "utilities", "expense", 600 + r() * 150, ids.bank);
    push(9, base, "Internet & mobile", "utilities", "expense", 450, ids.bank);
    push(10, base, "Family support", "family", "expense", 1500, ids.bank);
    push(11, base, "Pharmacy", "healthcare", "expense", 350 + r() * 400, ids.credit);
    [4, 11, 18, 25].forEach((day, i) => push(day, base, i % 2 ? "Carrefour groceries" : "Local market", "food", "expense", 700 + r() * 300, ids.credit));
    [7, 21].forEach((day) => push(day, base, "Fuel", "transportation", "expense", 800 + r() * 250, ids.credit));
    push(12, base, "Netflix", "subscriptions", "expense", 165, ids.credit);
    push(12, base, "Spotify", "subscriptions", "expense", 60, ids.credit);
    push(13, base, "Gym membership", "subscriptions", "expense", 125, ids.credit);
    [14, 20, 27].forEach((day, i) => push(day, base, ["Dinner with friends", "Coffee & brunch", "Cinema"][i], "entertainment", "expense", 220 + r() * 220, ids.credit));
    [16, 23].forEach((day, i) => push(day, base, i ? "Clothing" : "Home items", "shopping", "expense", 300 + r() * 350, ids.credit));
    push(19, base, "Ride hailing", "transportation", "expense", 150 + r() * 120, ids.credit);
    push(22, base, "Miscellaneous", "other", "expense", 250 + r() * 300, ids.bank);
    if (mo === 3) push(15, base, "Weekend trip — Dahab", "travel", "expense", 4200, ids.credit);
    if (mo === 1) push(17, base, "Freelance design project", "freelance", "income", 6000, ids.bank);
    if (mo === 0) push(9, base, "Annual car insurance", "transportation", "expense", 2400, ids.bank);
  }
  return rows.map((r) => ({ ...r, id: nextId() }));
}

function buildStore(): Store {
  const now = new Date();
  const y = now.getFullYear();

  const user: User = {
    id: nextId(),
    name: "Nour Adel",
    email: DEMO_EMAIL,
    passwordHash: "demo",
    age: 31,
    country: "Egypt",
    city: "Cairo",
    currency: "EGP",
    employment: "employed",
    planningStyle: "balanced",
    onboarded: true,
    emailVerified: true,
    settings: { notifications: { financial: true, goals: true, simulation: true, system: true }, ai: { transparency: true }, defaultPaths: 600 },
    createdAt: now,
  };
  const userId = user.id;

  const profile: FinancialProfile = {
    id: nextId(),
    userId,
    monthlyIncome: 32000,
    additionalIncome: 0,
    incomeFrequency: "monthly",
    expenses: DEMO_EXPENSES,
    cashSavings: 48200,
    emergencySavings: 88560,
    monthlySavings: 10600,
    otherLiquid: 0,
    updatedAt: now,
  };

  const assumptionRow: Assumptions = {
    id: nextId(),
    userId,
    inflation: 0.12,
    incomeGrowth: 0.08,
    expenseGrowth: 0.1,
    investmentReturn: 0.11,
    volatility: 0.14,
    horizonYears: 10,
    preset: "normal",
    updatedAt: now,
  };

  const accounts: Account[] = [
    { id: nextId(), userId, name: "Main Bank", type: "bank", balance: 48200, currency: "EGP", institution: "CIB", updatedAt: now },
    { id: nextId(), userId, name: "Savings", type: "savings", balance: 120000, currency: "EGP", institution: "CIB", updatedAt: now },
    { id: nextId(), userId, name: "Investments", type: "investment", balance: 95000, currency: "EGP", institution: "Thndr", updatedAt: now },
    { id: nextId(), userId, name: "Credit Card", type: "credit", balance: -8500, currency: "EGP", institution: "CIB", updatedAt: now },
  ];
  const ids = {
    bank: accounts.find((a) => a.name === "Main Bank")!.id,
    savings: accounts.find((a) => a.name === "Savings")!.id,
    credit: accounts.find((a) => a.name === "Credit Card")!.id,
  };

  const assets: Asset[] = [
    { id: nextId(), userId, name: "Car", type: "vehicle", value: 185000 },
    { id: nextId(), userId, name: "Gold", type: "other", value: 30000 },
  ];
  const liabilities: Liability[] = [{ id: nextId(), userId, name: "Car loan", type: "car_loan", balance: 41200, monthlyPayment: 1250, interestRate: 0.12, remainingMonths: 38 }];

  const goals: Goal[] = [
    { id: nextId(), userId, name: "Buy a Home", type: "home", targetAmount: 1500000, currentAmount: 126000, targetDate: `${y + 8}-01-01`, monthlyContribution: 8500, status: "active", createdAt: now },
    { id: nextId(), userId, name: "Emergency Fund", type: "emergency", targetAmount: 110700, currentAmount: 88560, targetDate: `${y + 1}-06-01`, monthlyContribution: 1000, status: "active", createdAt: now },
    { id: nextId(), userId, name: "Japan Trip", type: "travel", targetAmount: 60000, currentAmount: 18000, targetDate: `${y + 1}-11-01`, monthlyContribution: 1000, status: "active", createdAt: now },
  ];
  const homeGoal = goals[0];

  const transactions: Transaction[] = buildDemoTransactions(userId, ids);

  const templates = ["lose-job", "save-more", "buy-home", "high-inflation", "have-child"].map((k) => templateByKey(k)!);
  const scenarios: Scenario[] = templates.map((t) => ({
    id: nextId(),
    userId,
    name: t.name,
    category: t.category,
    templateKey: t.key,
    description: t.description,
    params: t.params as unknown as Record<string, unknown>,
    createdAt: now,
    lastRunAt: now,
  }));

  const input = {
    monthlyIncome: 32000,
    additionalIncome: 0,
    expenses: DEMO_EXPENSES,
    cashSavings: 48200,
    emergencySavings: 88560,
    monthlySavings: 10600,
    otherLiquid: 0,
    accounts: accounts.map((a) => ({ type: a.type, balance: a.balance })),
    assets: [
      { type: "vehicle", value: 185000 },
      { type: "other", value: 30000 },
    ],
    liabilities: [{ balance: 41200, monthlyPayment: 1250, interestRate: 0.12, remainingMonths: 38 }],
  };
  const simTwin = buildSimTwin(input, { ...homeGoal, targetDate: String(homeGoal.targetDate) });

  const baseline = runSimulation(simTwin, { ...DEFAULT_ASSUMPTIONS }, {}, { paths: 600, seed: 1337, sensitivity: true, baseline: false });
  const simulations: Simulation[] = [
    { id: nextId(), userId, scenarioId: null, goalId: homeGoal.id, name: "Current Plan", horizonYears: 10, paths: 600, status: "completed", assumptions: { ...DEFAULT_ASSUMPTIONS }, results: baseline as unknown as Record<string, unknown>, createdAt: now },
  ];
  for (const key of ["lose-job", "save-more"]) {
    const sc = scenarios.find((s) => s.templateKey === key)!;
    const res = runSimulation(simTwin, { ...DEFAULT_ASSUMPTIONS }, templateByKey(key)!.params, { paths: 600, seed: 1337 + sc.id, sensitivity: true, baseline: true });
    simulations.push({ id: nextId(), userId, scenarioId: sc.id, goalId: homeGoal.id, name: sc.name, horizonYears: 10, paths: 600, status: "completed", assumptions: { ...DEFAULT_ASSUMPTIONS }, results: res as unknown as Record<string, unknown>, createdAt: now });
  }

  const notifications: Notification[] = [
    { id: nextId(), userId, kind: "simulation", title: "Simulation finished", body: "“Save 15% More” completed with 600 paths. Goal probability moved up.", href: "/simulations", read: false, createdAt: now },
    { id: nextId(), userId, kind: "goal", title: "Emergency Fund at 80%", body: "You are EGP 22,140 away from six months of essential expenses.", href: "/goals", read: false, createdAt: now },
    { id: nextId(), userId, kind: "financial", title: "Transportation spending up", body: "Annual car insurance pushed transportation 2.3× above its monthly average.", href: "/analytics/spending", read: false, createdAt: now },
    { id: nextId(), userId, kind: "system", title: "Financial Twin updated", body: "Your model now reflects 7 months of transactions.", href: "/twin", read: true, createdAt: now },
  ];

  const reports: Report[] = [
    { id: nextId(), userId, name: "Financial Snapshot — this month", type: "snapshot", config: { sections: ["summary", "snapshot", "charts", "goals", "assumptions"], range: "month" }, createdAt: now },
    { id: nextId(), userId, name: "Lose My Job — scenario report", type: "scenario", config: { sections: ["summary", "scenario", "charts", "assumptions", "ai"], scenarioKey: "lose-job" }, createdAt: now },
  ];

  return {
    users: [user],
    financialProfiles: [profile],
    assumptions: [assumptionRow],
    accounts,
    transactions,
    assets,
    liabilities,
    goals,
    scenarios,
    simulations,
    notifications,
    reports,
    aiMessages: [],
  };
}

let store: Store | null = null;

/** Lazily build the in-memory store, seeded with the demo Financial Twin. */
export function getStore(): Store {
  if (!store) store = buildStore();
  return store;
}
