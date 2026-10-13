/**
 * FinTwin Monte Carlo engine.
 * Pure TypeScript — runs on the server for stored simulations and in the
 * browser for live previews (scenario builder, goal planner, sensitivity).
 */

export type EconAssumptions = {
  inflation: number;
  incomeGrowth: number;
  expenseGrowth: number;
  investmentReturn: number;
  volatility: number;
  horizonYears: number;
};

export type Purchase = {
  label?: string;
  price: number;
  downPaymentPct: number;
  month: number;
  loanRate: number;
  loanYears: number;
  appreciation: number;
};

export type ScenarioParams = {
  incomeChangePct?: number;
  incomeStartMonth?: number;
  incomeDurationMonths?: number | null;
  expenseChangePct?: number;
  expenseStartMonth?: number;
  expenseDurationMonths?: number | null;
  extraMonthlyExpense?: number;
  extraExpenseStartMonth?: number;
  extraExpenseDurationMonths?: number | null;
  extraMonthlyIncome?: number;
  extraIncomeStartMonth?: number;
  extraIncomeDurationMonths?: number | null;
  oneTimeCost?: number;
  oneTimeCostMonth?: number;
  oneTimeIncome?: number;
  oneTimeIncomeMonth?: number;
  savingsChangePct?: number;
  goalDelayMonths?: number;
  purchase?: Purchase | null;
  assumptions?: Partial<EconAssumptions>;
};

export type SimGoal = {
  id: number;
  name: string;
  target: number;
  current: number;
  contribution: number;
  months: number;
};

export type SimTwin = {
  monthlyIncome: number;
  monthlyExpenses: number; // excludes debt payments
  essentialExpenses: number;
  cash: number;
  investments: number;
  emergencySavings: number;
  assets: { value: number; growth: number }[];
  liabilities: { balance: number; payment: number; rate: number }[];
  goal?: SimGoal | null;
};

export type Percentiles = {
  p5: number[];
  p15: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p85: number[];
  p95: number[];
  mean: number[];
};

export type SensitivityRow = {
  key: string;
  label: string;
  low: number;
  high: number;
  base: number;
  impact: number;
  shift: string;
};

export type SimResults = {
  months: number;
  paths: number;
  seed: number;
  series: Percentiles;
  final: { p5: number; p15: number; p25: number; p50: number; p75: number; p85: number; p95: number; mean: number; min: number; max: number };
  histogram: { from: number; to: number; count: number }[];
  goal: { id: number; name: string; target: number; month: number; probability: number; medianFund: number; p10Fund: number; p90Fund: number } | null;
  risk: {
    shortfallProbability: number;
    medianShortfall: number;
    emergencySurvivalMonths: number;
    emergencyNeverDepleted: number;
    minLiquidP10: number;
    level: "low" | "moderate" | "elevated" | "high";
    drivers: { label: string; weight: number; note: string }[];
  };
  cashFlow: { month1: number; month12Median: number; month12P10: number; month12P90: number };
  baseline: { finalP50: number; p50: number[]; goalProbability: number | null; shortfallProbability: number; cashFlow12: number } | null;
  sensitivity: SensitivityRow[];
  assumptions: EconAssumptions;
  params: ScenarioParams;
};

export type SimOptions = {
  paths: number;
  seed?: number;
  sensitivity?: boolean;
  baseline?: boolean;
};

/* ------------------------------------------------------------------ */
/* Random helpers                                                      */
/* ------------------------------------------------------------------ */

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGaussian(rng: () => number) {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    spare = mag * Math.sin(2.0 * Math.PI * v);
    return mag * Math.cos(2.0 * Math.PI * v);
  };
}

function quantile(sorted: Float64Array | number[], q: number) {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? sorted[base] + rest * (next - sorted[base]) : sorted[base];
}

