"use client";

import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { Stagger, StaggerItem } from "../motion/stagger";
import { MetricCard, Card, CardTitle, KeyValue } from "../ui/card";
import { StatusBadge, AccentChip } from "../ui/pill";
import { FanChart } from "../charts/fan-chart";
import { InsightCard } from "../domain/cards";
import { Icon } from "../ui/states";
import { ProgressBar } from "../motion/progress";
import { formatMoney, formatMonths, formatPct, relativeTime } from "@/lib/format";
import type { TwinMetrics } from "@/lib/finance";
import type { EconAssumptions, SimResults } from "@/lib/simulation";
import { Button } from "../ui/button";

type SimRow = { id: number; name: string; createdAt: string; paths: number; horizonYears: number; finalP50: number | null; goalProbability: number | null; riskLevel: string | null };
type GoalRow = { id: number; name: string; targetAmount: number; currentAmount: number; targetDate: string };

const WHAT_IF = [
  { key: "lose-job", label: "Lose Job", icon: "Briefcase", hint: "6 months without income" },
  { key: "save-more", label: "Increase Savings", icon: "PiggyBank", hint: "+15% every month" },
  { key: "buy-home", label: "Buy Home", icon: "Home", hint: "20% down in 2 years" },
  { key: "high-inflation", label: "Inflation Shock", icon: "Flame", hint: "Prices +22% a year" },
];

