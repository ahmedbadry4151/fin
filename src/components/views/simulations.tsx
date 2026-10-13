"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Check, ArrowUpRight, Sparkles, FileText, GitCompare, Trash2 } from "lucide-react";
import { Card, CardTitle, PageHeader, KeyValue, MetricCard } from "../ui/card";
import { Button } from "../ui/button";
import { SegmentedControl, StatusBadge, PillTabs, Chip } from "../ui/pill";
import { Slider, Select, Checkbox } from "../ui/field";
import { Drawer } from "../ui/overlay";
import { EmptyState, ErrorState, Icon } from "../ui/states";
import { FanChart } from "../charts/fan-chart";
import { Histogram, HBars } from "../charts/charts";
import { ProgressBar, CircularProgress } from "../motion/progress";
import { useCountUp } from "../motion/count-up";
import { Stagger, StaggerItem, EASE_OUT } from "../motion/stagger";
import { useToast } from "../motion/toast";
import { formatMoney, formatMonths, formatPct, relativeTime } from "@/lib/format";
import { describeParams } from "@/lib/scenarios";
import { runSimulation, type EconAssumptions, type ScenarioParams, type SimResults, type SimTwin } from "@/lib/simulation";

/* ---------------- Configuration + progress ---------------- */
const STAGES = ["Preparing model", "Generating possible paths", "Running futures", "Calculating percentiles", "Analyzing risk", "Preparing results"];

