import type { ScenarioParams } from "./simulation";

export type ScenarioCategory = "career" | "life" | "housing" | "transportation" | "economic" | "savings" | "custom";

export type ScenarioTemplate = {
  key: string;
  name: string;
  category: ScenarioCategory;
  description: string;
  icon: string;
  params: ScenarioParams;
};

export const SCENARIO_CATEGORIES: { key: ScenarioCategory; label: string; blurb: string }[] = [
  { key: "career", label: "Career", blurb: "Income changes, interruptions, and new work." },
  { key: "life", label: "Life", blurb: "Milestones that reshape monthly spending." },
  { key: "housing", label: "Housing", blurb: "Buying, renting, and relocating." },
  { key: "transportation", label: "Transportation", blurb: "Vehicles and the cost of getting around." },
  { key: "economic", label: "Economic", blurb: "Macro conditions you don't control." },
  { key: "savings", label: "Savings", blurb: "Behavioural changes to how you save." },
  { key: "custom", label: "Custom", blurb: "Model anything else." },
];

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    key: "lose-job",
    name: "Lose My Job",
    category: "career",
    icon: "Briefcase",
    description: "Salary stops for six months while essential expenses continue.",
    params: { incomeChangePct: -100, incomeStartMonth: 1, incomeDurationMonths: 6 },
  },
  {
    key: "get-raise",
    name: "Get a Raise",
    category: "career",
    icon: "TrendingUp",
    description: "A permanent 15% income increase starting in three months.",
    params: { incomeChangePct: 15, incomeStartMonth: 3, incomeDurationMonths: null },
  },
  {
    key: "change-career",
    name: "Change Career",
    category: "career",
    icon: "Compass",
    description: "Income dips 25% for 18 months plus a retraining cost.",
    params: { incomeChangePct: -25, incomeStartMonth: 1, incomeDurationMonths: 18, oneTimeCost: 20000, oneTimeCostMonth: 1 },
  },
  {
    key: "freelance",
    name: "Start Freelancing",
    category: "career",
    icon: "Laptop",
    description: "Salary drops 40% for nine months while freelance income ramps up.",
    params: {
      incomeChangePct: -40,
      incomeStartMonth: 1,
      incomeDurationMonths: 9,
      extraMonthlyIncome: 9000,
      extraIncomeStartMonth: 4,
      extraIncomeDurationMonths: null,
      assumptions: { volatility: 0.18 },
    },
  },
  {
    key: "start-business",
    name: "Start a Business",
    category: "career",
    icon: "Rocket",
    description: "Invest EGP 150k, halve income for a year, then earn business income.",
    params: {
      oneTimeCost: 150000,
      oneTimeCostMonth: 2,
      incomeChangePct: -50,
      incomeStartMonth: 1,
      incomeDurationMonths: 12,
      extraMonthlyIncome: 15000,
      extraIncomeStartMonth: 13,
      extraIncomeDurationMonths: null,
    },
  },
  {
    key: "get-married",
    name: "Get Married",
    category: "life",
    icon: "Heart",
    description: "A one-time celebration cost and higher household spending.",
    params: { oneTimeCost: 250000, oneTimeCostMonth: 6, extraMonthlyExpense: 4000, extraExpenseStartMonth: 7, extraExpenseDurationMonths: null },
  },
  {
    key: "have-child",
    name: "Have a Child",
    category: "life",
    icon: "Baby",
    description: "Ongoing childcare costs beginning in nine months.",
    params: { extraMonthlyExpense: 5500, extraExpenseStartMonth: 9, extraExpenseDurationMonths: null, oneTimeCost: 40000, oneTimeCostMonth: 9 },
  },
  {
    key: "move",
    name: "Move to a New City",
    category: "life",
    icon: "MapPin",
    description: "Relocation cost plus a 12% rise in living expenses.",
    params: { oneTimeCost: 35000, oneTimeCostMonth: 2, expenseChangePct: 12, expenseStartMonth: 2, expenseDurationMonths: null },
  },
  {
    key: "major-life-event",
    name: "Major Life Event",
    category: "life",
    icon: "Sparkles",
    description: "An unexpected EGP 80k expense next month.",
    params: { oneTimeCost: 80000, oneTimeCostMonth: 1 },
  },
  {
    key: "buy-home",
    name: "Buy a Home",
    category: "housing",
    icon: "Home",
    description: "Buy a EGP 1.5M home in two years with 20% down and a 15-year loan.",
    params: {
      purchase: { label: "Home", price: 1500000, downPaymentPct: 0.2, month: 24, loanRate: 0.18, loanYears: 15, appreciation: 0.09 },
      extraMonthlyExpense: -7500,
      extraExpenseStartMonth: 24,
      extraExpenseDurationMonths: null,
    },
  },
  {
    key: "rent-increase",
    name: "Rent Increase",
    category: "housing",
    icon: "Building2",
    description: "Rent rises by EGP 1,500 per month from month six.",
    params: { extraMonthlyExpense: 1500, extraExpenseStartMonth: 6, extraExpenseDurationMonths: null },
  },
  {
    key: "mortgage",
    name: "Take a Mortgage",
    category: "housing",
    icon: "Landmark",
    description: "A smaller home now with 15% down and a 20-year loan.",
    params: {
      purchase: { label: "Apartment", price: 1100000, downPaymentPct: 0.15, month: 6, loanRate: 0.17, loanYears: 20, appreciation: 0.08 },
      extraMonthlyExpense: -7500,
      extraExpenseStartMonth: 6,
      extraExpenseDurationMonths: null,
    },
  },
  {
    key: "relocate",
    name: "Relocate Abroad",
    category: "housing",
    icon: "Plane",
    description: "Relocation cost, then 30% higher income and 25% higher expenses.",
    params: {
      oneTimeCost: 60000,
      oneTimeCostMonth: 3,
      incomeChangePct: 30,
      incomeStartMonth: 4,
      incomeDurationMonths: null,
      expenseChangePct: 25,
      expenseStartMonth: 4,
      expenseDurationMonths: null,
    },
  },
  {
    key: "buy-car",
    name: "Buy a Car",
    category: "transportation",
    icon: "Car",
    description: "EGP 450k car in six months, 30% down, five-year loan.",
    params: { purchase: { label: "Car", price: 450000, downPaymentPct: 0.3, month: 6, loanRate: 0.16, loanYears: 5, appreciation: -0.12 } },
  },
  {
    key: "replace-car",
    name: "Replace Car",
    category: "transportation",
    icon: "RefreshCw",
    description: "Sell the current car for EGP 150k and buy a newer one.",
    params: {
      oneTimeIncome: 150000,
      oneTimeIncomeMonth: 3,
      purchase: { label: "Replacement car", price: 420000, downPaymentPct: 0.5, month: 3, loanRate: 0.16, loanYears: 4, appreciation: -0.12 },
    },
  },
  {
    key: "transport-cost",
    name: "Transport Cost Increase",
    category: "transportation",
    icon: "Fuel",
    description: "Fuel and transit costs rise by EGP 900 per month.",
    params: { extraMonthlyExpense: 900, extraExpenseStartMonth: 1, extraExpenseDurationMonths: null },
  },
  {
    key: "high-inflation",
    name: "High Inflation",
    category: "economic",
    icon: "Flame",
    description: "Prices grow 22% a year while income grows only 10%.",
    params: { assumptions: { inflation: 0.25, expenseGrowth: 0.22, incomeGrowth: 0.1 } },
  },
  {
    key: "recession",
    name: "Recession",
    category: "economic",
    icon: "CloudRain",
    description: "Returns fall, volatility rises, income shrinks 10% for two years.",
    params: { assumptions: { investmentReturn: 0.03, volatility: 0.22, incomeGrowth: 0.03 }, incomeChangePct: -10, incomeStartMonth: 1, incomeDurationMonths: 24 },
  },
  {
    key: "lower-returns",
    name: "Lower Returns",
    category: "economic",
    icon: "TrendingDown",
    description: "Investment returns average 6% instead of the current assumption.",
    params: { assumptions: { investmentReturn: 0.06 } },
  },
  {
    key: "lower-income-growth",
    name: "Lower Income Growth",
    category: "economic",
    icon: "Minus",
    description: "Income growth slows to 3% a year.",
    params: { assumptions: { incomeGrowth: 0.03 } },
  },
  {
    key: "save-more",
    name: "Save 15% More",
    category: "savings",
    icon: "PiggyBank",
    description: "Redirect 15% more of your surplus into savings every month.",
    params: { savingsChangePct: 15 },
  },
  {
    key: "spend-less",
    name: "Spend 10% Less",
    category: "savings",
    icon: "Scissors",
    description: "Reduce total monthly expenses by 10%.",
    params: { expenseChangePct: -10, expenseStartMonth: 1, expenseDurationMonths: null },
  },
  {
    key: "accelerate-goal",
    name: "Accelerate Goal",
    category: "savings",
    icon: "FastForward",
    description: "Increase goal contributions by 30%.",
    params: { savingsChangePct: 30 },
  },
  {
    key: "delay-goal",
    name: "Delay Goal",
    category: "savings",
    icon: "Clock",
    description: "Push the goal date two years later.",
    params: { goalDelayMonths: 24 },
  },
  {
    key: "custom",
    name: "Custom Scenario",
    category: "custom",
    icon: "SlidersHorizontal",
    description: "Start from a blank model and define every change yourself.",
    params: {},
  },
];

