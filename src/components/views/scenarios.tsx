"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, ArrowRight, ArrowLeft, Play, Check } from "lucide-react";
import { Card, CardTitle, PageHeader, KeyValue } from "../ui/card";
import { Button } from "../ui/button";
import { FilterPill, StatusBadge, Chip, SegmentedControl } from "../ui/pill";
import { Field, Input, MoneyInput, Select, Slider, Textarea, Toggle, OptionCard } from "../ui/field";
import { ConfirmDialog } from "../ui/overlay";
import { EmptyState, Icon } from "../ui/states";
import { ScenarioCard, type ScenarioCardData } from "../domain/cards";
import { FanChart } from "../charts/fan-chart";
import { useToast } from "../motion/toast";
import { EASE_OUT } from "../motion/stagger";
import { formatMoney, formatPct } from "@/lib/format";
import { SCENARIO_CATEGORIES, SCENARIO_TEMPLATES, describeParams, parseScenarioText, templateByKey, type ScenarioCategory } from "@/lib/scenarios";
import { ASSUMPTION_DEFS } from "@/lib/economy";
import { runSimulation, type EconAssumptions, type ScenarioParams, type SimTwin } from "@/lib/simulation";

/* ---------------- Library ---------------- */
export function ScenarioLibraryView({ currency: c, scenarios, outcomes }: { currency: string; scenarios: ScenarioCardData[]; outcomes: Record<number, { finalP50: number; baselineP50: number | null; goalProbability: number | null; shortfall: number }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [cat, setCat] = useState<ScenarioCategory | "all">("all");
  const [confirm, setConfirm] = useState<number | null>(null);
  const filtered = scenarios.filter((s) => cat === "all" || s.category === cat);

  async function duplicate(id: number) {
    const r = await fetch("/api/scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duplicateOf: id }) });
    if (r.ok) {
      toast({ title: "Scenario duplicated" });
      router.refresh();
    }
  }
  async function remove(id: number) {
    await fetch("/api/scenarios", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setConfirm(null);
    toast({ title: "Scenario deleted" });
    router.refresh();
  }

  return (
    <>
      <PageHeader eyebrow="Simulation Lab · Scenarios" title="Scenario Studio" description="Test a decision before you make it. Each scenario changes one part of your Twin and can be simulated against any goal." actions={<><Button variant="secondary" href="/scenarios/ai" icon={<Sparkles className="h-4 w-4" />}>Describe in words</Button><Button href="/scenarios/new" icon={<Plus className="h-4 w-4" />}>New scenario</Button></>} />
      <div className="mb-5 flex gap-1.5 overflow-x-auto no-scrollbar">
        <FilterPill active={cat === "all"} onClick={() => setCat("all")}>All</FilterPill>
        {SCENARIO_CATEGORIES.map((k) => (
          <FilterPill key={k.key} active={cat === k.key} onClick={() => setCat(k.key)}>{k.label}</FilterPill>
        ))}
      </div>
      {scenarios.length === 0 ? (
        <EmptyState icon="GitBranch" title="Test a decision before you make it" description="Start from a template — losing a job, buying a home, higher inflation — or describe a scenario in plain language." action={<Button href="/scenarios/new">Create a scenario</Button>} />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((s, i) => {
              const o = outcomes[s.id];
              return (
                <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
                  <ScenarioCard
                    scenario={s}
                    currency={c}
                    index={i}
                    iconName={templateByKey(s.templateKey)?.icon ?? "GitBranch"}
                    onDuplicate={() => duplicate(s.id)}
                    onDelete={() => setConfirm(s.id)}
                    outcome={o ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1"><span>Median <b className="tnum">{formatMoney(o.finalP50, c, { compact: true })}</b>{o.baselineP50 !== null && <span className={`ml-1 tnum ${o.finalP50 - o.baselineP50 >= 0 ? "text-good" : "text-warn"}`}>({formatMoney(o.finalP50 - o.baselineP50, "", { compact: true, sign: true })})</span>}</span>{o.goalProbability !== null && <span>Goal <b className="tnum">{Math.round(o.goalProbability * 100)}%</b></span>}<span>Shortfall <b className="tnum">{Math.round(o.shortfall * 100)}%</b></span></div> : undefined}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
      <Card className="mt-6">
        <CardTitle>Start from a template</CardTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SCENARIO_TEMPLATES.filter((t) => t.key !== "custom").slice(0, 8).map((t) => (
            <Link key={t.key} href={`/scenarios/new?template=${t.key}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-card2 p-3 transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-card">
              <span className="grid h-9 w-9 place-items-center pill bg-card3 transition-colors group-hover:bg-ink group-hover:text-ink-fg"><Icon name={t.icon} className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block truncate text-[13px] font-bold">{t.name}</span><span className="block text-[11px] text-muted capitalize">{t.category}</span></span>
            </Link>
          ))}
        </div>
      </Card>
      <ConfirmDialog open={confirm !== null} onClose={() => setConfirm(null)} onConfirm={() => confirm && remove(confirm)} title="Delete scenario?" description="Past simulation results are kept, but you won't be able to re-run this scenario." confirmLabel="Delete" destructive />
    </>
  );
}

/* ---------------- Builder ---------------- */
const STEPS = ["Define", "Timeline", "Financial changes", "Assumptions", "Settings", "Preview"];
type Draft = { name: string; description: string; category: ScenarioCategory; templateKey: string | null; params: ScenarioParams; horizonYears: number; paths: number };

export function ScenarioBuilder({ currency: c, simTwin, econ, goals, existing }: { currency: string; simTwin: SimTwin; econ: EconAssumptions; goals: { id: number; name: string }[]; existing?: { id: number; name: string; description: string; category: string; templateKey: string | null; params: ScenarioParams } }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const initialTemplate = templateByKey(sp.get("template")) ?? (existing ? null : null);
  const [step, setStep] = useState(existing ? 2 : initialTemplate ? 1 : 0);
  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? { name: existing.name, description: existing.description, category: existing.category as ScenarioCategory, templateKey: existing.templateKey, params: existing.params, horizonYears: econ.horizonYears, paths: 600 }
      : { name: initialTemplate?.name ?? "", description: initialTemplate?.description ?? "", category: initialTemplate?.category ?? "custom", templateKey: initialTemplate?.key ?? null, params: initialTemplate ? { ...initialTemplate.params } : {}, horizonYears: econ.horizonYears, paths: 600 },
  );
  const [saving, setSaving] = useState(false);
  const p = draft.params;
  const setP = (patch: Partial<ScenarioParams>) => setDraft((d) => ({ ...d, params: { ...d.params, ...patch } }));
  const setA = (key: keyof EconAssumptions, v: number | undefined) => setDraft((d) => { const a = { ...(d.params.assumptions ?? {}) }; if (v === undefined) delete a[key]; else a[key] = v; return { ...d, params: { ...d.params, assumptions: Object.keys(a).length ? a : undefined } }; });

  const preview = useMemo(() => {
    if (step !== 5) return null;
    const scen = runSimulation(simTwin, { ...econ, horizonYears: draft.horizonYears }, draft.params, { paths: 150, seed: 9, baseline: true });
    return scen;
  }, [step, simTwin, econ, draft.horizonYears, draft.params]);

  async function save(run: boolean) {
    if (!draft.name.trim()) return toast({ title: "Name your scenario first", tone: "warn" });
    setSaving(true);
    const r = await fetch("/api/scenarios", { method: existing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: existing?.id, name: draft.name, description: draft.description, category: draft.category, templateKey: draft.templateKey, params: draft.params }) });
    setSaving(false);
    if (!r.ok) return toast({ title: "Couldn't save scenario", tone: "warn" });
    const d = await r.json();
    toast({ title: existing ? "Scenario updated" : "Scenario saved" });
    if (run) router.push(`/simulations/new?scenario=${d.scenario.id}&paths=${draft.paths}&horizon=${draft.horizonYears}`);
    else router.push("/scenarios");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={<span><Link href="/scenarios" className="hover:text-ink">Scenarios</Link> / {existing ? "Edit" : "Builder"}</span>} title={existing ? `Edit “${existing.name}”` : "Scenario Builder"} description="Every change you make is visible in the model. Nothing is hidden behind the simulation." actions={<Button variant="secondary" href="/scenarios/ai" icon={<Sparkles className="h-4 w-4" />}>Describe in words instead</Button>} />
      <ol className="mb-6 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button onClick={() => setStep(i)} className={`relative pill px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${i === step ? "text-ink-fg" : i < step ? "text-ink" : "text-muted"}`}>
              {i === step && <motion.span layoutId="builder-step" className="absolute inset-0 pill bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative z-10 inline-flex items-center gap-1.5">{i < step && <Check className="h-3 w-3" />}{i + 1}. {s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
              {step === 0 && (
                <Card className="space-y-5">
                  <div>
                    <div className="mb-2 text-[12.5px] font-semibold">What changes?</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {SCENARIO_TEMPLATES.map((t) => (
                        <OptionCard key={t.key} compact selected={draft.templateKey === t.key} onClick={() => setDraft((d) => ({ ...d, templateKey: t.key, name: t.name, description: t.description, category: t.category, params: { ...t.params } }))} title={t.name} hint={t.description} icon={<Icon name={t.icon} className="h-4 w-4" />} />
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Scenario name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Lose my job for six months" /></Field>
                    <Field label="Category"><Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ScenarioCategory })}>{SCENARIO_CATEGORIES.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</Select></Field>
                  </div>
                  <Field label="Description"><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What are you testing and why?" /></Field>
                </Card>
              )}
              {step === 1 && (
                <Card className="space-y-6">
                  <p className="text-[13px] text-muted">When does the change begin, and for how long? Month 1 is next month.</p>
                  <Slider label="Income change starts" min={1} max={120} value={p.incomeStartMonth ?? 1} onChange={(v) => setP({ incomeStartMonth: v })} display={`month ${p.incomeStartMonth ?? 1}`} />
                  <Toggle checked={p.incomeDurationMonths !== null && p.incomeDurationMonths !== undefined} onChange={(v) => setP({ incomeDurationMonths: v ? 6 : null })} label="Income change is temporary" description={p.incomeDurationMonths == null ? "Permanent change" : `${p.incomeDurationMonths} months`} />
                  {p.incomeDurationMonths != null && <Slider label="Duration" min={1} max={60} value={p.incomeDurationMonths} onChange={(v) => setP({ incomeDurationMonths: v })} display={`${p.incomeDurationMonths} months`} />}
                  <Slider label="Expense change starts" min={1} max={120} value={p.expenseStartMonth ?? 1} onChange={(v) => setP({ expenseStartMonth: v })} display={`month ${p.expenseStartMonth ?? 1}`} />
                  <Slider label="One-time cost month" min={1} max={120} value={p.oneTimeCostMonth ?? 1} onChange={(v) => setP({ oneTimeCostMonth: v })} display={`month ${p.oneTimeCostMonth ?? 1}`} />
                  {p.purchase && <Slider label="Purchase month" min={1} max={120} value={p.purchase.month} onChange={(v) => setP({ purchase: { ...p.purchase!, month: v } })} display={`month ${p.purchase.month}`} />}
                </Card>
              )}
              {step === 2 && (
                <Card className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Income change" hint="Percent of current income. −100 means income stops."><Input type="number" suffix="%" value={p.incomeChangePct ?? 0} onChange={(e) => setP({ incomeChangePct: Number(e.target.value) || undefined })} /></Field>
                    <Field label="Expense change" hint="Percent of total monthly expenses."><Input type="number" suffix="%" value={p.expenseChangePct ?? 0} onChange={(e) => setP({ expenseChangePct: Number(e.target.value) || undefined })} /></Field>
                    <Field label="Extra monthly expense" hint="Negative removes an expense (e.g. rent after buying)."><Input type="number" prefix={c} value={p.extraMonthlyExpense ?? 0} onChange={(e) => setP({ extraMonthlyExpense: Number(e.target.value) || undefined, extraExpenseStartMonth: p.extraExpenseStartMonth ?? 1, extraExpenseDurationMonths: p.extraExpenseDurationMonths ?? null })} /></Field>
                    <Field label="Extra monthly income"><MoneyInput currency={c} value={p.extraMonthlyIncome ?? 0} onChange={(v) => setP({ extraMonthlyIncome: v || undefined, extraIncomeStartMonth: p.extraIncomeStartMonth ?? 1, extraIncomeDurationMonths: p.extraIncomeDurationMonths ?? null })} /></Field>
                    <Field label="One-time cost"><MoneyInput currency={c} value={p.oneTimeCost ?? 0} onChange={(v) => setP({ oneTimeCost: v || undefined })} /></Field>
                    <Field label="One-time inflow"><MoneyInput currency={c} value={p.oneTimeIncome ?? 0} onChange={(v) => setP({ oneTimeIncome: v || undefined, oneTimeIncomeMonth: p.oneTimeIncomeMonth ?? 1 })} /></Field>
                    <Field label="Savings change" hint="Percent change in monthly savings and goal contributions."><Input type="number" suffix="%" value={p.savingsChangePct ?? 0} onChange={(e) => setP({ savingsChangePct: Number(e.target.value) || undefined })} /></Field>
                    <Field label="Delay goal" hint="Months to push the goal date."><Input type="number" suffix="months" value={p.goalDelayMonths ?? 0} onChange={(e) => setP({ goalDelayMonths: Number(e.target.value) || undefined })} /></Field>
                  </div>
                  <div className="rounded-2xl border border-line bg-card2 p-4">
                    <Toggle checked={!!p.purchase} onChange={(v) => setP({ purchase: v ? { label: "Asset", price: 1000000, downPaymentPct: 0.2, month: 12, loanRate: 0.18, loanYears: 15, appreciation: 0.08 } : null })} label="Includes a major purchase" description="Adds an asset plus a loan for the remainder." />
                    {p.purchase && (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <Field label="Label"><Input value={p.purchase.label ?? ""} onChange={(e) => setP({ purchase: { ...p.purchase!, label: e.target.value } })} /></Field>
                        <Field label="Price"><MoneyInput currency={c} value={p.purchase.price} onChange={(v) => setP({ purchase: { ...p.purchase!, price: v } })} /></Field>
                        <Field label="Down payment"><Input type="number" suffix="%" value={Math.round(p.purchase.downPaymentPct * 100)} onChange={(e) => setP({ purchase: { ...p.purchase!, downPaymentPct: Number(e.target.value) / 100 } })} /></Field>
                        <Field label="Loan rate"><Input type="number" suffix="%" value={Math.round(p.purchase.loanRate * 100)} onChange={(e) => setP({ purchase: { ...p.purchase!, loanRate: Number(e.target.value) / 100 } })} /></Field>
                        <Field label="Loan years"><Input type="number" value={p.purchase.loanYears} onChange={(e) => setP({ purchase: { ...p.purchase!, loanYears: Number(e.target.value) } })} /></Field>
                        <Field label="Yearly value change"><Input type="number" suffix="%" value={Math.round(p.purchase.appreciation * 100)} onChange={(e) => setP({ purchase: { ...p.purchase!, appreciation: Number(e.target.value) / 100 } })} /></Field>
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {step === 3 && (
                <Card className="space-y-4">
                  <p className="text-[13px] text-muted">Override economic assumptions for this scenario only. Unchecked values use your Economic Environment.</p>
                  {ASSUMPTION_DEFS.filter((d) => d.key !== "horizonYears").map((d) => {
                    const on = p.assumptions?.[d.key] !== undefined;
                    const val = p.assumptions?.[d.key] ?? econ[d.key];
                    return (
                      <div key={d.key} className="rounded-2xl border border-line bg-card2 p-4">
                        <Toggle checked={on} onChange={(v) => setA(d.key, v ? econ[d.key] : undefined)} label={d.label} description={`${d.short} Current: ${formatPct(econ[d.key], 1)}`} />
                        {on && <Slider className="mt-3" min={d.min} max={d.max} step={d.step} value={val} onChange={(v) => setA(d.key, v)} display={formatPct(val, 1)} />}
                      </div>
                    );
                  })}
                </Card>
              )}
              {step === 4 && (
                <Card className="space-y-6">
                  <Slider label="Simulation horizon" min={1} max={30} value={draft.horizonYears} onChange={(v) => setDraft({ ...draft, horizonYears: v })} display={`${draft.horizonYears} years`} />
                  <div>
                    <div className="mb-2 text-[12.5px] font-semibold">Paths</div>
                    <SegmentedControl layoutId="paths" value={String(draft.paths)} onChange={(v) => setDraft({ ...draft, paths: Number(v) })} options={[100, 300, 600, 1000, 5000].map((n) => ({ value: String(n), label: n.toLocaleString() }))} />
                    <p className="mt-2 text-[11.5px] text-muted">More paths give smoother percentiles. 600 is a good default; 5,000 takes a few seconds.</p>
                  </div>
                </Card>
              )}
              {step === 5 && preview && (
                <Card>
                  <CardTitle hint="Live preview with 150 paths. The full simulation uses your chosen path count.">Baseline vs scenario</CardTitle>
                  <div className="mb-3 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Current plan median</div><div className="text-[18px] font-extrabold tnum">{formatMoney(preview.baseline?.finalP50 ?? preview.final.p50, c, { compact: true })}</div></div>
                    <div className="rounded-2xl bg-ink p-3 text-ink-fg"><div className="label-sm text-ink-fg/60">Scenario median</div><div className="text-[18px] font-extrabold tnum text-accent">{formatMoney(preview.final.p50, c, { compact: true })}</div></div>
                    <div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Shortfall probability</div><div className="text-[18px] font-extrabold tnum">{Math.round(preview.risk.shortfallProbability * 100)}%</div></div>
                  </div>
                  <FanChart series={preview.series} baseline={preview.baseline?.p50 ?? null} currency={c} height={260} />
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
            <div className="flex gap-2">
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} iconRight={<ArrowRight className="h-4 w-4" />}>Continue</Button>
              ) : (
                <><Button variant="secondary" onClick={() => save(false)} loading={saving}>Save only</Button><Button variant="accent" onClick={() => save(true)} loading={saving} icon={<Play className="h-4 w-4" />}>Save & run simulation</Button></>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Card dark>
            <div className="label text-ink-fg/55">Scenario summary</div>
            <div className="mt-1 text-[16px] font-bold">{draft.name || "Untitled scenario"}</div>
            <ul className="mt-3 space-y-1.5 text-[12.5px]">
              {describeParams(draft.params, c).map((l) => (
                <li key={l} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 pill bg-accent" />{l}</li>
              ))}
            </ul>
            <KeyValue dark className="mt-3" rows={[{ k: "Horizon", v: `${draft.horizonYears} years` }, { k: "Paths", v: draft.paths.toLocaleString() }, { k: "Goal", v: goals[0]?.name ?? "—" }]} />
          </Card>
          <Card>
            <div className="text-[13px] font-bold">Model transparency</div>
            <p className="mt-1 text-[12px] text-muted">Changes apply on top of your Financial Twin. The simulation reports percentiles of outcomes, not predictions.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AI builder ---------------- */
export function AiScenarioBuilder({ currency: c, simTwin, econ }: { currency: string; simTwin: SimTwin; econ: EconAssumptions }) {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = useState("What happens if I lose my job for six months but keep my current expenses?");
  const [parsed, setParsed] = useState<ReturnType<typeof parseScenarioText> | null>(null);
  const [params, setParams] = useState<ScenarioParams>({});
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => (parsed ? runSimulation(simTwin, econ, params, { paths: 120, seed: 3, baseline: true }) : null), [parsed, params, simTwin, econ]);

  function extract() {
    const r = parseScenarioText(text);
    setParsed(r);
    setParams(r.params);
  }
  async function save() {
    if (!parsed) return;
    setSaving(true);
    const r = await fetch("/api/scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: parsed.name, description: text, category: "custom", templateKey: null, params }) });
    setSaving(false);
    if (!r.ok) return toast({ title: "Couldn't save", tone: "warn" });
    const d = await r.json();
    router.push(`/simulations/new?scenario=${d.scenario.id}`);
  }
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={<span><Link href="/scenarios" className="hover:text-ink">Scenarios</Link> / AI builder</span>} title="Describe a scenario" description="Write what you want to test. FinTwin extracts the model changes and shows every parameter — nothing is applied silently." />
      <Card className="space-y-4">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[110px] text-[15px]" />
        <div className="flex flex-wrap gap-1.5">
          {["What if I get a 20% raise next year?", "Save 25% more every month", "Buy a 2,000,000 home in 3 years", "Inflation stays at 30% for the next decade", "Have a child in 9 months"].map((s) => (
            <Chip key={s} className="cursor-pointer hover:bg-card2" >
              <button onClick={() => setText(s)}>{s}</button>
            </Chip>
          ))}
        </div>
        <div className="flex justify-end"><Button onClick={extract} icon={<Sparkles className="h-4 w-4" />}>Extract parameters</Button></div>
      </Card>
      <AnimatePresence>
        {parsed && preview && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }} className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="space-y-4">
              <CardTitle>Extracted model changes</CardTitle>
              <ul className="space-y-1.5 text-[13px]">{parsed.notes.map((n) => <li key={n} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 pill bg-accent" />{n}</li>)}</ul>
              <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                <Field label="Income change"><Input type="number" suffix="%" value={params.incomeChangePct ?? 0} onChange={(e) => setParams({ ...params, incomeChangePct: Number(e.target.value) || undefined, incomeStartMonth: params.incomeStartMonth ?? 1 })} /></Field>
                <Field label="Duration"><Input type="number" suffix="months" value={params.incomeDurationMonths ?? 0} onChange={(e) => setParams({ ...params, incomeDurationMonths: Number(e.target.value) || null })} /></Field>
                <Field label="Expense change"><Input type="number" suffix="%" value={params.expenseChangePct ?? 0} onChange={(e) => setParams({ ...params, expenseChangePct: Number(e.target.value) || undefined, expenseStartMonth: 1, expenseDurationMonths: null })} /></Field>
                <Field label="Savings change"><Input type="number" suffix="%" value={params.savingsChangePct ?? 0} onChange={(e) => setParams({ ...params, savingsChangePct: Number(e.target.value) || undefined })} /></Field>
                <Field label="One-time cost"><MoneyInput currency={c} value={params.oneTimeCost ?? 0} onChange={(v) => setParams({ ...params, oneTimeCost: v || undefined, oneTimeCostMonth: params.oneTimeCostMonth ?? 1 })} /></Field>
                <Field label="Extra monthly expense"><MoneyInput currency={c} value={params.extraMonthlyExpense ?? 0} onChange={(v) => setParams({ ...params, extraMonthlyExpense: v || undefined, extraExpenseStartMonth: params.extraExpenseStartMonth ?? 1, extraExpenseDurationMonths: null })} /></Field>
              </div>
              <div className="flex items-center justify-between pt-2"><StatusBadge tone="accent">Editable before running</StatusBadge><Button variant="accent" onClick={save} loading={saving} icon={<Play className="h-4 w-4" />}>Save & run</Button></div>
            </Card>
            <Card>
              <CardTitle>Quick preview</CardTitle>
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Current plan</div><div className="text-[18px] font-extrabold tnum">{formatMoney(preview.baseline?.finalP50 ?? preview.final.p50, c, { compact: true })}</div></div>
                <div className="rounded-2xl bg-ink p-3 text-ink-fg"><div className="label-sm text-ink-fg/60">Scenario</div><div className="text-[18px] font-extrabold tnum text-accent">{formatMoney(preview.final.p50, c, { compact: true })}</div></div>
              </div>
              <FanChart series={preview.series} baseline={preview.baseline?.p50 ?? null} currency={c} height={220} compact showLegend={false} />
              <div className="mt-2 text-[11.5px] text-muted">120 preview paths · {econ.horizonYears}-year horizon</div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
