"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { Card, CardTitle, MetricCard, PageHeader, KeyValue } from "../ui/card";
import { Button } from "../ui/button";
import { PillTabs, StatusBadge } from "../ui/pill";
import { Stagger, StaggerItem } from "../motion/stagger";
import { ProgressBar, CircularProgress } from "../motion/progress";
import { GroupedBars, HBars, Donut, LineChart, Sparkline } from "../charts/charts";
import { Icon } from "../ui/states";
import { formatMoney, formatPct, formatMonths } from "@/lib/format";
import { CATEGORY_LABEL, ESSENTIAL_KEYS, type TwinMetrics } from "@/lib/finance";

export type MonthRow = { label: string; income: number; expense: number; transfer: number; byCategory: Record<string, number> };

const TABS = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/net-worth", label: "Net Worth" },
  { href: "/analytics/cash-flow", label: "Cash Flow" },
  { href: "/analytics/spending", label: "Spending" },
  { href: "/analytics/debt", label: "Debt" },
  { href: "/analytics/savings", label: "Savings" },
];

export function AnalyticsShell({ current, title, description, children }: { current: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Intelligence · Analytics" title={title} description={description} />
      <PillTabs items={TABS} current={current} layoutId="analytics-tabs" className="mb-5" />
      {children}
    </>
  );
}

type Common = { currency: string; metrics: TwinMetrics; months: MonthRow[]; netWorthHistory: { label: string; value: number }[] };

export function AnalyticsOverview({ currency: c, metrics: m, months, netWorthHistory, goals }: Common & { goals: { name: string; progress: number }[] }) {
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const catTotals = aggregateCategories(months);
  return (
    <AnalyticsShell current="/analytics" title="Financial Analytics" description="Level 1: what happened. Level 2: why. Each panel links deeper.">
      <Stagger stagger={0.06} className="space-y-5">
        <StaggerItem>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard dark label="Net Worth" value={m.netWorth} format={(n) => formatMoney(n, c)} href="/analytics/net-worth" delta={<span className="text-accent">{netWorthHistory.length > 1 ? formatMoney(m.netWorth - netWorthHistory[0].value, c, { compact: true, sign: true }) + " over 6 months" : "Today"}</span>} />
            <MetricCard label="Cash Flow (recorded)" value={(last?.income ?? 0) - (last?.expense ?? 0)} format={(n) => formatMoney(n, c, { sign: true })} href="/analytics/cash-flow" delta={`this month · prev ${formatMoney((prev?.income ?? 0) - (prev?.expense ?? 0), c, { compact: true, sign: true })}`} />
            <MetricCard label="Spending (recorded)" value={last?.expense ?? 0} format={(n) => formatMoney(n, c)} href="/analytics/spending" deltaTone={(last?.expense ?? 0) > (prev?.expense ?? 0) ? "warn" : "good"} delta={prev ? `${formatPct(prev.expense ? (last.expense - prev.expense) / prev.expense : 0, 0, true)} vs last month` : "this month"} />
            <MetricCard label="Savings Rate (model)" value={m.savingsRate * 100} format={(n) => `${n.toFixed(1)}%`} href="/analytics/savings" deltaTone="good" delta={`${formatMoney(m.savings, c)} / month`} />
          </div>
        </StaggerItem>
        <div className="grid gap-5 lg:grid-cols-2">
          <StaggerItem><Card><CardTitle action={<Link href="/analytics/cash-flow" className="text-[12px] font-bold text-muted hover:text-ink">Details</Link>}>Income vs expenses</CardTitle><GroupedBars currency={c} height={190} groups={months.map((mo) => ({ label: mo.label, values: [{ key: "Income", value: mo.income, tone: "ink" }, { key: "Expenses", value: mo.expense, tone: "accent" }] }))} /></Card></StaggerItem>
          <StaggerItem><Card><CardTitle action={<Link href="/analytics/spending" className="text-[12px] font-bold text-muted hover:text-ink">Details</Link>}>Largest categories · 6 months</CardTitle><HBars currency={c} rows={catTotals.slice(0, 6).map((x, i) => ({ label: x.label, value: x.value, tone: i === 0 ? "accent" : "ink" }))} /></Card></StaggerItem>
          <StaggerItem><Card><CardTitle action={<Link href="/analytics/debt" className="text-[12px] font-bold text-muted hover:text-ink">Details</Link>}>Debt</CardTitle><div className="flex items-center gap-5"><CircularProgress value={Math.min(1, m.debtToIncome / 0.4)} size={84} stroke={8} tone={m.debtToIncome > 0.35 ? "warn" : "accent"}><span className="text-[13px] font-extrabold tnum">{formatPct(m.debtToIncome, 0)}</span></CircularProgress><KeyValue className="flex-1" rows={[{ k: "Total debt", v: formatMoney(m.totalDebt, c) }, { k: "Monthly payments", v: formatMoney(m.monthlyDebtPayments, c) }, { k: "Debt-to-income", v: formatPct(m.debtToIncome, 1) }]} /></div></Card></StaggerItem>
          <StaggerItem><Card><CardTitle action={<Link href="/goals" className="text-[12px] font-bold text-muted hover:text-ink">Goals</Link>}>Goal progress</CardTitle><div className="space-y-3">{goals.map((g, i) => <div key={g.name}><div className="mb-1 flex justify-between text-[12.5px]"><span className="font-semibold">{g.name}</span><span className="tnum font-bold">{formatPct(g.progress, 0)}</span></div><ProgressBar value={g.progress} height={6} delay={i * 0.08} /></div>)}{goals.length === 0 && <div className="text-[12.5px] text-muted">No goals yet.</div>}</div></Card></StaggerItem>
        </div>
      </Stagger>
    </AnalyticsShell>
  );
}