export function templateByKey(key: string | null | undefined) {
  return SCENARIO_TEMPLATES.find((t) => t.key === key) ?? null;
}

export function describeParams(p: ScenarioParams, currency = "EGP"): string[] {
  const out: string[] = [];
  const money = (n: number) => `${currency} ${Math.round(n).toLocaleString("en-US")}`;
  const dur = (d: number | null | undefined) => (d === null || d === undefined ? "permanently" : `for ${d} months`);
  if (p.incomeChangePct) out.push(`Income ${p.incomeChangePct > 0 ? "+" : ""}${p.incomeChangePct}% from month ${p.incomeStartMonth ?? 1} ${dur(p.incomeDurationMonths)}`);
  if (p.expenseChangePct) out.push(`Expenses ${p.expenseChangePct > 0 ? "+" : ""}${p.expenseChangePct}% from month ${p.expenseStartMonth ?? 1} ${dur(p.expenseDurationMonths)}`);
  if (p.extraMonthlyExpense) out.push(`${p.extraMonthlyExpense > 0 ? "+" : "−"}${money(Math.abs(p.extraMonthlyExpense))}/month from month ${p.extraExpenseStartMonth ?? 1}`);
  if (p.extraMonthlyIncome) out.push(`+${money(p.extraMonthlyIncome)}/month income from month ${p.extraIncomeStartMonth ?? 1}`);
  if (p.oneTimeCost) out.push(`One-time cost ${money(p.oneTimeCost)} in month ${p.oneTimeCostMonth ?? 1}`);
  if (p.oneTimeIncome) out.push(`One-time inflow ${money(p.oneTimeIncome)} in month ${p.oneTimeIncomeMonth ?? 1}`);
  if (p.savingsChangePct) out.push(`Savings ${p.savingsChangePct > 0 ? "+" : ""}${p.savingsChangePct}%`);
  if (p.goalDelayMonths) out.push(`Goal delayed ${p.goalDelayMonths} months`);
  if (p.purchase) out.push(`Buy ${p.purchase.label ?? "asset"} ${money(p.purchase.price)} in month ${p.purchase.month}, ${Math.round(p.purchase.downPaymentPct * 100)}% down`);
  if (p.assumptions) {
    const a = p.assumptions;
    const parts: string[] = [];
    if (a.inflation !== undefined) parts.push(`inflation ${(a.inflation * 100).toFixed(0)}%`);
    if (a.incomeGrowth !== undefined) parts.push(`income growth ${(a.incomeGrowth * 100).toFixed(0)}%`);
    if (a.expenseGrowth !== undefined) parts.push(`expense growth ${(a.expenseGrowth * 100).toFixed(0)}%`);
    if (a.investmentReturn !== undefined) parts.push(`return ${(a.investmentReturn * 100).toFixed(0)}%`);
    if (a.volatility !== undefined) parts.push(`volatility ${(a.volatility * 100).toFixed(0)}%`);
    if (parts.length) out.push(`Assumptions: ${parts.join(", ")}`);
  }
  if (out.length === 0) out.push("No changes — this is your current plan.");
  return out;
}

