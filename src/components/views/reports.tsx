"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Download, Printer, FileSpreadsheet, Trash2 } from "lucide-react";
import { Card, CardTitle, PageHeader, KeyValue } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox, Field, Input, Select, Textarea, OptionCard } from "../ui/field";
import { StatusBadge } from "../ui/pill";
import { EmptyState, Icon } from "../ui/states";
import { ReportCard, REPORT_ICON } from "../domain/cards";
import { FanChart } from "../charts/fan-chart";
import { HBars } from "../charts/charts";
import { ProgressBar } from "../motion/progress";
import { Stagger, StaggerItem, EASE_OUT } from "../motion/stagger";
import { useToast } from "../motion/toast";
import { exportReport } from "@/lib/client-api";
import { formatMoney, formatPct, formatMonths, formatDate } from "@/lib/format";
import type { TwinMetrics } from "@/lib/finance";
import type { EconAssumptions, SimResults } from "@/lib/simulation";

const TYPES = [
  { key: "snapshot", label: "Financial Snapshot", hint: "Where you stand today" },
  { key: "twin", label: "Financial Twin", hint: "The full model, section by section" },
  { key: "scenario", label: "Scenario", hint: "One decision, its outcomes" },
  { key: "goal", label: "Goal", hint: "Progress and probability for a goal" },
  { key: "annual", label: "Annual Financial Report", hint: "A year in review" },
  { key: "simulation", label: "Simulation Summary", hint: "Percentiles, risk and sensitivity" },
];
const SECTIONS = [
  { key: "summary", label: "Executive Summary" },
  { key: "snapshot", label: "Financial Snapshot" },
  { key: "charts", label: "Charts" },
  { key: "goals", label: "Goals" },
  { key: "scenario", label: "Scenario Results" },
  { key: "assumptions", label: "Assumptions" },
  { key: "ai", label: "AI Explanation" },
  { key: "disclaimer", label: "Disclaimer" },
];

