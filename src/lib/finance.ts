export type ExpenseCategory = { key: string; label: string; essential: boolean };

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { key: "housing", label: "Housing", essential: true },
  { key: "food", label: "Food", essential: true },
  { key: "transportation", label: "Transportation", essential: true },
  { key: "utilities", label: "Utilities", essential: true },
  { key: "healthcare", label: "Healthcare", essential: true },
  { key: "education", label: "Education", essential: true },
  { key: "debt", label: "Debt payments", essential: true },
  { key: "family", label: "Family support", essential: true },
  { key: "entertainment", label: "Entertainment", essential: false },
  { key: "shopping", label: "Shopping", essential: false },
  { key: "travel", label: "Travel", essential: false },
  { key: "subscriptions", label: "Subscriptions", essential: false },
  { key: "other", label: "Other", essential: false },
];

export const ESSENTIAL_KEYS = new Set(EXPENSE_CATEGORIES.filter((c) => c.essential).map((c) => c.key));

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c.label]),
);
CATEGORY_LABEL.income = "Income";
CATEGORY_LABEL.salary = "Salary";
CATEGORY_LABEL.freelance = "Freelance";
CATEGORY_LABEL.transfer = "Transfer";
CATEGORY_LABEL.savings = "Savings";
CATEGORY_LABEL.investment = "Investment";

export const LIQUID_ACCOUNT_TYPES = new Set(["bank", "savings", "cash", "investment"]);

export const ACCOUNT_TYPES = [
  { key: "bank", label: "Bank account" },
  { key: "savings", label: "Savings" },
  { key: "cash", label: "Cash" },
  { key: "investment", label: "Investment" },
  { key: "credit", label: "Credit card" },
  { key: "wallet", label: "Digital wallet" },
];

export const ASSET_TYPES = [
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank account" },
  { key: "investment", label: "Investments" },
  { key: "property", label: "Property" },
  { key: "vehicle", label: "Vehicle" },
  { key: "business", label: "Business" },
  { key: "other", label: "Other" },
];

export const LIABILITY_TYPES = [
  { key: "credit_card", label: "Credit card" },
  { key: "personal_loan", label: "Personal loan" },
  { key: "mortgage", label: "Mortgage" },
  { key: "car_loan", label: "Car loan" },
  { key: "student_loan", label: "Student loan" },
  { key: "other", label: "Other" },
];

export const GOAL_TYPES = [
  { key: "emergency", label: "Emergency Fund" },
  { key: "home", label: "Buy a Home" },
  { key: "car", label: "Buy a Car" },
  { key: "marriage", label: "Marriage" },
  { key: "education", label: "Education" },
  { key: "travel", label: "Travel" },
  { key: "retirement", label: "Retirement" },
  { key: "business", label: "Business" },
  { key: "debt_free", label: "Debt Free" },
  { key: "wealth", label: "Wealth Building" },
  { key: "custom", label: "Custom" },
];

export const EMPLOYMENT_TYPES = [
  { key: "employed", label: "Employed", hint: "Regular salary from an employer" },
  { key: "self_employed", label: "Self-employed", hint: "You run your own practice or trade" },
  { key: "freelancer", label: "Freelancer", hint: "Project-based, variable income" },
  { key: "business_owner", label: "Business owner", hint: "Income depends on a business" },
  { key: "student", label: "Student", hint: "Little or irregular income for now" },
  { key: "unemployed", label: "Unemployed", hint: "Currently between income sources" },
  { key: "retired", label: "Retired", hint: "Pension or savings-based income" },
  { key: "other", label: "Other", hint: "Something else entirely" },
];

export const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "SAR", "AED", "Other"];

export type TwinInput = {
  monthlyIncome: number;
  additionalIncome: number;
  expenses: Record<string, number>;
  cashSavings: number;
  emergencySavings: number;
  monthlySavings: number;
  otherLiquid: number;
  accounts: { type: string; balance: number }[];
  assets: { type: string; value: number }[];
  liabilities: { balance: number; monthlyPayment: number; interestRate: number; remainingMonths: number }[];
};

export type Stability = "stable" | "watch" | "fragile";

export type TwinMetrics = {
  income: number;
  expenses: number;
  essential: number;
  flexible: number;
  savings: number;
  savingsRate: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  liquid: number;
  cash: number;
  investments: number;
  otherAssets: number;
  monthlyDebtPayments: number;
  debtToIncome: number;
  emergencyCoverage: number;
  stability: Stability;
  stabilityNote: string;
};

