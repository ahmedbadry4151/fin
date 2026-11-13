import type { TwinInput } from "./finance";
import { buildSimTwin } from "./twin";
import type { SimTwin } from "./simulation";

/**
 * Single source of truth for the synthetic demo Financial Twin (Nour Adel).
 * The in-memory store seeds its rows from these numbers, and the marketing
 * pages simulate the same model in the browser — one definition, no drift.
 */

export const DEMO_EXPENSES: Record<string, number> = {
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

export const DEMO_PROFILE_NUMBERS = {
  monthlyIncome: 32000,
  additionalIncome: 0,
  incomeFrequency: "monthly",
  cashSavings: 48200,
  emergencySavings: 88560,
  monthlySavings: 10600,
  otherLiquid: 0,
};

export const DEMO_ACCOUNTS = [
  { name: "Main Bank", type: "bank", balance: 48200, institution: "CIB" },
  { name: "Savings", type: "savings", balance: 120000, institution: "CIB" },
  { name: "Investments", type: "investment", balance: 95000, institution: "Thndr" },
  { name: "Credit Card", type: "credit", balance: -8500, institution: "CIB" },
];

export const DEMO_ASSETS = [
  { name: "Car", type: "vehicle", value: 185000 },
  { name: "Gold", type: "other", value: 30000 },
];

export const DEMO_LIABILITIES = [
  { name: "Car loan", type: "car_loan", balance: 41200, monthlyPayment: 1250, interestRate: 0.12, remainingMonths: 38 },
];

export const DEMO_GOAL = {
  name: "Buy a Home",
  type: "home",
  targetAmount: 1500000,
  currentAmount: 126000,
  monthlyContribution: 8500,
};

/** Target date of the primary demo goal: January 1st, eight years from now. */
export function demoGoalTargetDate(from = new Date()): string {
  return `${from.getFullYear() + 8}-01-01`;
}

/** The demo Twin in the shape the finance metrics and simulation engine consume. */
export const DEMO_TWIN_INPUT: TwinInput = {
  monthlyIncome: DEMO_PROFILE_NUMBERS.monthlyIncome,
  additionalIncome: DEMO_PROFILE_NUMBERS.additionalIncome,
  expenses: DEMO_EXPENSES,
  cashSavings: DEMO_PROFILE_NUMBERS.cashSavings,
  emergencySavings: DEMO_PROFILE_NUMBERS.emergencySavings,
  monthlySavings: DEMO_PROFILE_NUMBERS.monthlySavings,
  otherLiquid: DEMO_PROFILE_NUMBERS.otherLiquid,
  accounts: DEMO_ACCOUNTS.map((a) => ({ type: a.type, balance: a.balance })),
  assets: DEMO_ASSETS.map((a) => ({ type: a.type, value: a.value })),
  liabilities: DEMO_LIABILITIES.map((l) => ({
    balance: l.balance,
    monthlyPayment: l.monthlyPayment,
    interestRate: l.interestRate,
    remainingMonths: l.remainingMonths,
  })),
};

/** The primary demo goal as a simulation-ready goal, measured from today. */
export function demoGoal(from = new Date()) {
  return {
    id: 0,
    name: DEMO_GOAL.name,
    targetAmount: DEMO_GOAL.targetAmount,
    currentAmount: DEMO_GOAL.currentAmount,
    targetDate: demoGoalTargetDate(from),
    monthlyContribution: DEMO_GOAL.monthlyContribution,
  };
}

/** Simulation-ready demo twin (same shape the stored dashboard simulation uses). */
export function demoSimTwin(from = new Date()): SimTwin {
  return buildSimTwin(DEMO_TWIN_INPUT, demoGoal(from));
}