export function ReportsView({ reports }: { reports: { id: number; name: string; type: string; createdAt: string }[] }) {
  return (
    <>
      <PageHeader eyebrow="Reports · Center" title="Reports" description="Turn your financial model into a document — snapshots, scenarios, goals, or a full annual review." actions={<Button href="/reports/new" icon={<Plus className="h-4 w-4" />}>New report</Button>} />
      {reports.length === 0 ? (
        <EmptyState icon="FileText" title="Turn your financial model into a report" description="Reports can include simulation results, assumptions and AI explanations." action={<Button href="/reports/new">Build a report</Button>} />
      ) : (
        <Stagger stagger={0.05} className="space-y-3">
          {reports.map((r) => (
            <StaggerItem key={r.id}><ReportCard report={r} /></StaggerItem>
          ))}
        </Stagger>
      )}
      <Card className="mt-6">
        <CardTitle>Report types</CardTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TYPES.map((t) => (
            <Link key={t.key} href={`/reports/new?type=${t.key}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-card2 p-3 transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-card"><span className="grid h-9 w-9 place-items-center pill bg-card3 group-hover:bg-ink group-hover:text-ink-fg transition-colors"><Icon name={REPORT_ICON[t.key]} className="h-4 w-4" /></span><span><span className="block text-[13px] font-bold">{t.label}</span><span className="block text-[11px] text-muted">{t.hint}</span></span></Link>
          ))}
        </div>
      </Card>
    </>
  );
}

const STEPS = ["Report type", "Date range", "Sections", "Scenario", "Goals", "Notes", "Preview"];

export function ReportBuilder({ scenarios, goals, simulations }: { scenarios: { id: number; name: string }[]; goals: { id: number; name: string }[]; simulations: { id: number; name: string }[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState({ type: sp.get("type") ?? (sp.get("simulation") ? "simulation" : "snapshot"), range: "month", sections: ["summary", "snapshot", "charts", "goals", "assumptions", "disclaimer"], simulationId: (Number(sp.get("simulation")) || simulations[0]?.id || null) as number | null, scenarioId: (scenarios[0]?.id ?? null) as number | null, goalIds: goals.map((g) => g.id), notes: "" });
  const [saving, setSaving] = useState(false);
  const name = `${TYPES.find((t) => t.key === cfg.type)?.label ?? "Report"} — ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;

  async function create() {
    setSaving(true);
    const r = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, type: cfg.type, config: cfg }) });
    setSaving(false);
    if (!r.ok) return toast({ title: "Couldn't create report", tone: "warn" });
    const d = await r.json();
    toast({ title: "Your report is ready." });
    router.push(`/reports/${d.report.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={<span><Link href="/reports" className="hover:text-ink">Reports</Link> / Builder</span>} title="Report Builder" description="Choose what to include. The preview renders as a document you can print to PDF or export as data." />
      <ol className="mb-6 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {STEPS.map((s, i) => (
          <li key={s}><button onClick={() => setStep(i)} className={`relative pill px-3 py-1.5 text-[12px] font-semibold ${i === step ? "text-ink-fg" : i < step ? "text-ink" : "text-muted"}`}>{i === step && <motion.span layoutId="report-step" className="absolute inset-0 pill bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}<span className="relative z-10 inline-flex items-center gap-1">{i < step && <Check className="h-3 w-3" />}{s}</span></button></li>
        ))}
      </ol>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
          <Card className="space-y-4">
            {step === 0 && <div className="grid gap-2 sm:grid-cols-2">{TYPES.map((t) => <OptionCard key={t.key} selected={cfg.type === t.key} onClick={() => setCfg({ ...cfg, type: t.key })} title={t.label} hint={t.hint} icon={<Icon name={REPORT_ICON[t.key]} className="h-4 w-4" />} />)}</div>}
            {step === 1 && <Field label="Date range"><Select value={cfg.range} onChange={(e) => setCfg({ ...cfg, range: e.target.value })}><option value="month">This month</option><option value="quarter">Last 3 months</option><option value="half">Last 6 months</option><option value="year">Last 12 months</option></Select></Field>}
            {step === 2 && <div className="grid gap-2 sm:grid-cols-2">{SECTIONS.map((s) => <Checkbox key={s.key} checked={cfg.sections.includes(s.key)} onChange={(v) => setCfg({ ...cfg, sections: v ? [...cfg.sections, s.key] : cfg.sections.filter((x) => x !== s.key) })} label={s.label} className="rounded-xl border border-line bg-card2 px-3 py-2.5" />)}</div>}
            {step === 3 && <><Field label="Simulation to include"><Select value={cfg.simulationId ?? ""} onChange={(e) => setCfg({ ...cfg, simulationId: e.target.value ? Number(e.target.value) : null })}><option value="">None</option>{simulations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Scenario"><Select value={cfg.scenarioId ?? ""} onChange={(e) => setCfg({ ...cfg, scenarioId: e.target.value ? Number(e.target.value) : null })}><option value="">None</option>{scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field></>}
            {step === 4 && <div className="grid gap-2 sm:grid-cols-2">{goals.map((g) => <Checkbox key={g.id} checked={cfg.goalIds.includes(g.id)} onChange={(v) => setCfg({ ...cfg, goalIds: v ? [...cfg.goalIds, g.id] : cfg.goalIds.filter((x) => x !== g.id) })} label={g.name} className="rounded-xl border border-line bg-card2 px-3 py-2.5" />)}{goals.length === 0 && <div className="text-[12.5px] text-muted">No goals yet.</div>}</div>}
            {step === 5 && <Field label="Notes" hint="Appears in the executive summary."><Textarea value={cfg.notes} onChange={(e) => setCfg({ ...cfg, notes: e.target.value })} placeholder="Context for whoever reads this report…" /></Field>}
            {step === 6 && <div><div className="text-[16px] font-extrabold">{name}</div><KeyValue className="mt-3" rows={[{ k: "Type", v: TYPES.find((t) => t.key === cfg.type)?.label ?? "" }, { k: "Range", v: cfg.range }, { k: "Sections", v: `${cfg.sections.length} selected` }, { k: "Simulation", v: simulations.find((s) => s.id === cfg.simulationId)?.name ?? "None" }, { k: "Goals", v: `${cfg.goalIds.length}` }]} /></div>}
            <div className="flex justify-between border-t border-line pt-4"><Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>{step < STEPS.length - 1 ? <Button onClick={() => setStep((s) => s + 1)}>Continue</Button> : <Button variant="accent" onClick={create} loading={saving}>Generate report</Button>}</div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

type ExportState = "idle" | "preparing" | "generating" | "ready";

export function ReportPreview({ currency: c, report, user, metrics: m, econ, goals, simulation, aiText }: { currency: string; report: { id: number; name: string; type: string; createdAt: string; config: { sections?: string[]; notes?: string; range?: string } }; user: { name: string }; metrics: TwinMetrics; econ: EconAssumptions; goals: { id: number; name: string; targetAmount: number; currentAmount: number; targetDate: string }[]; simulation: { name: string; paths: number; horizonYears: number; results: SimResults } | null; aiText: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<ExportState>("idle");
  const sections = report.config.sections ?? SECTIONS.map((s) => s.key);
  const has = (k: string) => sections.includes(k);

  function exportPdf() {
    setState("preparing");
    setTimeout(() => setState("generating"), 700);
    setTimeout(() => {
      setState("ready");
      toast({ title: "Your report is ready.", description: "Opening the print dialog — choose “Save as PDF”." });
      window.print();
      setTimeout(() => setState("idle"), 2500);
    }, 1600);
  }
  async function remove() {
    await fetch("/api/reports", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: report.id }) });
    toast({ title: "Report deleted" });
    router.push("/reports");
    router.refresh();
  }
  const label = { idle: "Export PDF", preparing: "Preparing…", generating: "Generating…", ready: "Ready" }[state];

  return (
    <>
      <div className="no-print">
        <PageHeader eyebrow={<span><Link href="/reports" className="hover:text-ink">Reports</Link> / Preview</span>} title={report.name} description={`${TYPES.find((t) => t.key === report.type)?.label ?? report.type} · generated ${formatDate(report.createdAt, "long")}`} actions={<><Button variant="secondary" onClick={() => exportReport("csv")} icon={<FileSpreadsheet className="h-4 w-4" />}>CSV</Button><Button variant="secondary" onClick={() => exportReport("excel")} icon={<Download className="h-4 w-4" />}>Excel</Button><motion.div layout><Button onClick={exportPdf} loading={state === "preparing" || state === "generating"} variant={state === "ready" ? "accent" : "primary"} icon={state === "ready" ? <Check className="h-4 w-4" /> : <Printer className="h-4 w-4" />}>{label}</Button></motion.div><Button variant="ghost" onClick={remove} aria-label="Delete report"><Trash2 className="h-4 w-4" /></Button></>} />
      </div>
      <article className="mx-auto max-w-3xl space-y-6 rounded-[26px] bg-card p-8 shadow-card md:p-12 print:shadow-none">
        <header className="border-b border-line pb-6">
          <div className="label">FinTwin · {TYPES.find((t) => t.key === report.type)?.label}</div>
          <h1 className="mt-2 text-[32px] font-extrabold tracking-tight leading-tight">{report.name}</h1>
          <div className="mt-2 text-[12.5px] text-muted">Prepared for {user.name} · {formatDate(report.createdAt, "long")} · currency {c}</div>
        </header>
        {has("summary") && (
          <section><h2 className="text-[18px] font-extrabold tracking-tight">Executive Summary</h2><p className="mt-2 text-[13.5px] leading-relaxed text-muted">Monthly income of {formatMoney(m.income, c)} against {formatMoney(m.expenses, c)} of expenses leaves {formatMoney(m.savings, c)} ({formatPct(m.savingsRate, 0)} savings rate). Net worth stands at {formatMoney(m.netWorth, c)} with emergency savings covering {formatMonths(m.emergencyCoverage)} of essential expenses.{simulation ? ` Under the “${simulation.name}” simulation (${simulation.paths} paths, ${simulation.horizonYears} years) the median projected net worth is ${formatMoney(simulation.results.final.p50, c, { compact: true })}, with a 5th–95th percentile range of ${formatMoney(simulation.results.final.p5, c, { compact: true })} to ${formatMoney(simulation.results.final.p95, c, { compact: true })}.` : ""}</p>{report.config.notes && <p className="mt-2 rounded-2xl bg-card2 p-3 text-[13px] italic">{report.config.notes}</p>}</section>
        )}
        {has("snapshot") && (
          <section><h2 className="text-[18px] font-extrabold tracking-tight">Financial Snapshot</h2><div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">{[{ k: "Net worth", v: formatMoney(m.netWorth, c) }, { k: "Income", v: formatMoney(m.income, c) }, { k: "Expenses", v: formatMoney(m.expenses, c) }, { k: "Savings", v: formatMoney(m.savings, c) }, { k: "Assets", v: formatMoney(m.totalAssets, c) }, { k: "Debt", v: formatMoney(m.totalDebt, c) }, { k: "Liquid", v: formatMoney(m.liquid, c) }, { k: "Coverage", v: formatMonths(m.emergencyCoverage) }].map((x) => <div key={x.k} className="rounded-2xl bg-card2 p-3"><div className="label-sm">{x.k}</div><div className="mt-1 text-[16px] font-extrabold tnum">{x.v}</div></div>)}</div></section>
        )}
        {has("charts") && simulation && <section><h2 className="text-[18px] font-extrabold tracking-tight">Projection</h2><div className="mt-3"><FanChart series={simulation.results.series} baseline={simulation.results.baseline?.p50 ?? null} currency={c} height={240} animate={false} /></div></section>}
        {has("goals") && goals.length > 0 && <section><h2 className="text-[18px] font-extrabold tracking-tight">Goals</h2><div className="mt-3 space-y-3">{goals.map((g) => <div key={g.id}><div className="mb-1 flex justify-between text-[13px]"><span className="font-semibold">{g.name} <span className="text-muted">· {formatDate(g.targetDate, "month")}</span></span><span className="tnum font-bold">{formatMoney(g.currentAmount, c, { compact: true })} / {formatMoney(g.targetAmount, c, { compact: true })}</span></div><ProgressBar value={g.targetAmount ? g.currentAmount / g.targetAmount : 0} height={6} /></div>)}</div></section>}
        {has("scenario") && simulation && <section><h2 className="text-[18px] font-extrabold tracking-tight">Scenario Results · {simulation.name}</h2><div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">{[{ k: "Median net worth", v: formatMoney(simulation.results.final.p50, c, { compact: true }) }, { k: "Goal probability", v: simulation.results.goal ? `${Math.round(simulation.results.goal.probability * 100)}%` : "—" }, { k: "Shortfall probability", v: `${Math.round(simulation.results.risk.shortfallProbability * 100)}%` }, { k: "Risk", v: simulation.results.risk.level }].map((x) => <div key={x.k} className="rounded-2xl bg-card2 p-3"><div className="label-sm">{x.k}</div><div className="mt-1 text-[16px] font-extrabold tnum capitalize">{x.v}</div></div>)}</div><div className="mt-4"><HBars currency={c} rows={simulation.results.sensitivity.slice(0, 4).map((s, i) => ({ label: `${s.label} (${s.shift})`, value: s.impact, tone: i === 0 ? "accent" : "ink" }))} /></div></section>}
        {has("assumptions") && <section><h2 className="text-[18px] font-extrabold tracking-tight">Assumptions</h2><KeyValue className="mt-2" rows={[{ k: "Inflation", v: formatPct(econ.inflation, 1) }, { k: "Income growth", v: formatPct(econ.incomeGrowth, 1) }, { k: "Expense growth", v: formatPct(econ.expenseGrowth, 1) }, { k: "Investment return", v: formatPct(econ.investmentReturn, 1) }, { k: "Volatility", v: formatPct(econ.volatility, 1) }, { k: "Horizon", v: `${econ.horizonYears} years` }]} /></section>}
        {has("ai") && <section><h2 className="text-[18px] font-extrabold tracking-tight">AI Explanation</h2><p className="mt-2 rounded-2xl bg-card2 p-4 text-[13.5px] leading-relaxed">{aiText}</p></section>}
        {has("disclaimer") && <section className="border-t border-line pt-4 text-[11.5px] text-subtle"><StatusBadge tone="neutral" dot={false} className="mb-2">Disclaimer</StatusBadge><p>FinTwin is an educational simulation tool. Figures are estimates derived from your inputs and stated assumptions; simulation outputs are distributions of possible outcomes, not forecasts, and nothing here constitutes investment, tax or legal advice.</p></section>}
      </article>
    </>
  );
}