function active(start: number | undefined, duration: number | null | undefined, m: number) {
  const s = start ?? 1;
  if (m < s) return false;
  if (duration === null || duration === undefined) return true;
  return m < s + duration;
}

/* ------------------------------------------------------------------ */
/* Core path engine                                                    */
/* ------------------------------------------------------------------ */

type PathStats = {
  nw: Float64Array[]; // [month][path]
  finals: Float64Array;
  goalFund: Float64Array;
  shortfall: Uint8Array;
  shortfallAmt: Float64Array;
  minLiquid: Float64Array;
  cf12: Float64Array;
  cf1: number;
};

function runPaths(twin: SimTwin, a: EconAssumptions, params: ScenarioParams, paths: number, seed: number): PathStats {
  const months = Math.max(12, Math.round(a.horizonYears * 12));
  const rng = mulberry32(seed);
  const gauss = makeGaussian(rng);
  const nw: Float64Array[] = Array.from({ length: months + 1 }, () => new Float64Array(paths));
  const finals = new Float64Array(paths);
  const goalFund = new Float64Array(paths);
  const shortfall = new Uint8Array(paths);
  const shortfallAmt = new Float64Array(paths);
  const minLiquid = new Float64Array(paths);
  const cf12 = new Float64Array(paths);
  let cf1 = 0;

  const baseSavings = twin.monthlyIncome - twin.monthlyExpenses - twin.liabilities.reduce((s, l) => s + l.payment, 0);
  const savingsAdj = ((params.savingsChangePct ?? 0) / 100) * Math.max(baseSavings, twin.monthlyIncome * 0.1);
  const goal = twin.goal ?? null;
  const goalMonths = goal ? goal.months + (params.goalDelayMonths ?? 0) : 0;
  const goalContribution = goal ? goal.contribution * (1 + (params.savingsChangePct ?? 0) / 100) : 0;
  const purchase = params.purchase ?? null;

  for (let p = 0; p < paths; p++) {
    let cash = twin.cash;
    let inv = twin.investments;
    const assets = twin.assets.map((x) => ({ ...x }));
    const liabs = twin.liabilities.map((l) => ({ ...l }));
    let fund = goal ? goal.current : 0;
    let hadShortfall = false;
    let minLiq = cash + inv;
    const incomeGrowthP = a.incomeGrowth + gauss() * 0.015;
    const expenseGrowthP = a.expenseGrowth + gauss() * 0.02;

    const startNw = cash + inv + assets.reduce((s, x) => s + x.value, 0) - liabs.reduce((s, l) => s + l.balance, 0);
    nw[0][p] = startNw;

    for (let m = 1; m <= months; m++) {
      const t = m / 12;
      let income = twin.monthlyIncome * Math.pow(1 + incomeGrowthP, t);
      if (params.incomeChangePct && active(params.incomeStartMonth, params.incomeDurationMonths, m)) {
        income *= 1 + params.incomeChangePct / 100;
      }
      if (params.extraMonthlyIncome && active(params.extraIncomeStartMonth, params.extraIncomeDurationMonths, m)) {
        income += params.extraMonthlyIncome * Math.pow(1 + expenseGrowthP, t);
      }
      if (params.oneTimeIncome && m === (params.oneTimeIncomeMonth ?? 1)) income += params.oneTimeIncome;

      let expenses = (twin.monthlyExpenses - savingsAdj) * Math.pow(1 + expenseGrowthP, t) * (1 + gauss() * 0.04);
      if (params.expenseChangePct && active(params.expenseStartMonth, params.expenseDurationMonths, m)) {
        expenses *= 1 + params.expenseChangePct / 100;
      }
      if (params.extraMonthlyExpense && active(params.extraExpenseStartMonth, params.extraExpenseDurationMonths, m)) {
        expenses += params.extraMonthlyExpense * Math.pow(1 + expenseGrowthP, t);
      }
      if (params.oneTimeCost && m === (params.oneTimeCostMonth ?? 1)) expenses += params.oneTimeCost;

      let debtPay = 0;
      for (const l of liabs) {
        if (l.balance <= 0) continue;
        const interest = (l.balance * l.rate) / 12;
        const pay = Math.min(l.payment, l.balance + interest);
        l.balance = l.balance + interest - pay;
        debtPay += pay;
      }

      if (purchase && m === purchase.month) {
        const down = purchase.price * purchase.downPaymentPct;
        cash -= down;
        if (cash < 0) {
          inv += cash;
          cash = 0;
        }
        assets.push({ value: purchase.price, growth: purchase.appreciation });
        const principal = purchase.price - down;
        if (principal > 0) {
          const r = purchase.loanRate / 12;
          const n = Math.max(12, purchase.loanYears * 12);
          const pmt = r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n;
          liabs.push({ balance: principal, payment: pmt, rate: purchase.loanRate });
        }
      }

      const r = a.investmentReturn / 12 + (a.volatility / Math.sqrt(12)) * gauss();
      inv *= 1 + r;
      for (const x of assets) x.value *= 1 + x.growth / 12;

      const net = income - expenses - debtPay;
      if (m === 1 && p === 0) cf1 = net;
      if (m === 12) cf12[p] = net;

      if (net >= 0) {
        const bufferTarget = 6 * twin.essentialExpenses * Math.pow(1 + expenseGrowthP, t);
        const toCash = cash < bufferTarget ? 0.7 : 0.3;
        cash += net * toCash;
        inv += net * (1 - toCash);
      } else {
        cash += net;
        if (cash < 0) {
          inv += cash;
          cash = 0;
          if (inv < 0) {
            hadShortfall = true;
            shortfallAmt[p] += -inv;
            inv = 0;
          }
        }
      }

      if (goal && m <= goalMonths) {
        fund = fund * (1 + Math.max(r, -0.5)) + Math.min(Math.max(net, 0), goalContribution);
      }

      const liquid = cash + inv;
      if (liquid < minLiq) minLiq = liquid;
      nw[m][p] = liquid + assets.reduce((s, x) => s + x.value, 0) - liabs.reduce((s, l) => s + Math.max(l.balance, 0), 0);
    }

    finals[p] = nw[months][p];
    goalFund[p] = fund;
    shortfall[p] = hadShortfall ? 1 : 0;
    minLiquid[p] = minLiq;
  }

  return { nw, finals, goalFund, shortfall, shortfallAmt, minLiquid, cf12, cf1 };
}