export function aggregateCategories(months: MonthRow[]) {
  const totals: Record<string, number> = {};
  for (const mo of months) for (const [k, v] of Object.entries(mo.byCategory)) totals[k] = (totals[k] ?? 0) + v;
  return Object.entries(totals).map(([k, value]) => ({ key: k, label: CATEGORY_LABEL[k] ?? k, value })).sort((a, b) => b.value - a.value);
}

export function NetWorthAnalytics({ currency: c, metrics: m, netWorthHistory, breakdown }: Common & { breakdown: { label: string; value: number; color: string }[] }) {
  return (
    <AnalyticsShell current="/analytics/net-worth" title="Net Worth Analytics" description="Assets, debt and how the balance has moved.">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardTitle>Net worth over time</CardTitle><LineChart points={netWorthHistory} currency={c} height={240} /><div className="mt-2 text-[11.5px] text-muted">Reconstructed from recorded transactions; non-liquid assets held constant.</div></Card>
        <Card><CardTitle>Composition</CardTitle><div className="flex items-center gap-4"><Donut segments={breakdown} size={140} centerLabel="Net" centerValue={formatMoney(m.netWorth, "", { compact: true })} /><ul className="space-y-1.5 text-[12.5px]">{breakdown.map((b) => <li key={b.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.color }} />{b.label}<span className="ml-auto pl-3 tnum font-bold">{formatMoney(b.value, "", { compact: true })}</span></li>)}</ul></div></Card>
        <Card className="lg:col-span-3"><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[{ k: "Cash", v: m.cash }, { k: "Investments", v: m.investments }, { k: "Property & other", v: m.otherAssets }, { k: "Debt", v: -m.totalDebt }].map((x) => <div key={x.k} className="rounded-2xl bg-card2 p-4"><div className="label-sm">{x.k}</div><div className={`mt-1 text-[20px] font-extrabold tnum ${x.v < 0 ? "text-bad" : ""}`}>{formatMoney(x.v, c)}</div></div>)}</div></Card>
      </div>
    </AnalyticsShell>
  );
}

