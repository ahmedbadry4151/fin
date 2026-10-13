import type { TwinInput, TwinMetrics } from "./finance";
import { computeMetrics, requiredMonthly, CATEGORY_LABEL } from "./finance";
import { runSimulation, type EconAssumptions, type ScenarioParams, type SimResults } from "./simulation";
import { buildSimTwin, type GoalLike } from "./twin";
import { formatMoney, formatMonths, formatPct } from "./format";

export type AiKpi = { label: string; value: string; hint?: string; tone?: "accent" | "good" | "warn" | "bad" | "neutral" };
export type AiAction = { label: string; href: string };
export type AiChart = { type: "bars"; title: string; points: { label: string; value: number; display: string }[] };

export type AiAnswer = {
  intent: string;
  text: string;
  kpis: AiKpi[];
  chart?: AiChart | null;
  assumptions: string[];
  dataUsed: string[];
  simulation?: { paths: number; horizonYears: number; scenario: string } | null;
  actions: AiAction[];
  followUps: string[];
  timestamp: string;
};

export type IntelligenceContext = {
  currency: string;
  input: TwinInput;
  metrics: TwinMetrics;
  econ: EconAssumptions;
  goals: GoalLike[];
  recentTransactions: { description: string; category: string; type: string; amount: number; date: string }[];
  scenarios: { id: number; name: string; params: ScenarioParams }[];
  latestSimulation?: { id: number; name: string; results: SimResults } | null;
};