function summarize(stats: PathStats, months: number) {
  const keys = [0.05, 0.15, 0.25, 0.5, 0.75, 0.85, 0.95];
  const series: Percentiles = { p5: [], p15: [], p25: [], p50: [], p75: [], p85: [], p95: [], mean: [] };
  const names: (keyof Percentiles)[] = ["p5", "p15", "p25", "p50", "p75", "p85", "p95"];
  for (let m = 0; m <= months; m++) {
    const sorted = Float64Array.from(stats.nw[m]).sort();
    keys.forEach((q, i) => series[names[i]].push(Math.round(quantile(sorted, q))));
    let s = 0;
    for (let i = 0; i < sorted.length; i++) s += sorted[i];
    series.mean.push(Math.round(s / sorted.length));
  }
  return series;
}

function emergencySurvival(twin: SimTwin, a: EconAssumptions, params: ScenarioParams) {
  let remaining = twin.emergencySavings;
  let m = 0;
  const mult = 1 + ((params.expenseChangePct ?? 0) / 100) * (params.expenseStartMonth === undefined || params.expenseStartMonth <= 1 ? 1 : 0);
  while (remaining > 0 && m < 240) {
    m++;
    const exp = twin.essentialExpenses * mult * Math.pow(1 + a.expenseGrowth, m / 12) + (params.extraMonthlyExpense ?? 0);
    remaining -= exp;
  }
  return Math.max(0, m - (remaining < 0 ? 1 : 0) + (remaining < 0 ? Math.max(0, 1 + remaining / (twin.essentialExpenses * mult || 1)) : 0));
}