export function CashFlowAnalytics({ currency: c, metrics: m, months }: Common) {
  const avgIncome = months.reduce((s, x) => s + x.income, 0) / Math.max(1, months.length);
  const avgExpense = months.reduce((s, x) => s + x.expense, 0) / Math.max(1, months.length);
  const avgTransfer = months.reduce((s, x) => s + x.transfer, 0) / Math.max(1, months.length);
  return (
    <AnalyticsShell current="/analytics/cash-flow" title="Cash Flow Analytics" description="Income, expenses, savings transfers and the net result each month.">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardTitle>Monthly layers</CardTitle><GroupedBars currency={c} height={240} groups={months.map((mo) => ({ label: mo.label, values: [{ key: "Income", value: mo.income, tone: "ink" }, { key: "Expenses", value: mo.expense, tone: "accent" }, { key: "Savings", value: mo.transfer, tone: "muted" }] }))} /></Card>
        <div className="space-y-4">
          <MetricCard dark label="Average net cash flow" value={avgIncome - avgExpense} format={(n) => formatMoney(n, c, { sign: true })} delta={<span className="text-accent">recorded · model says {formatMoney(m.savings, c, { sign: true })}</span>} />
          <Card><KeyValue rows={[{ k: "Avg income", v: formatMoney(avgIncome, c) }, { k: "Avg expenses", v: formatMoney(avgExpense, c) }, { k: "Avg savings transfers", v: formatMoney(avgTransfer, c) }, { k: "Modelled savings rate", v: formatPct(m.savingsRate, 1) }]} /></Card>
        </div>
        <Card className="lg:col-span-3"><CardTitle>Net by month</CardTitle><div className="grid grid-cols-3 gap-3 md:grid-cols-6">{months.map((mo) => { const net = mo.income - mo.expense; return <div key={mo.label} className="rounded-2xl bg-card2 p-3"><div className="label-sm">{mo.label}</div><div className={`mt-1 text-[16px] font-extrabold tnum ${net < 0 ? "text-bad" : ""}`}>{formatMoney(net, "", { compact: true, sign: true })}</div></div>; })}</div></Card>
      </div>
    </AnalyticsShell>
  );
}

export function SpendingAnalytics({ currency: c, months }: Common) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const cats = aggregateCategories(months);
  const total = cats.reduce((s, x) => s + x.value, 0);
  const essential = cats.filter((x) => ESSENTIAL_KEYS.has(x.key)).reduce((s, x) => s + x.value, 0);
  const recurring = cats.filter((x) => ["housing", "utilities", "subscriptions", "debt", "family"].includes(x.key)).reduce((s, x) => s + x.value, 0);
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const changes = cats.map((x) => ({ ...x, delta: (last?.byCategory[x.key] ?? 0) - (prev?.byCategory[x.key] ?? 0) })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
  return (
    <AnalyticsShell current="/analytics/spending" title="Spending Analytics" description="Click a category to open the matching transactions.">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardTitle>Categories · 6 months</CardTitle><HBars currency={c} selected={selected} onSelect={(k) => { setSelected(k); router.push(`/transactions?category=${k}`); }} rows={cats.map((x, i) => ({ key: x.key, label: x.label, value: x.value, tone: i === 0 ? "accent" : ESSENTIAL_KEYS.has(x.key) ? "ink" : "muted" }))} /></Card>
        <div className="space-y-4">
          <Card dark><div className="label text-ink-fg/55">Essential vs discretionary</div><div className="mt-2 text-[26px] font-extrabold tnum">{formatPct(total ? essential / total : 0, 0)} <span className="text-[13px] font-semibold text-ink-fg/60">essential</span></div><ProgressBar value={total ? essential / total : 0} className="mt-3" /><KeyValue dark className="mt-3" rows={[{ k: "Essential", v: formatMoney(essential, c, { compact: true }) }, { k: "Discretionary", v: formatMoney(total - essential, c, { compact: true }) }, { k: "Recurring", v: formatMoney(recurring, c, { compact: true }) }]} /></Card>
          <Card><CardTitle>Monthly changes</CardTitle><ul className="space-y-2">{changes.map((x) => <li key={x.key} className="flex items-center justify-between text-[12.5px]"><span className="font-semibold">{x.label}</span><span className={`tnum font-bold ${x.delta > 0 ? "text-warn" : "text-good"}`}>{formatMoney(x.delta, "", { compact: true, sign: true })}</span></li>)}</ul></Card>
        </div>
      </div>
    </AnalyticsShell>
  );
}