export function sumValues(obj: Record<string, number>) {
  return Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function splitExpenses(expenses: Record<string, number>) {
  let essential = 0;
  let flexible = 0;
  for (const [k, v] of Object.entries(expenses)) {
    const n = Number(v) || 0;
    if (ESSENTIAL_KEYS.has(k)) essential += n;
    else flexible += n;
  }
  return { essential, flexible, total: essential + flexible };
}

export function computeMetrics(t: TwinInput): TwinMetrics {
  const income = (t.monthlyIncome || 0) + (t.additionalIncome || 0);
  const { essential, flexible, total: expenses } = splitExpenses(t.expenses || {});
  const savings = income - expenses;
  const savingsRate = income > 0 ? savings / income : 0;

  const positiveAccounts = t.accounts.filter((a) => a.balance >= 0);
  const negativeAccounts = t.accounts.filter((a) => a.balance < 0);
  const cash = positiveAccounts.filter((a) => a.type !== "investment").reduce((s, a) => s + a.balance, 0);
  const investments =
    positiveAccounts.filter((a) => a.type === "investment").reduce((s, a) => s + a.balance, 0) +
    t.assets.filter((a) => a.type === "investment").reduce((s, a) => s + a.value, 0);
  const otherAssets = t.assets.filter((a) => a.type !== "investment").reduce((s, a) => s + a.value, 0);
  const liquid = cash + investments;
  const totalAssets = liquid + otherAssets;
  const cardDebt = negativeAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);
  const loanDebt = t.liabilities.reduce((s, l) => s + l.balance, 0);
  const totalDebt = cardDebt + loanDebt;
  const netWorth = totalAssets - totalDebt;
  const monthlyDebtPayments =
    t.liabilities.reduce((s, l) => s + l.monthlyPayment, 0) + (cardDebt > 0 ? Math.max(cardDebt * 0.05, 250) : 0);
  const debtToIncome = income > 0 ? monthlyDebtPayments / income : 0;
  const emergencyCoverage = essential > 0 ? (t.emergencySavings || 0) / essential : 0;

  let stability: Stability = "stable";
  let stabilityNote = "Positive cash flow and a usable emergency buffer.";
  if (savings < 0 || emergencyCoverage < 1.5) {
    stability = "fragile";
    stabilityNote = savings < 0 ? "Expenses currently exceed income." : "Emergency buffer covers less than two months.";
  } else if (emergencyCoverage < 3 || savingsRate < 0.1 || debtToIncome > 0.35) {
    stability = "watch";
    stabilityNote =
      emergencyCoverage < 3
        ? "Emergency buffer is under three months."
        : savingsRate < 0.1
          ? "Savings rate is under ten percent."
          : "Debt payments take a large share of income.";
  }

  return {
    income,
    expenses,
    essential,
    flexible,
    savings,
    savingsRate,
    totalAssets,
    totalDebt,
    netWorth,
    liquid,
    cash,
    investments,
    otherAssets,
    monthlyDebtPayments,
    debtToIncome,
    emergencyCoverage,
    stability,
    stabilityNote,
  };
}

export function monthsBetween(from: Date, to: Date) {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

/** Monthly contribution required to reach a target with a given monthly rate. */
export function requiredMonthly(target: number, current: number, months: number, annualReturn: number) {
  if (months <= 0) return Math.max(0, target - current);
  const r = annualReturn / 12;
  if (Math.abs(r) < 1e-9) return Math.max(0, (target - current) / months);
  const fvCurrent = current * Math.pow(1 + r, months);
  const annuity = (Math.pow(1 + r, months) - 1) / r;
  return Math.max(0, (target - fvCurrent) / annuity);
}

/** Deterministic future value of a goal fund. */
export function goalFutureValue(current: number, contribution: number, months: number, annualReturn: number) {
  const r = annualReturn / 12;
  if (Math.abs(r) < 1e-9) return current + contribution * months;
  return current * Math.pow(1 + r, months) + contribution * ((Math.pow(1 + r, months) - 1) / r);
}

export function goalStatus(progress: number, probability: number | null): "on_track" | "attention" | "at_risk" | "reached" {
  if (progress >= 1) return "reached";
  if (probability === null) return progress > 0.5 ? "on_track" : "attention";
  if (probability >= 0.65) return "on_track";
  if (probability >= 0.4) return "attention";
  return "at_risk";
}

export const HEALTH_DIMENSIONS = [
  "cash_flow",
  "emergency",
  "debt",
  "savings_rate",
  "goals",
  "net_worth_trend",
] as const;