/** Very small natural-language parser for the AI scenario builder. */
export function parseScenarioText(text: string): { params: ScenarioParams; notes: string[]; name: string } {
  const t = text.toLowerCase();
  const params: ScenarioParams = {};
  const notes: string[] = [];
  const num = (re: RegExp) => {
    const m = t.match(re);
    return m ? Number(m[1].replace(/,/g, "")) : null;
  };
  const months = (() => {
    const m = t.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(month|months|year|years)/);
    if (!m) return null;
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
    const n = words[m[1]] ?? Number(m[1]);
    return m[2].startsWith("year") ? n * 12 : n;
  })();

  let name = "Custom scenario";
  if (/(lose|lost|losing|quit|leave).*(job|income|work)|unemploy|laid off|fired/.test(t)) {
    params.incomeChangePct = -100;
    params.incomeStartMonth = 1;
    params.incomeDurationMonths = months ?? 6;
    notes.push(`Income stops for ${params.incomeDurationMonths} months.`);
    name = `Lose income for ${params.incomeDurationMonths} months`;
  }
  const raise = num(/(\d+)\s*%\s*(raise|increase in income|more income|salary increase)/) ?? (/(raise|promotion)/.test(t) ? num(/(\d+)\s*%/) : null);
  if (raise !== null && raise > 0 && !params.incomeChangePct) {
    params.incomeChangePct = raise;
    params.incomeStartMonth = 1;
    params.incomeDurationMonths = null;
    notes.push(`Income rises ${raise}% permanently.`);
    name = `Get a ${raise}% raise`;
  }
  const save = num(/save\s*(\d+)\s*%/) ?? num(/(\d+)\s*%\s*more/);
  if (save !== null && /sav/.test(t)) {
    params.savingsChangePct = save;
    notes.push(`Monthly savings increase by ${save}%.`);
    name = `Save ${save}% more`;
  }
  const spend = num(/(cut|reduce|spend)\s*(?:expenses|spending)?\s*(?:by\s*)?(\d+)\s*%/);
  if (spend !== null) {
    params.expenseChangePct = -Math.abs(spend);
    params.expenseStartMonth = 1;
    params.expenseDurationMonths = null;
    notes.push(`Expenses fall ${spend}%.`);
    name = `Spend ${spend}% less`;
  }
  const cost = num(/(?:cost|spend|pay|buy|wedding|expense)[^\d]{0,30}(\d[\d,]{3,})/);
  if (cost !== null && !/home|house|apartment|car/.test(t)) {
    params.oneTimeCost = cost;
    params.oneTimeCostMonth = 1;
    notes.push(`One-time cost of ${cost.toLocaleString("en-US")}.`);
    if (name === "Custom scenario") name = "One-time expense";
  }
  if (/home|house|apartment/.test(t) && /buy|purchase|mortgage/.test(t)) {
    const price = num(/(\d[\d,]{5,})/) ?? 1500000;
    params.purchase = { label: "Home", price, downPaymentPct: 0.2, month: months ?? 24, loanRate: 0.18, loanYears: 15, appreciation: 0.09 };
    params.extraMonthlyExpense = -7500;
    params.extraExpenseStartMonth = params.purchase.month;
    params.extraExpenseDurationMonths = null;
    notes.push(`Buy a home for ${price.toLocaleString("en-US")} in month ${params.purchase.month} with 20% down.`);
    name = "Buy a home";
  }
  if (/\bcar\b/.test(t) && /buy|purchase/.test(t)) {
    const price = num(/(\d[\d,]{5,})/) ?? 450000;
    params.purchase = { label: "Car", price, downPaymentPct: 0.3, month: months ?? 6, loanRate: 0.16, loanYears: 5, appreciation: -0.12 };
    notes.push(`Buy a car for ${price.toLocaleString("en-US")} in month ${params.purchase.month}.`);
    name = "Buy a car";
  }
  if (/child|baby|kid/.test(t)) {
    params.extraMonthlyExpense = 5500;
    params.extraExpenseStartMonth = months ?? 9;
    params.extraExpenseDurationMonths = null;
    notes.push("Childcare adds 5,500 per month.");
    name = "Have a child";
  }
  if (/inflation/.test(t)) {
    const pct = num(/inflation[^\d]{0,20}(\d+)\s*%/) ?? 25;
    params.assumptions = { ...(params.assumptions ?? {}), inflation: pct / 100, expenseGrowth: Math.max(0.05, pct / 100 - 0.03) };
    notes.push(`Inflation assumption set to ${pct}%.`);
    if (name === "Custom scenario") name = `${pct}% inflation`;
  }
  if (/recession|downturn|crash/.test(t)) {
    params.assumptions = { ...(params.assumptions ?? {}), investmentReturn: 0.03, volatility: 0.22, incomeGrowth: 0.03 };
    notes.push("Recession assumptions: 3% returns, 22% volatility, 3% income growth.");
    if (name === "Custom scenario") name = "Recession";
  }
  if (/keep.*expenses|same expenses|expenses (stay|remain)/.test(t)) notes.push("Expenses are kept at their current level.");
  if (notes.length === 0) notes.push("No specific changes detected — adjust the parameters below.");
  return { params, notes, name };
}