export function DebtAnalytics({ currency: c, metrics: m, liabilities, cardDebt }: { currency: string; metrics: TwinMetrics; liabilities: { name: string; balance: number; monthlyPayment: number; interestRate: number; remainingMonths: number }[]; cardDebt: number }) {
  const payoff = m.monthlyDebtPayments > 0 ? m.totalDebt / m.monthlyDebtPayments : 0;
  const trend = Array.from({ length: 13 }, (_, i) => Math.max(0, m.totalDebt - m.monthlyDebtPayments * i * 0.85));
  return (
    <AnalyticsShell current="/analytics/debt" title="Debt Analytics" description="Balances, payments and how fast they clear under the current plan.">
      <div className="grid gap-5 lg:grid-cols-3">
        <MetricCard dark label="Total Debt" value={m.totalDebt} format={(n) => formatMoney(n, c)} delta={<span className="text-accent">{liabilities.length} loans · {formatMoney(cardDebt, c, { compact: true })} on cards</span>} />
        <MetricCard label="Monthly Payments" value={m.monthlyDebtPayments} format={(n) => formatMoney(n, c)} delta={`${formatPct(m.debtToIncome, 0)} of income`} deltaTone={m.debtToIncome > 0.35 ? "warn" : "good"} />
        <MetricCard label="Approx. Payoff" display={formatMonths(payoff)} delta="at current payments, ignoring new borrowing" />
        <Card className="lg:col-span-2"><CardTitle>Debt trend · next 12 months</CardTitle><Sparkline data={trend} width={600} height={140} className="w-full" color="var(--ink)" /><div className="mt-2 flex justify-between text-[11px] text-subtle"><span>Today</span><span>+12 months</span></div></Card>
        <Card><CardTitle>Debt-to-income context</CardTitle><div className="flex items-center gap-4"><CircularProgress value={Math.min(1, m.debtToIncome / 0.4)} size={84} stroke={8} tone={m.debtToIncome > 0.35 ? "warn" : "accent"}><span className="text-[13px] font-extrabold tnum">{formatPct(m.debtToIncome, 0)}</span></CircularProgress><p className="text-[12px] text-muted">Below 20% is generally comfortable; above 35% leaves little room for shocks. This is context, not a verdict.</p></div><Button href="/scenarios/new?template=spend-less" className="mt-4 w-full" icon={<Play className="h-4 w-4" />}>Simulate Debt Payoff</Button></Card>
        <Card className="lg:col-span-3"><CardTitle>Liabilities</CardTitle><ul className="divide-y divide-line">{liabilities.map((l) => <li key={l.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13px]"><span className="font-semibold">{l.name}</span><span className="text-muted tnum">{formatMoney(l.monthlyPayment, c)}/mo · {formatPct(l.interestRate, 1)} · {l.remainingMonths} months</span><span className="tnum font-bold">{formatMoney(l.balance, c)}</span></li>)}{cardDebt > 0 && <li className="flex items-center justify-between py-2.5 text-[13px]"><span className="font-semibold">Credit cards</span><span className="tnum font-bold">{formatMoney(cardDebt, c)}</span></li>}{liabilities.length === 0 && cardDebt === 0 && <li className="py-3 text-[12.5px] text-muted">No debt recorded.</li>}</ul></Card>
      </div>
    </AnalyticsShell>
  );
}

export function SavingsAnalytics({ currency: c, metrics: m, months, emergencySavings }: Common & { emergencySavings: number }) {
  const transfers = months.map((mo) => ({ label: mo.label, value: mo.transfer }));
  return (
    <AnalyticsShell current="/analytics/savings" title="Savings Analytics" description="Savings rate, transfers and the emergency buffer.">
      <div className="grid gap-5 lg:grid-cols-3">
        <MetricCard dark label="Savings Rate" value={m.savingsRate * 100} format={(n) => `${n.toFixed(1)}%`} delta={<span className="text-accent">{formatMoney(m.savings, c)} per month (model)</span>} />
        <MetricCard label="Emergency Savings" value={emergencySavings} format={(n) => formatMoney(n, c)} delta={`${formatMonths(m.emergencyCoverage)} of essentials`} deltaTone={m.emergencyCoverage >= 6 ? "good" : "warn"} />
        <MetricCard label="Liquid Assets" value={m.liquid} format={(n) => formatMoney(n, c)} delta={`${formatPct(m.liquid ? m.investments / m.liquid : 0, 0)} invested`} />
        <Card className="lg:col-span-2"><CardTitle>Recorded savings transfers</CardTitle><LineChart points={transfers} currency={c} height={200} /></Card>
        <Card><CardTitle>Six-month buffer</CardTitle><CircularProgress value={Math.min(1, m.emergencyCoverage / 6)} size={120} stroke={10}><div className="text-center"><div className="text-[18px] font-extrabold tnum">{m.emergencyCoverage.toFixed(1)}</div><div className="label-sm">months</div></div></CircularProgress><p className="mt-3 text-[12px] text-muted">{m.emergencyCoverage >= 6 ? "You meet the six-month reference." : `About ${formatMoney(Math.max(0, m.essential * 6 - emergencySavings), c)} more would reach six months.`}</p></Card>
      </div>
    </AnalyticsShell>
  );
}

/* ---------------- Financial Health ---------------- */
export function HealthView({ currency: c, metrics: m, netWorthTrend, goalProgress, emergencySavings }: { currency: string; metrics: TwinMetrics; netWorthTrend: number; goalProgress: number; emergencySavings: number }) {
  const dims = [
    { key: "cash_flow", label: "Cash Flow", icon: "ArrowLeftRight", value: formatMoney(m.savings, c, { sign: true }), score: Math.min(1, Math.max(0, m.savingsRate / 0.3)), trend: m.savings >= 0 ? "Positive every modelled month" : "Negative — expenses exceed income", why: "Monthly surplus is what funds every goal and absorbs shocks.", href: "/analytics/cash-flow" },
    { key: "emergency", label: "Emergency Coverage", icon: "ShieldCheck", value: formatMonths(m.emergencyCoverage), score: Math.min(1, m.emergencyCoverage / 6), trend: `${formatMoney(emergencySavings, c, { compact: true })} set aside`, why: "Six months of essential expenses is the common reference buffer.", href: "/analytics/savings" },
    { key: "debt", label: "Debt Load", icon: "Landmark", value: formatPct(m.debtToIncome, 0), score: Math.min(1, Math.max(0, 1 - m.debtToIncome / 0.4)), trend: `${formatMoney(m.monthlyDebtPayments, c)} per month`, why: "Share of income committed to debt limits flexibility.", href: "/analytics/debt" },
    { key: "savings_rate", label: "Savings Rate", icon: "PiggyBank", value: formatPct(m.savingsRate, 1), score: Math.min(1, Math.max(0, m.savingsRate / 0.25)), trend: m.savingsRate >= 0.2 ? "Above the 20% reference" : "Below the 20% reference", why: "Drives how quickly net worth compounds.", href: "/analytics/savings" },
    { key: "goals", label: "Goal Progress", icon: "Target", value: formatPct(goalProgress, 0), score: goalProgress, trend: "Weighted across active goals", why: "Shows whether plans are translating into funded outcomes.", href: "/goals" },
    { key: "net_worth_trend", label: "Net Worth Trend", icon: "TrendingUp", value: formatMoney(netWorthTrend, c, { compact: true, sign: true }), score: Math.min(1, Math.max(0, 0.5 + netWorthTrend / Math.max(1, Math.abs(m.netWorth)) * 3)), trend: "Change over the recorded period", why: "The long-run signal that everything else feeds into.", href: "/analytics/net-worth" },
  ];
  return (
    <>
      <PageHeader eyebrow="Intelligence · Financial Health" title="Financial Health" description="Six measurable dimensions instead of one artificial score. Each shows its value, trend and why it matters." />
      <Stagger stagger={0.06} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dims.map((d, i) => (
          <StaggerItem key={d.key}>
            <Link href={d.href} className="card card-hover block h-full p-5">
              <div className="flex items-center gap-3"><CircularProgress value={d.score} size={56} stroke={6} tone={d.score >= 0.66 ? "good" : d.score >= 0.33 ? "accent" : "warn"} delay={i * 0.08}><Icon name={d.icon} className="h-4 w-4" /></CircularProgress><div><div className="label">{d.label}</div><div className="text-[24px] font-extrabold tracking-tight tnum leading-tight">{d.value}</div></div><ArrowUpRight className="ml-auto h-4 w-4 text-subtle" /></div>
              <div className="mt-3 flex items-center gap-2"><StatusBadge tone={d.score >= 0.66 ? "good" : d.score >= 0.33 ? "warn" : "bad"}>{d.score >= 0.66 ? "Healthy" : d.score >= 0.33 ? "Watch" : "Attention"}</StatusBadge><span className="text-[12px] text-muted">{d.trend}</span></div>
              <p className="mt-2 text-[12px] text-muted">{d.why}</p>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      <Card className="mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[14px] font-bold">Overall: <span className="capitalize">{m.stability}</span></div><div className="text-[12.5px] text-muted">{m.stabilityNote}</div></div><Button href="/ai?q=How%20long%20could%20my%20savings%20cover%20my%20expenses%3F" variant="secondary">Ask AI about coverage</Button></div></Card>
    </>
  );
}