export function OverviewView({ user, metrics: m, econ, emergencySavings, goals, baseline, simulations }: { user: { name: string; currency: string }; metrics: TwinMetrics; econ: EconAssumptions; emergencySavings: number; goals: GoalRow[]; baseline: SimResults; simulations: SimRow[] }) {
  const c = user.currency;
  const stabilityTone = m.stability === "stable" ? "good" : m.stability === "watch" ? "warn" : "bad";
  const topSens = baseline.sensitivity[0];
  const primaryGoal = goals[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Stagger stagger={0.07} className="space-y-5">
      <StaggerItem>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label mb-2">Financial Life · Overview</div>
            <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight leading-[1.05]">
              {greeting}, {user.name.split(" ")[0]}.
            </h1>
            <p className="mt-2 text-[13.5px] text-muted">Your Financial Twin as of today. Change one thing to see what could happen next.</p>
          </div>
          <div className="flex items-center gap-2">
            <AccentChip>{m.stabilityNote}</AccentChip>
            <Button href="/scenarios" icon={<Play className="h-4 w-4" />}>
              Simulate a decision
            </Button>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <MetricCard label="Net Worth" value={m.netWorth} format={(n) => formatMoney(n, c)} dark size="md" delta={<span className="text-accent">Assets {formatMoney(m.totalAssets, c, { compact: true })} · Debt {formatMoney(m.totalDebt, c, { compact: true })}</span>} href="/twin" />
          <MetricCard label="Monthly Income" value={m.income} format={(n) => formatMoney(n, c)} delay={0.1} delta={<span>+{formatPct(econ.incomeGrowth, 0)} assumed growth</span>} />
          <MetricCard label="Expenses" value={m.expenses} format={(n) => formatMoney(n, c)} delay={0.2} delta={<span>Essential {formatMoney(m.essential, c, { compact: true })} · Flexible {formatMoney(m.flexible, c, { compact: true })}</span>} />
          <MetricCard label="Savings" value={m.savings} format={(n) => formatMoney(n, c)} delay={0.3} deltaTone="good" delta={<span>{formatPct(m.savingsRate, 1)} savings rate</span>} />
          <MetricCard label="Financial Stability" display={<span className="capitalize">{m.stability}</span>} delta={<StatusBadge tone={stabilityTone}>{formatMonths(m.emergencyCoverage)} covered</StatusBadge>} href="/health" />
        </div>
      </StaggerItem>

      <div className="grid gap-5 xl:grid-cols-3">
        <StaggerItem className="xl:col-span-2">
          <Card className="h-full">
            <CardTitle hint="Each line is a percentile across simulated futures using your current assumptions. Hatched area shows the 5th–95th percentile range." action={<Link href="/simulations" className="text-[12px] font-bold text-muted hover:text-ink inline-flex items-center gap-1">All simulations <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
              Future Projection · {econ.horizonYears} years
            </CardTitle>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div>
                <div className="label-sm">Median net worth</div>
                <div className="text-[24px] font-extrabold tracking-tight tnum">{formatMoney(baseline.final.p50, c, { compact: true })}</div>
              </div>
              <div>
                <div className="label-sm">Stress (5th)</div>
                <div className="text-[16px] font-bold tnum text-muted">{formatMoney(baseline.final.p5, c, { compact: true })}</div>
              </div>
              <div>
                <div className="label-sm">Optimistic (95th)</div>
                <div className="text-[16px] font-bold tnum text-muted">{formatMoney(baseline.final.p95, c, { compact: true })}</div>
              </div>
              <div className="ml-auto text-[11.5px] text-subtle">{baseline.paths} simulated paths · not a forecast</div>
            </div>
            <FanChart series={baseline.series} currency={c} height={280} />
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card dark className="h-full">
            <CardTitle className="text-ink-fg">
              <span className="text-ink-fg">Financial Risk</span>
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-[30px] font-extrabold tracking-tight capitalize">{baseline.risk.level}</div>
              <StatusBadge tone={baseline.risk.level === "low" ? "good" : baseline.risk.level === "moderate" ? "accent" : "warn"}>{Math.round(baseline.risk.shortfallProbability * 100)}% shortfall probability</StatusBadge>
            </div>
            <p className="mt-1 text-[12px] text-ink-fg/60">Share of simulated paths that run out of liquid assets at any point.</p>
            <div className="mt-5 space-y-3.5">
              {baseline.risk.drivers.slice(0, 4).map((d, i) => (
                <div key={d.label}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-semibold">{d.label}</span>
                    <span className="tnum text-ink-fg/60">{Math.round(d.weight * 100)}</span>
                  </div>
                  <ProgressBar value={d.weight} height={5} tone={i === 0 ? "accent" : "muted"} delay={i * 0.08} />
                  <div className="mt-1 text-[11px] text-ink-fg/50">{d.note}</div>
                </div>
              ))}
            </div>
            <KeyValue dark className="mt-4" rows={[{ k: "Emergency fund lasts", v: formatMonths(baseline.risk.emergencySurvivalMonths) }, { k: "Emergency savings", v: formatMoney(emergencySavings, c) }, { k: "Debt-to-income", v: formatPct(m.debtToIncome, 0) }]} />
          </Card>
        </StaggerItem>
      </div>

      <StaggerItem>
        <Card>
          <CardTitle action={<Link href="/scenarios" className="text-[12px] font-bold text-muted hover:text-ink">Scenario library</Link>}>What if…</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WHAT_IF.map((w) => (
              <Link key={w.key} href={`/scenarios/new?template=${w.key}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-card2 p-3.5 transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-card press focus-ring">
                <span className="grid h-10 w-10 place-items-center pill bg-ink text-ink-fg transition-transform group-hover:translate-x-0.5">
                  <Icon name={w.icon} className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-[13.5px] font-bold">{w.label}</span>
                  <span className="block text-[11.5px] text-muted">{w.hint}</span>
                </span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <div className="grid gap-4 md:grid-cols-3">
          <InsightCard
            icon="ShieldCheck"
            title="Emergency coverage"
            kpi={formatMonths(m.emergencyCoverage)}
            kpiLabel="of essential expenses"
            tone={m.emergencyCoverage >= 6 ? "good" : m.emergencyCoverage >= 3 ? "warn" : "bad"}
            text={m.emergencyCoverage >= 6 ? "Your buffer meets the six-month reference under the current model." : `Reaching six months would require about ${formatMoney(Math.max(0, m.essential * 6 - emergencySavings), c)} more in emergency savings.`}
            href="/ai?q=How%20long%20could%20my%20savings%20cover%20my%20expenses%3F"
            cta="Ask AI to explain"
          />
          {primaryGoal && baseline.goal ? (
            <InsightCard icon="Target" title={primaryGoal.name} kpi={`${Math.round(baseline.goal.probability * 100)}%`} kpiLabel="simulated probability by target date" tone={baseline.goal.probability >= 0.65 ? "good" : baseline.goal.probability >= 0.4 ? "warn" : "bad"} text={`Under the selected assumptions the median simulated fund at the target date is ${formatMoney(baseline.goal.medianFund, c, { compact: true })} against a ${formatMoney(baseline.goal.target, c, { compact: true })} target.`} href={`/goals/${primaryGoal.id}/planner`} cta="Open goal planner" />
          ) : (
            <InsightCard icon="Target" title="No goal yet" text="Give your future something to measure. Goals become testable through scenarios." href="/goals/new" cta="Add a goal" />
          )}
          {topSens && <InsightCard icon="SlidersHorizontal" title="Most sensitive assumption" kpi={topSens.label} kpiLabel={`${topSens.shift} swings median by ${formatMoney(topSens.impact, c, { compact: true })}`} tone="accent" text="Small changes in this input move your projected outcome the most. Check whether the assumption still reflects your situation." href="/economy" cta="Review assumptions" />}
        </div>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <CardTitle action={<Link href="/simulations" className="text-[12px] font-bold text-muted hover:text-ink">History</Link>}>Recent Simulations</CardTitle>
          {simulations.length === 0 ? (
            <div className="rounded-2xl bg-card2 p-6 text-center text-[13px] text-muted">Test a decision before you make it. Your first simulation will appear here.</div>
          ) : (
            <ul className="divide-y divide-line">
              {simulations.map((s) => (
                <li key={s.id}>
                  <Link href={`/simulations/${s.id}`} className="flex items-center gap-4 py-3 transition-colors hover:bg-card2 rounded-2xl px-2 -mx-2">
                    <span className="grid h-9 w-9 place-items-center pill bg-card3">
                      <Icon name="Activity" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold">{s.name}</div>
                      <div className="text-[11.5px] text-muted">
                        {s.paths} paths · {s.horizonYears} years · {relativeTime(s.createdAt)}
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-[13px] font-bold tnum">{s.finalP50 !== null ? formatMoney(s.finalP50, c, { compact: true }) : "—"}</div>
                      <div className="text-[11px] text-muted">median net worth</div>
                    </div>
                    {s.goalProbability !== null && <StatusBadge tone={s.goalProbability >= 0.65 ? "good" : s.goalProbability >= 0.4 ? "warn" : "bad"}>{Math.round(s.goalProbability * 100)}% goal</StatusBadge>}
                    <ArrowUpRight className="h-4 w-4 text-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </StaggerItem>
    </Stagger>
  );
}
