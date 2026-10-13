import { computeMetrics, monthsBetween, type TwinInput } from "./finance";
import type { SimGoal, SimTwin } from "./simulation";

export type GoalLike = {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
};

export function toSimGoal(g: GoalLike): SimGoal {
  const target = new Date(g.targetDate.length === 10 ? g.targetDate + "T00:00:00" : g.targetDate);
  return {
    id: g.id,
    name: g.name,
    target: g.targetAmount,
    current: g.currentAmount,
    contribution: g.monthlyContribution,
    months: Math.max(1, monthsBetween(new Date(), target)),
  };
}

const ASSET_GROWTH: Record<string, number> = {
  property: 0.09,
  vehicle: -0.12,
  business: 0.06,
  cash: 0,
  bank: 0,
  other: 0.04,
};

/** Convert the stored Financial Twin into the simulation engine's input shape. */
export function buildSimTwin(input: TwinInput, goal?: GoalLike | null): SimTwin {
  const m = computeMetrics(input);
  const debtCategory = Number(input.expenses.debt ?? 0);
  const liabilities = [
    ...input.liabilities.map((l) => ({ balance: l.balance, payment: l.monthlyPayment, rate: l.interestRate })),
    ...input.accounts
      .filter((a) => a.balance < 0)
      .map((a) => ({ balance: -a.balance, payment: Math.max(-a.balance * 0.05, 250), rate: 0.24 })),
  ];
  const assets = input.assets
    .filter((a) => a.type !== "investment")
    .map((a) => ({ value: a.value, growth: ASSET_GROWTH[a.type] ?? 0.04 }));
  return {
    monthlyIncome: m.income,
    monthlyExpenses: Math.max(0, m.expenses - debtCategory),
    essentialExpenses: Math.max(0, m.essential - debtCategory),
    cash: m.cash,
    investments: m.investments,
    emergencySavings: input.emergencySavings,
    assets,
    liabilities,
    goal: goal ? toSimGoal(goal) : null,
  };
}