export function SimulationConfigView({ currency: c, scenario, goals, econ, defaults, metrics }: { currency: string; scenario: { id: number; name: string; description: string; params: ScenarioParams } | null; goals: { id: number; name: string; targetAmount: number }[]; econ: EconAssumptions; defaults: { paths: number; horizon: number; goalId: number | null }; metrics: { income: number; expenses: number; netWorth: number; savings: number } }) {
  const router = useRouter();
  const [paths, setPaths] = useState(defaults.paths);
  const [horizon, setHorizon] = useState(defaults.horizon);
  const [goalId, setGoalId] = useState<number | null>(defaults.goalId ?? goals[0]?.id ?? null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progress = useCountUp(running ? 100 : 0, { duration: 4200 });
  const pathCount = useCountUp(running ? paths : 0, { duration: 4200, delay: 600 });

  useEffect(() => {
    if (!running) return;
    const timers = STAGES.map((_, i) => setTimeout(() => setStage(i), i * 700));
    return () => timers.forEach(clearTimeout);
  }, [running]);

  async function run() {
    setRunning(true);
    setError(null);
    setStage(0);
    const started = Date.now();
    try {
      const r = await fetch("/api/simulations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: scenario?.id ?? null, goalId, paths, horizonYears: horizon }) });
      if (!r.ok) throw new Error("failed");
      const d = await r.json();
      const wait = Math.max(0, 4400 - (Date.now() - started));
      setTimeout(() => router.push(`/simulations/${d.id}`), wait);
    } catch {
      setRunning(false);
      setError("We couldn't complete this simulation.");
    }
  }

  if (error) return <ErrorState title="We couldn't complete this simulation." description="The engine returned an error. Check that your Twin has income and expenses, then try again." onRetry={() => setError(null)} secondary={<Button variant="secondary" href="/economy">Review assumptions</Button>} />;

  if (running) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full text-center">
          <CircularProgress value={progress / 100} size={160} stroke={8}><div><div className="text-[34px] font-extrabold tracking-tight tnum">{Math.round(progress)}</div><div className="label-sm">percent</div></div></CircularProgress>
          <h1 className="mt-6 text-[26px] font-extrabold tracking-tight">Simulating {scenario ? `“${scenario.name}”` : "your current plan"}</h1>
          <div className="mt-1 text-[14px] text-muted tnum">{Math.round(pathCount).toLocaleString()} of {paths.toLocaleString()} futures · {horizon}-year horizon</div>
          <ol className="mx-auto mt-8 max-w-sm space-y-2 text-left">
            {STAGES.map((s, i) => (
              <motion.li key={s} initial={{ opacity: 0.3 }} animate={{ opacity: i <= stage ? 1 : 0.3 }} className="flex items-center gap-3 text-[13.5px] font-semibold">
                <span className={`grid h-6 w-6 place-items-center pill ${i < stage ? "bg-ink text-accent" : i === stage ? "bg-accent text-accent-ink" : "bg-card3 text-subtle"}`}>{i < stage ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="text-[10px] tnum">{i + 1}</span>}</span>
                {s === "Running futures" ? `Running ${paths.toLocaleString()} futures` : s}
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={<span><Link href="/simulations" className="hover:text-ink">Simulations</Link> / Configure</span>} title="Simulation Studio" description="Confirm what's being compared, pick a goal to track, then run the Monte Carlo engine." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="label">Current plan</div>
          <div className="mt-1 text-[18px] font-extrabold tracking-tight">Your Financial Twin as it is today</div>
          <KeyValue className="mt-3" rows={[{ k: "Net worth", v: formatMoney(metrics.netWorth, c) }, { k: "Monthly income", v: formatMoney(metrics.income, c) }, { k: "Monthly expenses", v: formatMoney(metrics.expenses, c) }, { k: "Monthly savings", v: formatMoney(metrics.savings, c) }]} />
        </Card>
        <Card dark>
          <div className="label text-ink-fg/55">vs Scenario</div>
          <div className="mt-1 text-[18px] font-extrabold tracking-tight text-accent">{scenario?.name ?? "No scenario — baseline only"}</div>
          {scenario?.description && <p className="mt-1 text-[12.5px] text-ink-fg/60">{scenario.description}</p>}
          <ul className="mt-3 space-y-1.5 text-[12.5px]">{describeParams(scenario?.params ?? {}, c).map((l) => <li key={l} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 pill bg-accent" />{l}</li>)}</ul>
          {!scenario && <Link href="/scenarios" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-accent">Choose a scenario <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        </Card>
      </div>
      <Card className="mt-5 space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[12.5px] font-semibold">Goal to track</div>
            <Select value={goalId ?? ""} onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : null)}><option value="">No goal</option>{goals.map((g) => <option key={g.id} value={g.id}>{g.name} · {formatMoney(g.targetAmount, c, { compact: true })}</option>)}</Select>
          </div>
          <Slider label="Horizon" min={1} max={30} value={horizon} onChange={setHorizon} display={`${horizon} years`} />
        </div>
        <div>
          <div className="mb-2 text-[12.5px] font-semibold">Paths</div>
          <SegmentedControl layoutId="sim-paths" value={String(paths)} onChange={(v) => setPaths(Number(v))} options={[100, 300, 600, 1000, 5000].map((n) => ({ value: String(n), label: n.toLocaleString() }))} />
        </div>
        <KeyValue rows={[{ k: "Assumptions", v: `Inflation ${formatPct(econ.inflation, 0)} · Income growth ${formatPct(econ.incomeGrowth, 0)} · Return ${formatPct(econ.investmentReturn, 0)} ± ${formatPct(econ.volatility, 0)}` }]} />
        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="text-[12px] text-muted">Results are percentiles across simulated paths — a range, not a prediction.</div>
          <Button variant="accent" size="lg" onClick={run} icon={<Play className="h-4 w-4" />}>Run Simulation</Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Results ---------------- */
export function SimulationResultsView({ currency: c, sim, results: r, scenario, simTwin, params, tab }: { currency: string; sim: { id: number; name: string; createdAt: string; paths: number; horizonYears: number; goalName: string | null }; results: SimResults; scenario: { id: number; name: string } | null; simTwin: SimTwin; params: ScenarioParams; tab: string }) {
  const base = `/simulations/${sim.id}`;
  const tabs = [{ href: base, label: "Overview" }, { href: `${base}?tab=distribution`, label: "Distribution" }, { href: `${base}?tab=risk`, label: "Risk" }, { href: `${base}?tab=sensitivity`, label: "Sensitivity" }, { href: `${base}?tab=model`, label: "Model context" }];
  const current = tab === "overview" ? base : `${base}?tab=${tab}`;
  const bl = r.baseline;
  const delta = bl ? r.final.p50 - bl.finalP50 : null;
  const pctiles = { p5: r.final.p5, p15: r.final.p15, p25: r.final.p25, p50: r.final.p50, p75: r.final.p75, p85: r.final.p85, p95: r.final.p95 };

  return (
    <>
      <PageHeader
        eyebrow={<span><Link href="/simulations" className="hover:text-ink">Simulations</Link> / #{sim.id}</span>}
        title={sim.name}
        description={<span className="inline-flex flex-wrap items-center gap-2">{sim.paths.toLocaleString()} paths · {sim.horizonYears}-year horizon · {relativeTime(sim.createdAt)}{sim.goalName && <Chip>Goal: {sim.goalName}</Chip>}<StatusBadge tone={r.risk.level === "low" ? "good" : r.risk.level === "moderate" ? "accent" : "warn"} className="capitalize">{r.risk.level} risk</StatusBadge></span>}
        actions={<><Button variant="secondary" href="/simulations/compare" icon={<GitCompare className="h-4 w-4" />}>Compare</Button><Button variant="secondary" href={`/reports/new?simulation=${sim.id}`} icon={<FileText className="h-4 w-4" />}>Report</Button><Button href={`/ai?q=${encodeURIComponent(`Explain the “${sim.name}” simulation result`)}`} icon={<Sparkles className="h-4 w-4" />}>Ask AI to explain</Button></>}
      />
      <PillTabs items={tabs} current={current} layoutId="sim-tabs" className="mb-5" />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: EASE_OUT }}>
          {tab === "overview" && (
            <Stagger stagger={0.08} className="space-y-5">
              <StaggerItem>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                  <MetricCard dark label="Expected Net Worth" value={r.final.p50} format={(n) => formatMoney(n, c, { compact: true })} hint="Median of simulated final net worth." delta={delta !== null ? <span className={delta >= 0 ? "text-accent" : "text-warn"}>{formatMoney(delta, c, { compact: true, sign: true })} vs current plan</span> : <span className="text-accent">Mean {formatMoney(r.final.mean, c, { compact: true })}</span>} />
                  <MetricCard label="Goal Probability" value={(r.goal?.probability ?? 0) * 100} format={(n) => (r.goal ? `${Math.round(n)}%` : "—")} delay={0.1} delta={r.goal ? `${r.goal.name} · was ${bl?.goalProbability != null ? Math.round(bl.goalProbability * 100) + "%" : "—"}` : "No goal tracked"} deltaTone={r.goal && bl?.goalProbability != null ? (r.goal.probability >= bl.goalProbability ? "good" : "warn") : "neutral"} />
                  <MetricCard label="Emergency Fund Survival" display={formatMonths(r.risk.emergencySurvivalMonths)} delta="essential expenses, no income" />
                  <MetricCard label="Cash Shortfall" value={r.risk.shortfallProbability * 100} format={(n) => `${Math.round(n)}%`} delay={0.2} deltaTone={r.risk.shortfallProbability > 0.15 ? "warn" : "good"} delta={r.risk.medianShortfall > 0 ? `median ${formatMoney(r.risk.medianShortfall, c, { compact: true })}` : "of paths run dry"} />
                  <MetricCard label="Monthly Cash Flow" value={r.cashFlow.month12Median} format={(n) => formatMoney(n, c, { sign: true })} delay={0.3} delta={`year 1 · ${formatMoney(r.cashFlow.month12P10, c, { compact: true })} to ${formatMoney(r.cashFlow.month12P90, c, { compact: true })}`} />
                </div>
              </StaggerItem>
              <StaggerItem>
                <Card>
                  <CardTitle hint="Median (amber), mean (dotted ink), 25–75 band (amber fill), 5–95 band (hatched). Dashed grey is your current plan.">Future distribution</CardTitle>
                  <FanChart series={r.series} baseline={bl?.p50 ?? null} currency={c} height={320} goalTarget={r.goal?.target} goalMonth={r.goal?.month} />
                </Card>
              </StaggerItem>
              <StaggerItem>
                <div className="grid gap-5 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardTitle>Percentile distribution at horizon</CardTitle>
                    <Histogram bins={r.histogram} percentiles={pctiles} currency={c} height={160} />
                  </Card>
                  <Card>
                    <CardTitle>What changed</CardTitle>
                    <ul className="space-y-1.5 text-[12.5px]">{describeParams(params, c).map((l) => <li key={l} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 pill bg-accent" />{l}</li>)}</ul>
                    {scenario && <Link href={`/scenarios/${scenario.id}`} className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold">Edit scenario <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
                  </Card>
                </div>
              </StaggerItem>
            </Stagger>
          )}
          {tab === "distribution" && (
            <div className="space-y-5">
              <Card>
                <CardTitle>Percentiles of final net worth</CardTitle>
                <div className="grid grid-cols-4 gap-3 md:grid-cols-7">
                  {(Object.entries(pctiles) as [string, number][]).map(([k, v]) => (
                    <div key={k} className={`rounded-2xl p-3 ${k === "p50" ? "bg-ink text-ink-fg" : "bg-card2"}`}><div className={`label-sm ${k === "p50" ? "text-ink-fg/60" : ""}`}>{k.slice(1)}th</div><div className={`mt-1 text-[15px] font-extrabold tnum ${k === "p50" ? "text-accent" : ""}`}>{formatMoney(v, "", { compact: true })}</div></div>
                  ))}
                </div>
                <Histogram className="mt-6" bins={r.histogram} percentiles={pctiles} currency={c} height={220} />
              </Card>
              <Card>
                <CardTitle>Range over time</CardTitle>
                <FanChart series={r.series} baseline={bl?.p50 ?? null} currency={c} height={300} />
              </Card>
            </div>
          )}
          {tab === "risk" && <RiskPanel r={r} c={c} />}
          {tab === "sensitivity" && <SensitivityExplorer r={r} c={c} simTwin={simTwin} params={params} />}
          {tab === "model" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card><CardTitle>Financial Twin · data used</CardTitle><KeyValue rows={[{ k: "Monthly income", v: formatMoney(simTwin.monthlyIncome, c) }, { k: "Monthly expenses (ex. debt)", v: formatMoney(simTwin.monthlyExpenses, c) }, { k: "Essential expenses", v: formatMoney(simTwin.essentialExpenses, c) }, { k: "Cash", v: formatMoney(simTwin.cash, c) }, { k: "Investments", v: formatMoney(simTwin.investments, c) }, { k: "Other assets", v: `${simTwin.assets.length} items` }, { k: "Liabilities", v: `${simTwin.liabilities.length} items` }]} /></Card>
              <Card><CardTitle>Economic assumptions applied</CardTitle><KeyValue rows={[{ k: "Inflation", v: formatPct(r.assumptions.inflation, 1) }, { k: "Income growth", v: formatPct(r.assumptions.incomeGrowth, 1) }, { k: "Expense growth", v: formatPct(r.assumptions.expenseGrowth, 1) }, { k: "Investment return", v: formatPct(r.assumptions.investmentReturn, 1) }, { k: "Volatility", v: formatPct(r.assumptions.volatility, 1) }, { k: "Horizon", v: `${r.assumptions.horizonYears} years` }]} /></Card>
              <Card><CardTitle>Monte Carlo</CardTitle><KeyValue rows={[{ k: "Paths", v: r.paths.toLocaleString() }, { k: "Monthly steps", v: r.months }, { k: "Seed", v: r.seed }, { k: "Return model", v: "Normal monthly returns" }, { k: "Income / expense noise", v: "Per-path growth deviation + monthly expense noise" }]} /></Card>
              <Card><CardTitle>Results reported</CardTitle><KeyValue rows={[{ k: "Percentiles", v: "5 · 15 · 25 · 50 · 75 · 85 · 95" }, { k: "Goal probability", v: "share of paths where the goal fund ≥ target at target month" }, { k: "Shortfall", v: "share of paths where liquid assets hit zero" }, { k: "Generated", v: new Date(sim.createdAt).toLocaleString("en-GB") }]} /></Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function RiskPanel({ r, c }: { r: SimResults; c: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card dark>
        <CardTitle><span className="text-ink-fg">Financial Risk</span></CardTitle>
        <div className="flex items-center gap-4">
          <CircularProgress value={r.risk.shortfallProbability} size={96} stroke={8} tone={r.risk.shortfallProbability > 0.15 ? "warn" : "accent"}><span className="text-[18px] font-extrabold tnum">{Math.round(r.risk.shortfallProbability * 100)}%</span></CircularProgress>
          <div><div className="text-[22px] font-extrabold capitalize">{r.risk.level}</div><div className="text-[12.5px] text-ink-fg/60">Probability that liquid assets are exhausted at least once during the horizon.</div></div>
        </div>
        <KeyValue dark className="mt-4" rows={[{ k: "Median shortfall (when it happens)", v: formatMoney(r.risk.medianShortfall, c) }, { k: "10th percentile of minimum liquidity", v: formatMoney(r.risk.minLiquidP10, c) }, { k: "Paths that never ran dry", v: formatPct(r.risk.emergencyNeverDepleted, 0) }]} />
      </Card>
      <Card>
        <CardTitle>Risk drivers</CardTitle>
        <div className="space-y-4">{r.risk.drivers.map((d, i) => (<div key={d.label}><div className="mb-1 flex justify-between text-[12.5px]"><span className="font-semibold">{d.label}</span><span className="tnum text-muted">{Math.round(d.weight * 100)}</span></div><ProgressBar value={d.weight} height={6} tone={i === 0 ? "accent" : "ink"} delay={i * 0.06} /><div className="mt-1 text-[11.5px] text-muted">{d.note}</div></div>))}</div>
      </Card>
      <Card>
        <CardTitle>Cash flow stress</CardTitle>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Month 1</div><div className="mt-1 text-[16px] font-extrabold tnum">{formatMoney(r.cashFlow.month1, c, { sign: true })}</div></div>
          <div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Year 1 median</div><div className="mt-1 text-[16px] font-extrabold tnum">{formatMoney(r.cashFlow.month12Median, c, { sign: true })}</div></div>
          <div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Year 1 10th pct</div><div className={`mt-1 text-[16px] font-extrabold tnum ${r.cashFlow.month12P10 < 0 ? "text-warn" : ""}`}>{formatMoney(r.cashFlow.month12P10, c, { sign: true })}</div></div>
        </div>
        <p className="mt-3 text-[12px] text-muted">Negative monthly cash flow is covered first from cash, then investments. Only then does a shortfall occur.</p>
      </Card>
      <Card>
        <CardTitle>Goal & emergency fund risk</CardTitle>
        <KeyValue rows={[{ k: r.goal ? `${r.goal.name} probability` : "Goal", v: r.goal ? `${Math.round(r.goal.probability * 100)}%` : "—" }, { k: "Median goal fund at date", v: r.goal ? formatMoney(r.goal.medianFund, c) : "—" }, { k: "Emergency fund lasts", v: formatMonths(r.risk.emergencySurvivalMonths) }, { k: "Reference buffer", v: "6 months of essential expenses" }]} />
      </Card>
    </div>
  );
}

function SensitivityExplorer({ r, c, simTwin, params }: { r: SimResults; c: string; simTwin: SimTwin; params: ScenarioParams }) {
  const a = r.assumptions;
  const [savingsPct, setSavingsPct] = useState(0);
  const [incomeGrowth, setIncomeGrowth] = useState(a.incomeGrowth);
  const [inflation, setInflation] = useState(a.expenseGrowth);
  const [ret, setRet] = useState(a.investmentReturn);
  const [expensesPct, setExpensesPct] = useState(0);
  const [costPct, setCostPct] = useState(0);
  const live = useMemo(() => {
    const tw: SimTwin = { ...simTwin, monthlyExpenses: simTwin.monthlyExpenses * (1 + expensesPct / 100) };
    const p: ScenarioParams = { ...params, savingsChangePct: (params.savingsChangePct ?? 0) + savingsPct, oneTimeCost: params.oneTimeCost ? params.oneTimeCost * (1 + costPct / 100) : params.oneTimeCost, extraMonthlyExpense: params.extraMonthlyExpense ? params.extraMonthlyExpense * (1 + costPct / 100) : params.extraMonthlyExpense };
    return runSimulation(tw, { ...a, incomeGrowth, expenseGrowth: inflation, inflation: inflation + 0.02, investmentReturn: ret }, p, { paths: 150, seed: r.seed });
  }, [simTwin, params, savingsPct, incomeGrowth, inflation, ret, expensesPct, costPct, a, r.seed]);
  const animated = useCountUp(live.final.p50, { duration: 450 });
  const animatedGoal = useCountUp((live.goal?.probability ?? 0) * 100, { duration: 450 });
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardTitle hint="Each bar shows how much the median final net worth moves when one input shifts by the stated amount, holding everything else constant.">Which assumptions matter most?</CardTitle>
        <div className="space-y-3">
          {r.sensitivity.map((s, i) => {
            const max = Math.max(1, ...r.sensitivity.map((x) => x.impact));
            return (
              <div key={s.key}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]"><span className="font-semibold">{s.label} <span className="text-muted">{s.shift}</span></span><span className="tnum font-bold">{formatMoney(s.impact, c, { compact: true })}</span></div>
                <div className="relative h-7 w-full rounded-xl bg-card2">
                  <motion.div className={`absolute left-1/2 top-0 h-full rounded-r-xl ${i === 0 ? "bg-accent" : "bg-ink/70"}`} initial={{ width: 0 }} animate={{ width: `${(Math.max(0, s.high - s.base) / max) * 50}%` }} transition={{ duration: 0.7, ease: EASE_OUT, delay: i * 0.05 }} />
                  <motion.div className={`absolute right-1/2 top-0 h-full rounded-l-xl ${i === 0 ? "bg-accent/60" : "bg-subtle/60"}`} initial={{ width: 0 }} animate={{ width: `${(Math.max(0, s.base - s.low) / max) * 50}%` }} transition={{ duration: 0.7, ease: EASE_OUT, delay: i * 0.05 }} />
                  <span className="absolute left-1/2 top-0 h-full w-px bg-ink" />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10.5px] tnum text-muted">{formatMoney(s.low, "", { compact: true })}</span>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] tnum text-muted">{formatMoney(s.high, "", { compact: true })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="space-y-4 lg:col-span-2">
        <Card dark>
          <div className="label text-ink-fg/55">Live median net worth</div>
          <div className="mt-1 text-[30px] font-extrabold tracking-tight tnum text-accent">{formatMoney(animated, c, { compact: true })}</div>
          <div className="text-[12px] text-ink-fg/60 tnum">stored result {formatMoney(r.final.p50, c, { compact: true })}{live.goal && <> · goal {Math.round(animatedGoal)}%</>}</div>
        </Card>
        <Card className="space-y-5">
          <Slider label="Monthly savings" min={-50} max={50} value={savingsPct} onChange={setSavingsPct} display={`${savingsPct > 0 ? "+" : ""}${savingsPct}%`} />
          <Slider label="Income growth" min={0} max={0.3} step={0.005} value={incomeGrowth} onChange={setIncomeGrowth} display={formatPct(incomeGrowth, 1)} />
          <Slider label="Inflation / expense growth" min={0} max={0.35} step={0.005} value={inflation} onChange={setInflation} display={formatPct(inflation, 1)} />
          <Slider label="Investment return" min={-0.05} max={0.3} step={0.005} value={ret} onChange={setRet} display={formatPct(ret, 1)} />
          <Slider label="Expenses" min={-30} max={30} value={expensesPct} onChange={setExpensesPct} display={`${expensesPct > 0 ? "+" : ""}${expensesPct}%`} />
          <Slider label="Scenario cost" min={-50} max={50} value={costPct} onChange={setCostPct} display={`${costPct > 0 ? "+" : ""}${costPct}%`} />
          <p className="text-[11.5px] text-muted">150-path live preview with the stored seed. Save a new simulation to persist a changed configuration.</p>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- History ---------------- */
export type SimRow = { id: number; name: string; createdAt: string; paths: number; horizonYears: number; status: string; scenarioId: number | null; finalP50: number | null; goalProbability: number | null; shortfall: number | null; riskLevel: string | null; baselineP50: number | null };

export function SimulationHistoryView({ currency: c, sims }: { currency: string; sims: SimRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<SimRow | null>(null);
  async function remove(id: number) {
    await fetch("/api/simulations", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSelected(null);
    toast({ title: "Simulation deleted" });
    router.refresh();
  }
  return (
    <>
      <PageHeader eyebrow="Simulation Lab · Simulations" title="Simulation History" description="Every run is stored with its assumptions, so results stay comparable as your Twin evolves." actions={<><Button variant="secondary" href="/simulations/compare" icon={<GitCompare className="h-4 w-4" />}>Compare</Button><Button href="/simulations/new" icon={<Play className="h-4 w-4" />}>New simulation</Button></>} />
      {sims.length === 0 ? (
        <EmptyState icon="Activity" title="No simulations yet" description="Run your current plan or a scenario to see the range of possible futures." action={<Button href="/simulations/new">Run a simulation</Button>} />
      ) : (
        <Card className="p-2">
          <div className="hidden grid-cols-[1fr_120px_120px_120px_110px_40px] gap-3 px-4 py-2 md:grid"><span className="label">Scenario</span><span className="label text-right">Median NW</span><span className="label text-right">Goal</span><span className="label text-right">Shortfall</span><span className="label">Risk</span><span /></div>
          <ul className="divide-y divide-line">
            {sims.map((s, i) => (
              <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.04, duration: 0.35 }}>
                <button onClick={() => setSelected(s)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-card2 md:grid-cols-[1fr_120px_120px_120px_110px_40px]">
                  <span className="flex items-center gap-3 min-w-0"><span className="grid h-9 w-9 shrink-0 place-items-center pill bg-card3"><Icon name="Activity" className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-[13.5px] font-bold">{s.name}</span><span className="block text-[11.5px] text-muted">{s.paths.toLocaleString()} paths · {s.horizonYears}y · {relativeTime(s.createdAt)}</span></span></span>
                  <span className="text-right text-[13px] font-bold tnum">{s.finalP50 !== null ? formatMoney(s.finalP50, c, { compact: true }) : "—"}</span>
                  <span className="hidden text-right text-[13px] tnum md:block">{s.goalProbability !== null ? `${Math.round(s.goalProbability * 100)}%` : "—"}</span>
                  <span className="hidden text-right text-[13px] tnum md:block">{s.shortfall !== null ? `${Math.round(s.shortfall * 100)}%` : "—"}</span>
                  <span className="hidden md:block">{s.riskLevel && <StatusBadge tone={s.riskLevel === "low" ? "good" : s.riskLevel === "moderate" ? "accent" : "warn"} className="capitalize">{s.riskLevel}</StatusBadge>}</span>
                  <span className="hidden md:block"><StatusBadge tone="neutral" dot={false}>{s.status === "completed" ? "✓" : s.status}</StatusBadge></span>
                </button>
              </motion.li>
            ))}
          </ul>
        </Card>
      )}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Simulation details" footer={selected && <div className="flex gap-2"><Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => remove(selected.id)}>Delete</Button><Button className="flex-1" href={`/simulations/${selected.id}`}>Open results</Button></div>}>
        {selected && (
          <div>
            <div className="text-[20px] font-extrabold tracking-tight">{selected.name}</div>
            <div className="text-[12.5px] text-muted">{new Date(selected.createdAt).toLocaleString("en-GB")}</div>
            <KeyValue className="mt-4" rows={[{ k: "Median net worth", v: selected.finalP50 !== null ? formatMoney(selected.finalP50, c) : "—" }, { k: "vs current plan", v: selected.baselineP50 !== null && selected.finalP50 !== null ? formatMoney(selected.finalP50 - selected.baselineP50, c, { sign: true }) : "—" }, { k: "Goal probability", v: selected.goalProbability !== null ? `${Math.round(selected.goalProbability * 100)}%` : "—" }, { k: "Shortfall probability", v: selected.shortfall !== null ? `${Math.round(selected.shortfall * 100)}%` : "—" }, { k: "Horizon", v: `${selected.horizonYears} years` }, { k: "Paths", v: selected.paths.toLocaleString() }, { k: "Status", v: selected.status }]} />
          </div>
        )}
      </Drawer>
    </>
  );
}

/* ---------------- Compare ---------------- */
export function CompareView({ currency: c, sims }: { currency: string; sims: SimRow[] }) {
  const [ids, setIds] = useState<number[]>(sims.slice(0, Math.min(3, sims.length)).map((s) => s.id));
  const [focus, setFocus] = useState<number | null>(ids[0] ?? null);
  const chosen = sims.filter((s) => ids.includes(s.id));
  const toggle = (id: number) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id]));
  const rows = [
    { k: "Net Worth (median)", f: (s: SimRow) => (s.finalP50 !== null ? formatMoney(s.finalP50, c, { compact: true }) : "—") },
    { k: "Goal Probability", f: (s: SimRow) => (s.goalProbability !== null ? `${Math.round(s.goalProbability * 100)}%` : "—") },
    { k: "Cash Shortfall", f: (s: SimRow) => (s.shortfall !== null ? `${Math.round(s.shortfall * 100)}%` : "—") },
    { k: "Emergency Coverage", f: (s: SimRow) => (s.shortfall !== null ? `${Math.round((1 - s.shortfall) * 100)}% paths safe` : "—") },
    { k: "Risk", f: (s: SimRow) => s.riskLevel ?? "—" },
    { k: "Horizon · Paths", f: (s: SimRow) => `${s.horizonYears}y · ${s.paths.toLocaleString()}` },
  ];
  return (
    <>
      <PageHeader eyebrow="Simulation Lab · Comparison" title="Scenario Comparison" description="Select up to four simulations. Click a column to focus it." />
      <Card className="mb-5">
        <div className="flex flex-wrap gap-2">{sims.map((s) => <Checkbox key={s.id} checked={ids.includes(s.id)} onChange={() => toggle(s.id)} label={<span className="text-[12.5px]">{s.name} <span className="text-muted">· {relativeTime(s.createdAt)}</span></span>} className="rounded-xl border border-line bg-card2 px-3 py-2" />)}</div>
      </Card>
      {chosen.length === 0 ? (
        <EmptyState icon="GitCompare" title="Pick simulations to compare" compact />
      ) : (
        <div className="overflow-x-auto">
          <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(${chosen.length}, minmax(180px, 1fr))` }}>
            <div />
            {chosen.map((s) => (
              <motion.button layout key={s.id} onClick={() => setFocus(s.id)} className={`relative rounded-[20px] p-4 text-left transition-colors ${focus === s.id ? "bg-ink text-ink-fg shadow-panel" : "card hover:bg-card2"}`}>
                {focus === s.id && <motion.span layoutId="compare-focus" className="absolute -top-2 left-4 pill bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }}>Selected</motion.span>}
                <div className="text-[14px] font-bold leading-tight">{s.name}</div>
                <div className={`text-[11px] ${focus === s.id ? "text-ink-fg/60" : "text-muted"}`}>{relativeTime(s.createdAt)}</div>
              </motion.button>
            ))}
            {rows.map((row) => (
              <div key={row.k} className="contents">
                <div className="flex items-center text-[12.5px] font-semibold text-muted">{row.k}</div>
                {chosen.map((s) => (
                  <motion.div layout key={`${row.k}-${s.id}`} className={`rounded-2xl px-4 py-3 text-[14px] font-bold tnum capitalize ${focus === s.id ? "bg-accent/15" : "bg-card"}`}>{row.f(s)}</motion.div>
                ))}
              </div>
            ))}
            <div />
            {chosen.map((s) => (
              <div key={`open-${s.id}`}><Button size="sm" variant="secondary" href={`/simulations/${s.id}`} className="w-full">Open</Button></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function useQueryTab() {
  const sp = useSearchParams();
  return sp.get("tab") ?? "overview";
}