function riskDrivers(twin: SimTwin, a: EconAssumptions, params: ScenarioParams, shortfallProb: number) {
  const income = twin.monthlyIncome;
  const debtPay = twin.liabilities.reduce((s, l) => s + l.payment, 0);
  const coverage = twin.essentialExpenses > 0 ? twin.emergencySavings / twin.essentialExpenses : 0;
  const liquid = twin.cash + twin.investments;
  const drivers = [
    {
      label: "Emergency coverage",
      weight: Math.min(1, Math.max(0, (6 - coverage) / 6)),
      note: `${coverage.toFixed(1)} months of essential expenses are covered.`,
    },
    {
      label: "Debt load",
      weight: Math.min(1, income > 0 ? debtPay / income / 0.4 : 1),
      note: `Debt payments use ${income > 0 ? Math.round((debtPay / income) * 100) : 0}% of income.`,
    },
    {
      label: "Expense growth vs income growth",
      weight: Math.min(1, Math.max(0, (a.expenseGrowth - a.incomeGrowth) / 0.06 + 0.4)),
      note: `Expenses are assumed to grow ${(a.expenseGrowth * 100).toFixed(0)}% vs income ${(a.incomeGrowth * 100).toFixed(0)}%.`,
    },
    {
      label: "Market volatility exposure",
      weight: Math.min(1, liquid > 0 ? (twin.investments / liquid) * (a.volatility / 0.2) : 0),
      note: `${liquid > 0 ? Math.round((twin.investments / liquid) * 100) : 0}% of liquid assets are exposed to ${(a.volatility * 100).toFixed(0)}% volatility.`,
    },
    {
      label: "Scenario shock",
      weight: Math.min(1, shortfallProb * 2.5),
      note:
        shortfallProb > 0.02
          ? `${Math.round(shortfallProb * 100)}% of simulated paths ran out of liquid assets at some point.`
          : "The scenario rarely exhausts liquid assets.",
    },
  ];
  if (params.incomeChangePct && params.incomeChangePct < 0) {
    drivers.push({
      label: "Income interruption",
      weight: Math.min(1, Math.abs(params.incomeChangePct) / 100),
      note: `Income falls ${Math.abs(params.incomeChangePct)}% for ${params.incomeDurationMonths ?? "all"} months.`,
    });
  }
  return drivers.sort((x, y) => y.weight - x.weight).slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function runSimulation(twin: SimTwin, assumptions: EconAssumptions, params: ScenarioParams, opts: SimOptions): SimResults {
  const a: EconAssumptions = { ...assumptions, ...(params.assumptions ?? {}) };
  const seed = opts.seed ?? 1337;
  const months = Math.max(12, Math.round(a.horizonYears * 12));
  const stats = runPaths(twin, a, params, opts.paths, seed);
  const series = summarize(stats, months);

  const sortedFinals = Float64Array.from(stats.finals).sort();
  const final = {
    p5: Math.round(quantile(sortedFinals, 0.05)),
    p15: Math.round(quantile(sortedFinals, 0.15)),
    p25: Math.round(quantile(sortedFinals, 0.25)),
    p50: Math.round(quantile(sortedFinals, 0.5)),
    p75: Math.round(quantile(sortedFinals, 0.75)),
    p85: Math.round(quantile(sortedFinals, 0.85)),
    p95: Math.round(quantile(sortedFinals, 0.95)),
    mean: Math.round(series.mean[months]),
    min: Math.round(sortedFinals[0]),
    max: Math.round(sortedFinals[sortedFinals.length - 1]),
  };

  const lo = quantile(sortedFinals, 0.01);
  const hi = quantile(sortedFinals, 0.99);
  const binCount = 24;
  const width = (hi - lo) / binCount || 1;
  const histogram = Array.from({ length: binCount }, (_, i) => ({ from: Math.round(lo + i * width), to: Math.round(lo + (i + 1) * width), count: 0 }));
  for (let i = 0; i < sortedFinals.length; i++) {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor((sortedFinals[i] - lo) / width)));
    histogram[idx].count++;
  }

  let goal: SimResults["goal"] = null;
  if (twin.goal) {
    const sortedFund = Float64Array.from(stats.goalFund).sort();
    let hit = 0;
    for (let i = 0; i < stats.goalFund.length; i++) if (stats.goalFund[i] >= twin.goal.target) hit++;
    goal = {
      id: twin.goal.id,
      name: twin.goal.name,
      target: twin.goal.target,
      month: twin.goal.months + (params.goalDelayMonths ?? 0),
      probability: hit / stats.goalFund.length,
      medianFund: Math.round(quantile(sortedFund, 0.5)),
      p10Fund: Math.round(quantile(sortedFund, 0.1)),
      p90Fund: Math.round(quantile(sortedFund, 0.9)),
    };
  }

  let shortCount = 0;
  const shortAmts: number[] = [];
  for (let i = 0; i < stats.shortfall.length; i++) {
    if (stats.shortfall[i]) {
      shortCount++;
      shortAmts.push(stats.shortfallAmt[i]);
    }
  }
  const shortfallProbability = shortCount / stats.shortfall.length;
  const medianShortfall = shortAmts.length ? Math.round(quantile(shortAmts.sort((x, y) => x - y), 0.5)) : 0;
  const sortedMinLiq = Float64Array.from(stats.minLiquid).sort();
  const sortedCf12 = Float64Array.from(stats.cf12).sort();
  const level = shortfallProbability < 0.05 ? "low" : shortfallProbability < 0.15 ? "moderate" : shortfallProbability < 0.35 ? "elevated" : "high";

  const baselineNeeded = opts.baseline && Object.keys(params).some((k) => (params as Record<string, unknown>)[k] !== undefined && (params as Record<string, unknown>)[k] !== null);
  let baseline: SimResults["baseline"] = null;
  if (baselineNeeded) {
    const b = runSimulation(twin, assumptions, {}, { paths: opts.paths, seed, sensitivity: false, baseline: false });
    baseline = {
      finalP50: b.final.p50,
      p50: b.series.p50,
      goalProbability: b.goal ? b.goal.probability : null,
      shortfallProbability: b.risk.shortfallProbability,
      cashFlow12: b.cashFlow.month12Median,
    };
  }

  const sensitivity = opts.sensitivity ? computeSensitivity(twin, assumptions, params, seed, final.p50) : [];

  return {
    months,
    paths: opts.paths,
    seed,
    series,
    final,
    histogram,
    goal,
    risk: {
      shortfallProbability,
      medianShortfall,
      emergencySurvivalMonths: Math.round(emergencySurvival(twin, a, params) * 10) / 10,
      emergencyNeverDepleted: 1 - shortfallProbability,
      minLiquidP10: Math.round(quantile(sortedMinLiq, 0.1)),
      level,
      drivers: riskDrivers(twin, a, params, shortfallProbability),
    },
    cashFlow: {
      month1: Math.round(stats.cf1),
      month12Median: Math.round(quantile(sortedCf12, 0.5)),
      month12P10: Math.round(quantile(sortedCf12, 0.1)),
      month12P90: Math.round(quantile(sortedCf12, 0.9)),
    },
    baseline,
    sensitivity,
    assumptions: a,
    params,
  };
}