export const SUGGESTED_QUESTIONS = [
  "How long could my savings cover my expenses?",
  "What changed in my finances this month?",
  "What happens if I lose my income?",
  "Can I reach my home goal?",
  "What if I save 15% more?",
  "Which assumption affects my future the most?",
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

function baseData(ctx: IntelligenceContext) {
  return [
    `Financial Twin: income ${formatMoney(ctx.metrics.income, ctx.currency)}, expenses ${formatMoney(ctx.metrics.expenses, ctx.currency)}, liquid assets ${formatMoney(ctx.metrics.liquid, ctx.currency)}`,
    `Emergency savings ${formatMoney(ctx.input.emergencySavings, ctx.currency)}`,
  ];
}

function baseAssumptions(ctx: IntelligenceContext) {
  const a = ctx.econ;
  return [
    `Inflation ${formatPct(a.inflation, 0)}`,
    `Income growth ${formatPct(a.incomeGrowth, 0)}`,
    `Expense growth ${formatPct(a.expenseGrowth, 0)}`,
    `Investment return ${formatPct(a.investmentReturn, 0)} ± ${formatPct(a.volatility, 0)} volatility`,
    `Horizon ${a.horizonYears} years`,
  ];
}

function quickSim(ctx: IntelligenceContext, params: ScenarioParams, goal?: GoalLike | null, paths = 300) {
  const simTwin = buildSimTwin(ctx.input, goal ?? ctx.goals[0] ?? null);
  return runSimulation(simTwin, ctx.econ, params, { paths, seed: 4242, sensitivity: false, baseline: true });
}

function detectIntent(q: string): string {
  const t = q.toLowerCase();
  if (/assumption|matter|sensitiv|affect.*most|biggest driver/.test(t)) return "sensitivity";
  if (/changed|this month|spending|spent|where.*money/.test(t)) return "changes";
  if (/lose|loss|lost|job|unemploy|income stop|no income|laid/.test(t)) return "job-loss";
  if (/save\s*\d+|save more|saving more|savings rate|% more/.test(t)) return "save-more";
  if (/cover|emergency|last|runway|how long/.test(t)) return "coverage";
  if (/goal|reach|afford|home|house|car|trip|retire/.test(t)) return "goal";
  if (/inflation|recession|economy|return/.test(t)) return "economy";
  if (/debt|loan|credit|payoff|pay off/.test(t)) return "debt";
  if (/net worth|future|years|projection|wealth/.test(t)) return "projection";
  return "summary";
}

export function answerQuestion(question: string, ctx: IntelligenceContext): AiAnswer {
  const intent = detectIntent(question);
  const c = ctx.currency;
  const m = ctx.metrics;
  const stamp = new Date().toISOString();
  const base = {
    timestamp: stamp,
    dataUsed: baseData(ctx),
    assumptions: baseAssumptions(ctx),
    simulation: null as AiAnswer["simulation"],
    chart: null as AiChart | null,
  };

  switch (intent) {
    case "coverage": {
      const monthsEssential = m.essential > 0 ? ctx.input.emergencySavings / m.essential : 0;
      const monthsTotal = m.expenses > 0 ? ctx.input.emergencySavings / m.expenses : 0;
      const liquidMonths = m.expenses > 0 ? m.liquid / m.expenses : 0;
      return {
        ...base,
        intent,
        text: `Your emergency savings cover approximately ${monthsEssential.toFixed(1)} months of essential expenses under the current model, or ${monthsTotal.toFixed(1)} months if nothing in your spending changes. Counting every liquid account, you could sustain current spending for about ${liquidMonths.toFixed(1)} months with no income.`,
        kpis: [
          { label: "Emergency coverage", value: formatMonths(monthsEssential), hint: "essential expenses", tone: monthsEssential >= 6 ? "good" : monthsEssential >= 3 ? "accent" : "warn" },
          { label: "At current spending", value: formatMonths(monthsTotal), hint: "all expenses" },
          { label: "All liquid assets", value: formatMonths(liquidMonths), hint: "cash + investments" },
          { label: "Essential expenses", value: formatMoney(m.essential, c), hint: "per month" },
        ],
        actions: [
          { label: "View calculation", href: "/health" },
          { label: "Stress test this", href: "/scenarios/new?template=lose-job" },
        ],
        followUps: ["What happens if I lose my income?", "How do I reach six months of coverage?"],
      };
    }
    case "job-loss": {
      const monthsMatch = question.match(/(\d+)\s*month/);
      const duration = monthsMatch ? Number(monthsMatch[1]) : 6;
      const params: ScenarioParams = { incomeChangePct: -100, incomeStartMonth: 1, incomeDurationMonths: duration };
      const res = quickSim(ctx, params);
      const bl = res.baseline;
      const delta = bl ? res.final.p50 - bl.finalP50 : 0;
      return {
        ...base,
        intent,
        text: `If your income stopped for ${duration} months starting now, the simulation estimates a ${pct(res.risk.shortfallProbability)} probability of exhausting liquid assets at some point in the horizon, and a median 10-year net worth ${formatMoney(Math.abs(delta), c, { compact: true })} ${delta < 0 ? "lower" : "higher"} than your current plan. Your emergency fund alone would last about ${res.risk.emergencySurvivalMonths} months of essential spending.`,
        kpis: [
          { label: "Shortfall probability", value: pct(res.risk.shortfallProbability), tone: res.risk.shortfallProbability > 0.15 ? "warn" : "good" },
          { label: "Emergency fund lasts", value: formatMonths(res.risk.emergencySurvivalMonths) },
          { label: "Median net worth", value: formatMoney(res.final.p50, c, { compact: true }), hint: `${ctx.econ.horizonYears}-year horizon`, tone: "accent" },
          { label: "vs current plan", value: formatMoney(delta, c, { compact: true, sign: true }), tone: delta < 0 ? "warn" : "good" },
        ],
        chart: {
          type: "bars",
          title: "Median net worth at horizon",
          points: [
            { label: "Current plan", value: bl?.finalP50 ?? res.final.p50, display: formatMoney(bl?.finalP50 ?? res.final.p50, c, { compact: true }) },
            { label: `No income ${duration}m`, value: res.final.p50, display: formatMoney(res.final.p50, c, { compact: true }) },
          ],
        },
        simulation: { paths: res.paths, horizonYears: ctx.econ.horizonYears, scenario: `Income −100% for ${duration} months` },
        actions: [
          { label: "Run full simulation", href: "/scenarios/new?template=lose-job" },
          { label: "Review emergency fund", href: "/goals" },
        ],
        followUps: ["How long could my savings cover my expenses?", "What if I save 15% more?"],
      };
    }
    case "save-more": {
      const match = question.match(/(\d+)\s*%/);
      const pctMore = match ? Number(match[1]) : 15;
      const goal = ctx.goals[0] ?? null;
      const res = quickSim(ctx, { savingsChangePct: pctMore }, goal);
      const bl = res.baseline;
      const extra = (pctMore / 100) * Math.max(m.savings, m.income * 0.1);
      return {
        ...base,
        intent,
        text: `Saving ${pctMore}% more means roughly ${formatMoney(extra, c)} extra per month. Under the selected assumptions the simulation moves the median ${ctx.econ.horizonYears}-year net worth from ${formatMoney(bl?.finalP50 ?? 0, c, { compact: true })} to ${formatMoney(res.final.p50, c, { compact: true })}${res.goal && bl?.goalProbability !== null && bl ? `, and the estimated probability of reaching “${res.goal.name}” from ${pct(bl.goalProbability ?? 0)} to ${pct(res.goal.probability)}` : ""}.`,
        kpis: [
          { label: "Extra per month", value: formatMoney(extra, c), tone: "accent" },
          { label: "Median net worth", value: formatMoney(res.final.p50, c, { compact: true }), hint: `was ${formatMoney(bl?.finalP50 ?? 0, c, { compact: true })}` },
          ...(res.goal ? [{ label: `${res.goal.name} probability`, value: pct(res.goal.probability), hint: bl?.goalProbability != null ? `was ${pct(bl.goalProbability)}` : undefined, tone: "good" as const }] : []),
          { label: "Shortfall probability", value: pct(res.risk.shortfallProbability) },
        ],
        chart: {
          type: "bars",
          title: "Median net worth at horizon",
          points: [
            { label: "Current plan", value: bl?.finalP50 ?? 0, display: formatMoney(bl?.finalP50 ?? 0, c, { compact: true }) },
            { label: `Save ${pctMore}% more`, value: res.final.p50, display: formatMoney(res.final.p50, c, { compact: true }) },
          ],
        },
        simulation: { paths: res.paths, horizonYears: ctx.econ.horizonYears, scenario: `Savings +${pctMore}%` },
        actions: [
          { label: "Create this scenario", href: "/scenarios/new?template=save-more" },
          { label: "Open goal planner", href: goal ? `/goals/${goal.id}/planner` : "/goals" },
        ],
        followUps: ["Can I reach my home goal?", "Which assumption affects my future the most?"],
      };
    }
    case "goal": {
      const t = question.toLowerCase();
      const goal =
        ctx.goals.find((g) => t.includes(g.name.toLowerCase().split(" ")[0]) || t.includes(g.name.toLowerCase())) ??
        ctx.goals.find((g) => /home|house/.test(t) && /home/i.test(g.name)) ??
        ctx.goals[0];
      if (!goal) {
        return { ...base, intent, text: "You haven't added a goal yet. Give your future something to measure and I can estimate how reachable it is.", kpis: [], actions: [{ label: "Add a goal", href: "/goals/new" }], followUps: ["What happens if I lose my income?"] };
      }
      const res = quickSim(ctx, {}, goal);
      const months = Math.max(1, res.goal?.month ?? 1);
      const req = requiredMonthly(goal.targetAmount, goal.currentAmount, months, ctx.econ.investmentReturn);
      const prob = res.goal?.probability ?? 0;
      return {
        ...base,
        intent,
        text: `Under the selected simulation assumptions, your estimated probability of reaching “${goal.name}” (${formatMoney(goal.targetAmount, c)}) by the target date is ${pct(prob)}. The median simulated fund at that date is ${formatMoney(res.goal?.medianFund ?? 0, c, { compact: true })}. A deterministic plan would require about ${formatMoney(req, c)} per month versus your current ${formatMoney(goal.monthlyContribution, c)}.`,
        kpis: [
          { label: "Goal probability", value: pct(prob), tone: prob >= 0.65 ? "good" : prob >= 0.4 ? "accent" : "warn" },
          { label: "Median fund at date", value: formatMoney(res.goal?.medianFund ?? 0, c, { compact: true }) },
          { label: "Required monthly", value: formatMoney(req, c), hint: `current ${formatMoney(goal.monthlyContribution, c)}` },
          { label: "Range (10th–90th)", value: `${formatMoney(res.goal?.p10Fund ?? 0, c, { compact: true })} – ${formatMoney(res.goal?.p90Fund ?? 0, c, { compact: true })}` },
        ],
        simulation: { paths: res.paths, horizonYears: ctx.econ.horizonYears, scenario: "Current plan" },
        actions: [
          { label: "Open goal planner", href: `/goals/${goal.id}/planner` },
          { label: "Simulate goal", href: `/simulations/new?goal=${goal.id}` },
        ],
        followUps: ["What if I save 15% more?", "Which assumption affects my future the most?"],
      };
    }
    case "sensitivity": {
      const simTwin = buildSimTwin(ctx.input, ctx.goals[0] ?? null);
      const res = runSimulation(simTwin, ctx.econ, {}, { paths: 200, seed: 99, sensitivity: true, baseline: false });
      const top = res.sensitivity[0];
      return {
        ...base,
        intent,
        text: top
          ? `Across the assumptions tested, ${top.label.toLowerCase()} moves your ${ctx.econ.horizonYears}-year median net worth the most: shifting it ${top.shift} changes the outcome by about ${formatMoney(top.impact, c, { compact: true })}. ${res.sensitivity[1] ? `${res.sensitivity[1].label} is second at ${formatMoney(res.sensitivity[1].impact, c, { compact: true })}.` : ""}`
          : "Sensitivity could not be computed.",
        kpis: res.sensitivity.slice(0, 4).map((s, i) => ({ label: s.label, value: formatMoney(s.impact, c, { compact: true }), hint: s.shift, tone: i === 0 ? ("accent" as const) : ("neutral" as const) })),
        chart: { type: "bars", title: "Swing in median net worth", points: res.sensitivity.map((s) => ({ label: s.label, value: s.impact, display: formatMoney(s.impact, c, { compact: true }) })) },
        simulation: { paths: 200, horizonYears: ctx.econ.horizonYears, scenario: "Sensitivity sweep" },
        actions: [
          { label: "Open sensitivity analysis", href: ctx.latestSimulation ? `/simulations/${ctx.latestSimulation.id}?tab=sensitivity` : "/simulations" },
          { label: "Edit assumptions", href: "/economy" },
        ],
        followUps: ["What if inflation stays high?", "What if I save 15% more?"],
      };
    }
    case "changes": {
      const now = Date.now();
      const day = 86400000;
      const recent: Record<string, number> = {};
      const prior: Record<string, number> = {};
      let recentTotal = 0;
      let priorTotal = 0;
      for (const t of ctx.recentTransactions) {
        if (t.type !== "expense") continue;
        const age = (now - new Date(t.date).getTime()) / day;
        if (age <= 30) {
          recent[t.category] = (recent[t.category] ?? 0) + t.amount;
          recentTotal += t.amount;
        } else if (age <= 60) {
          prior[t.category] = (prior[t.category] ?? 0) + t.amount;
          priorTotal += t.amount;
        }
      }
      const cats = Array.from(new Set([...Object.keys(recent), ...Object.keys(prior)]))
        .map((k) => ({ k, delta: (recent[k] ?? 0) - (prior[k] ?? 0), now: recent[k] ?? 0 }))
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      const top = cats[0];
      const diff = recentTotal - priorTotal;
      return {
        ...base,
        intent,
        text: `Over the last 30 days you spent ${formatMoney(recentTotal, c)}, ${formatMoney(Math.abs(diff), c)} ${diff >= 0 ? "more" : "less"} than the previous 30 days.${top ? ` The largest change was ${CATEGORY_LABEL[top.k] ?? top.k} (${formatMoney(top.delta, c, { sign: true })}).` : ""} This is based on recorded transactions, not the modelled budget.`,
        kpis: [
          { label: "Last 30 days", value: formatMoney(recentTotal, c), tone: "accent" },
          { label: "Previous 30 days", value: formatMoney(priorTotal, c) },
          { label: "Change", value: formatMoney(diff, c, { sign: true }), tone: diff > 0 ? "warn" : "good" },
          ...(top ? [{ label: "Biggest mover", value: CATEGORY_LABEL[top.k] ?? top.k, hint: formatMoney(top.delta, c, { sign: true }) }] : []),
        ],
        chart: { type: "bars", title: "Change by category (30d vs prior 30d)", points: cats.slice(0, 6).map((x) => ({ label: CATEGORY_LABEL[x.k] ?? x.k, value: Math.abs(x.delta), display: formatMoney(x.delta, c, { sign: true }) })) },
        dataUsed: [`${ctx.recentTransactions.length} transactions from the last 90 days`, ...baseData(ctx)],
        actions: [
          { label: "Open spending analytics", href: "/analytics/spending" },
          { label: "Review transactions", href: "/transactions" },
        ],
        followUps: ["How long could my savings cover my expenses?", "What if I spend 10% less?"],
      };
    }
    case "economy": {
      const res = quickSim(ctx, { assumptions: { inflation: 0.25, expenseGrowth: 0.22, incomeGrowth: 0.1 } });
      const bl = res.baseline;
      return {
        ...base,
        intent,
        text: `If inflation ran at 25% with expenses growing 22% a year and income only 10%, the simulation's median ${ctx.econ.horizonYears}-year net worth would be ${formatMoney(res.final.p50, c, { compact: true })} versus ${formatMoney(bl?.finalP50 ?? 0, c, { compact: true })} under your current assumptions. The probability of a liquidity shortfall would move from ${pct(bl?.shortfallProbability ?? 0)} to ${pct(res.risk.shortfallProbability)}.`,
        kpis: [
          { label: "Median net worth", value: formatMoney(res.final.p50, c, { compact: true }), hint: "high inflation", tone: "accent" },
          { label: "Current assumptions", value: formatMoney(bl?.finalP50 ?? 0, c, { compact: true }) },
          { label: "Shortfall probability", value: pct(res.risk.shortfallProbability), tone: res.risk.shortfallProbability > 0.15 ? "warn" : "neutral" },
        ],
        simulation: { paths: res.paths, horizonYears: ctx.econ.horizonYears, scenario: "High inflation preset" },
        actions: [
          { label: "Open economic environment", href: "/economy" },
          { label: "Apply preset to a simulation", href: "/economy/presets" },
        ],
        followUps: ["Which assumption affects my future the most?", "What happens if I lose my income?"],
      };
    }
    case "debt": {
      const payoffMonths = m.monthlyDebtPayments > 0 ? m.totalDebt / m.monthlyDebtPayments : 0;
      return {
        ...base,
        intent,
        text: `You carry ${formatMoney(m.totalDebt, c)} of debt with about ${formatMoney(m.monthlyDebtPayments, c)} in monthly payments — ${pct(m.debtToIncome)} of income. At the current pace the balances clear in roughly ${formatMonths(payoffMonths)}, ignoring new borrowing. Paying ${formatMoney(1000, c)} extra per month would shorten that to about ${formatMonths(m.totalDebt / (m.monthlyDebtPayments + 1000))}.`,
        kpis: [
          { label: "Total debt", value: formatMoney(m.totalDebt, c), tone: "accent" },
          { label: "Monthly payments", value: formatMoney(m.monthlyDebtPayments, c) },
          { label: "Debt-to-income", value: pct(m.debtToIncome), tone: m.debtToIncome > 0.35 ? "warn" : "good" },
          { label: "Approx. payoff", value: formatMonths(payoffMonths) },
        ],
        actions: [
          { label: "Debt analytics", href: "/analytics/debt" },
          { label: "Simulate debt payoff", href: "/scenarios/new?template=spend-less" },
        ],
        followUps: ["What if I save 15% more?", "How long could my savings cover my expenses?"],
      };
    }
    case "projection": {
      const res = quickSim(ctx, {});
      return {
        ...base,
        intent,
        text: `The simulation estimates a median net worth of ${formatMoney(res.final.p50, c, { compact: true })} in ${ctx.econ.horizonYears} years under the selected assumptions, with a 5th–95th percentile range of ${formatMoney(res.final.p5, c, { compact: true })} to ${formatMoney(res.final.p95, c, { compact: true })}. This is a distribution of possible outcomes, not a forecast.`,
        kpis: [
          { label: "Median", value: formatMoney(res.final.p50, c, { compact: true }), tone: "accent" },
          { label: "5th percentile", value: formatMoney(res.final.p5, c, { compact: true }) },
          { label: "95th percentile", value: formatMoney(res.final.p95, c, { compact: true }) },
          { label: "Today", value: formatMoney(m.netWorth, c, { compact: true }) },
        ],
        simulation: { paths: res.paths, horizonYears: ctx.econ.horizonYears, scenario: "Current plan" },
        actions: [
          { label: "Run full simulation", href: "/simulations/new" },
          { label: "Explore scenarios", href: "/scenarios" },
        ],
        followUps: ["Which assumption affects my future the most?", "What if I save 15% more?"],
      };
    }
    default: {
      return {
        ...base,
        intent: "summary",
        text: `Right now your Financial Twin shows ${formatMoney(m.income, c)} of monthly income against ${formatMoney(m.expenses, c)} of expenses, leaving ${formatMoney(m.savings, c)} (${formatPct(m.savingsRate, 0)} savings rate). Net worth is ${formatMoney(m.netWorth, c)} and your emergency savings cover ${m.emergencyCoverage.toFixed(1)} months of essentials. Ask about a specific decision and I'll simulate it.`,
        kpis: [
          { label: "Net worth", value: formatMoney(m.netWorth, c), tone: "accent" },
          { label: "Monthly savings", value: formatMoney(m.savings, c) },
          { label: "Savings rate", value: formatPct(m.savingsRate, 0) },
          { label: "Emergency coverage", value: formatMonths(m.emergencyCoverage) },
        ],
        actions: [
          { label: "Open Financial Twin", href: "/twin" },
          { label: "Browse scenarios", href: "/scenarios" },
        ],
        followUps: SUGGESTED_QUESTIONS.slice(0, 3),
      };
    }
  }
}
