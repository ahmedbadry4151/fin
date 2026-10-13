import type { EconAssumptions } from "./simulation";

export type AssumptionKey = keyof EconAssumptions;

export type AssumptionDef = {
  key: AssumptionKey;
  label: string;
  unit: "%" | "years";
  short: string;
  why: string;
  historical: string;
  modelUse: string;
  impact: string;
  min: number;
  max: number;
  step: number;
};

export const ASSUMPTION_DEFS: AssumptionDef[] = [
  {
    key: "inflation",
    label: "Inflation",
    unit: "%",
    short: "How fast general prices rise each year.",
    why: "Inflation erodes the purchasing power of cash and raises the future cost of goals like a home or a car.",
    historical: "Egypt's headline inflation averaged roughly 13% a year over the last decade and exceeded 30% in 2023 before easing.",
    modelUse: "Scales one-time scenario costs and the future value of real assets such as property.",
    impact: "Higher inflation widens the gap between nominal and real outcomes; a goal priced today becomes more expensive later.",
    min: 0,
    max: 0.4,
    step: 0.005,
  },
  {
    key: "incomeGrowth",
    label: "Income growth",
    unit: "%",
    short: "Expected yearly growth of your income.",
    why: "Over long horizons income growth is one of the strongest drivers of how much you can save.",
    historical: "Nominal wage growth in Egypt has typically trailed inflation in high-inflation years and caught up in calmer periods.",
    modelUse: "Each simulated path samples a growth rate around this value and compounds income monthly.",
    impact: "A 2-point change in income growth typically changes 10-year net worth by more than a 2-point change in returns.",
    min: 0,
    max: 0.3,
    step: 0.005,
  },
  {
    key: "expenseGrowth",
    label: "Expense growth",
    unit: "%",
    short: "How fast your own spending rises each year.",
    why: "Your personal inflation can differ from the headline number depending on what you buy.",
    historical: "Household expenses for rent, food and transport have historically grown faster than headline CPI in urban Egypt.",
    modelUse: "Compounds monthly expenses on every path with small random variation.",
    impact: "When expense growth exceeds income growth, the savings rate shrinks every year.",
    min: 0,
    max: 0.35,
    step: 0.005,
  },
  {
    key: "investmentReturn",
    label: "Investment return",
    unit: "%",
    short: "Average yearly return on invested assets.",
    why: "Returns compound; small changes matter a lot over ten years.",
    historical: "Certificates of deposit and money-market funds have offered double-digit nominal yields in Egypt; equity returns vary widely.",
    modelUse: "Monthly returns are drawn from a normal distribution with this mean and the volatility below.",
    impact: "Determines the slope of the median path and the upside percentiles.",
    min: -0.05,
    max: 0.3,
    step: 0.005,
  },
  {
    key: "volatility",
    label: "Volatility",
    unit: "%",
    short: "How much returns swing from year to year.",
    why: "Volatility is what turns a single line into a range of futures.",
    historical: "Diversified portfolios typically show 10–20% annual volatility; single markets can exceed 30%.",
    modelUse: "Standard deviation of annual returns used to generate the uncertainty band.",
    impact: "Higher volatility widens the gap between the 5th and 95th percentiles without moving the median much.",
    min: 0,
    max: 0.5,
    step: 0.01,
  },
  {
    key: "horizonYears",
    label: "Simulation horizon",
    unit: "years",
    short: "How many years each simulation looks ahead.",
    why: "Longer horizons reveal compounding but carry more uncertainty.",
    historical: "Most planning decisions resolve within five to fifteen years.",
    modelUse: "Number of monthly steps per path.",
    impact: "Longer horizons widen the final distribution and increase goal probability for distant goals.",
    min: 1,
    max: 30,
    step: 1,
  },
];

export function assumptionDef(key: string) {
  return ASSUMPTION_DEFS.find((d) => d.key === key) ?? null;
}

export type EconomicPreset = {
  key: string;
  name: string;
  description: string;
  values: Omit<EconAssumptions, "horizonYears">;
};

export const ECONOMIC_PRESETS: EconomicPreset[] = [
  {
    key: "normal",
    name: "Normal",
    description: "A calm baseline close to recent long-run averages.",
    values: { inflation: 0.12, incomeGrowth: 0.08, expenseGrowth: 0.1, investmentReturn: 0.11, volatility: 0.14 },
  },
  {
    key: "high-inflation",
    name: "High Inflation",
    description: "Prices and expenses rise sharply while income lags.",
    values: { inflation: 0.25, incomeGrowth: 0.12, expenseGrowth: 0.22, investmentReturn: 0.13, volatility: 0.18 },
  },
  {
    key: "recession",
    name: "Recession",
    description: "Weak income growth, low returns and high volatility.",
    values: { inflation: 0.08, incomeGrowth: 0.02, expenseGrowth: 0.07, investmentReturn: 0.03, volatility: 0.24 },
  },
  {
    key: "low-growth",
    name: "Low Growth",
    description: "A slow economy with modest returns and raises.",
    values: { inflation: 0.09, incomeGrowth: 0.04, expenseGrowth: 0.08, investmentReturn: 0.06, volatility: 0.12 },
  },
  {
    key: "strong-growth",
    name: "Strong Growth",
    description: "Faster raises and stronger returns, with more swings.",
    values: { inflation: 0.1, incomeGrowth: 0.12, expenseGrowth: 0.09, investmentReturn: 0.15, volatility: 0.16 },
  },
];

export function presetByKey(key: string) {
  return ECONOMIC_PRESETS.find((p) => p.key === key) ?? null;
}

export const PLANNING_STYLES = [
  { key: "cautious", label: "More cautious assumptions", hint: "Lower returns and income growth, higher expense growth." },
  { key: "balanced", label: "Balanced", hint: "Use the assumptions as entered." },
  { key: "growth", label: "More growth-oriented", hint: "Slightly higher returns and income growth." },
  { key: "wide", label: "Show a wide range of outcomes", hint: "Same averages, much higher volatility." },
];

export function applyPlanningStyle(a: EconAssumptions, style: string): EconAssumptions {
  switch (style) {
    case "cautious":
      return { ...a, investmentReturn: a.investmentReturn - 0.02, incomeGrowth: a.incomeGrowth - 0.02, expenseGrowth: a.expenseGrowth + 0.01 };
    case "growth":
      return { ...a, investmentReturn: a.investmentReturn + 0.02, incomeGrowth: a.incomeGrowth + 0.01 };
    case "wide":
      return { ...a, volatility: a.volatility + 0.08 };
    default:
      return a;
  }
}

export const DEFAULT_ASSUMPTIONS: EconAssumptions = { ...ECONOMIC_PRESETS[0].values, horizonYears: 10 };