export function computeSensitivity(twin: SimTwin, assumptions: EconAssumptions, params: ScenarioParams, seed: number, base: number): SensitivityRow[] {
  const paths = 200;
  const baseSavings = Math.max(twin.monthlyIncome - twin.monthlyExpenses, twin.monthlyIncome * 0.1);
  const quick = (tw: SimTwin, a: EconAssumptions, p: ScenarioParams) =>
    runSimulation(tw, a, p, { paths, seed, sensitivity: false, baseline: false }).final.p50;
  const baseQuick = quick(twin, assumptions, params);
  const scale = baseQuick !== 0 ? base / baseQuick : 1;

  const scaleParams = (p: ScenarioParams, f: number): ScenarioParams => ({
    ...p,
    oneTimeCost: p.oneTimeCost ? p.oneTimeCost * f : p.oneTimeCost,
    extraMonthlyExpense: p.extraMonthlyExpense ? p.extraMonthlyExpense * f : p.extraMonthlyExpense,
    expenseChangePct: p.expenseChangePct ? p.expenseChangePct * f : p.expenseChangePct,
    incomeChangePct: p.incomeChangePct ? p.incomeChangePct * f : p.incomeChangePct,
    purchase: p.purchase ? { ...p.purchase, price: p.purchase.price * f } : p.purchase,
  });

  const rows: { key: string; label: string; shift: string; low: () => number; high: () => number }[] = [
    {
      key: "savings",
      label: "Monthly savings",
      shift: "±20%",
      low: () => quick({ ...twin, monthlyExpenses: twin.monthlyExpenses + baseSavings * 0.2 }, assumptions, params),
      high: () => quick({ ...twin, monthlyExpenses: twin.monthlyExpenses - baseSavings * 0.2 }, assumptions, params),
    },
    {
      key: "incomeGrowth",
      label: "Income growth",
      shift: "±2 pts",
      low: () => quick(twin, { ...assumptions, incomeGrowth: assumptions.incomeGrowth - 0.02 }, params),
      high: () => quick(twin, { ...assumptions, incomeGrowth: assumptions.incomeGrowth + 0.02 }, params),
    },
    {
      key: "inflation",
      label: "Inflation",
      shift: "±2 pts",
      low: () => quick(twin, { ...assumptions, expenseGrowth: assumptions.expenseGrowth + 0.02, inflation: assumptions.inflation + 0.02 }, params),
      high: () => quick(twin, { ...assumptions, expenseGrowth: assumptions.expenseGrowth - 0.02, inflation: assumptions.inflation - 0.02 }, params),
    },
    {
      key: "return",
      label: "Investment return",
      shift: "±2 pts",
      low: () => quick(twin, { ...assumptions, investmentReturn: assumptions.investmentReturn - 0.02 }, params),
      high: () => quick(twin, { ...assumptions, investmentReturn: assumptions.investmentReturn + 0.02 }, params),
    },
    {
      key: "expenses",
      label: "Expenses",
      shift: "±10%",
      low: () => quick({ ...twin, monthlyExpenses: twin.monthlyExpenses * 1.1 }, assumptions, params),
      high: () => quick({ ...twin, monthlyExpenses: twin.monthlyExpenses * 0.9 }, assumptions, params),
    },
    {
      key: "scenarioCost",
      label: "Scenario cost",
      shift: "±20%",
      low: () => quick(twin, assumptions, scaleParams(params, 1.2)),
      high: () => quick(twin, assumptions, scaleParams(params, 0.8)),
    },
  ];

  return rows
    .map((r) => {
      const low = Math.round(r.low() * scale);
      const high = Math.round(r.high() * scale);
      return { key: r.key, label: r.label, shift: r.shift, low, high, base, impact: Math.abs(high - low) };
    })
    .sort((x, y) => y.impact - x.impact);
}

/** Lightweight deterministic projection (no randomness) used for sparklines. */
export function quickProjection(twin: SimTwin, a: EconAssumptions, params: ScenarioParams = {}, years = 10) {
  const res = runSimulation(twin, a, params, { paths: 60, seed: 7, sensitivity: false, baseline: false });
  return { p50: res.series.p50, p15: res.series.p15, p85: res.series.p85, months: years * 12 };
}
