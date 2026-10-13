"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Play, SlidersHorizontal } from "lucide-react";
import { Stagger, StaggerItem } from "../motion/stagger";
import { Card, CardTitle, MetricCard, PageHeader, KeyValue } from "../ui/card";
import { Button } from "../ui/button";
import { Field, Input, MoneyInput, OptionCard } from "../ui/field";
import { ConfirmDialog } from "../ui/overlay";
import { EmptyState, Icon } from "../ui/states";
import { StatusBadge } from "../ui/pill";
import { ProgressBar, CircularProgress } from "../motion/progress";
import { AnimatedNumber } from "../motion/count-up";
import { FanChart } from "../charts/fan-chart";
import { HBars } from "../charts/charts";
import { GoalCard, GOAL_ICON, STATUS_META, type GoalCardData } from "../domain/cards";
import { useToast } from "../motion/toast";
import { formatMoney, formatPct, formatDate, toISODate, addMonths } from "@/lib/format";
import { GOAL_TYPES, goalStatus, monthsBetween, requiredMonthly } from "@/lib/finance";
import type { EconAssumptions, SimResults } from "@/lib/simulation";

export function GoalsView({ currency: c, goals, probabilities }: { currency: string; goals: GoalCardData[]; probabilities: Record<number, number> }) {
  const active = goals.filter((g) => g.status === "active");
  const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrent = active.reduce((s, g) => s + g.currentAmount, 0);
  const attention = active.filter((g) => ["attention", "at_risk"].includes(goalStatus(g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0, probabilities[g.id] ?? null))).length;
  return (
    <>
      <PageHeader eyebrow="Financial Life · Goals" title="Goals Center" description="Every goal is testable: run scenarios against it and watch its simulated probability move." actions={<Button href="/goals/new" icon={<Plus className="h-4 w-4" />}>Add goal</Button>} />
      {goals.length === 0 ? (
        <EmptyState icon="Target" title="Give your future something to measure" description="Add a goal to see required savings, probability under your current plan, and how scenarios change it." action={<Button href="/goals/new">Add your first goal</Button>} />
      ) : (
        <Stagger stagger={0.06} className="space-y-5">
          <StaggerItem>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard dark label="Active Goals" value={active.length} format={(n) => String(Math.round(n))} delta={<span className="text-accent">{goals.length - active.length} completed or paused</span>} />
              <MetricCard label="Total Target" value={totalTarget} format={(n) => formatMoney(n, c)} />
              <MetricCard label="Total Progress" value={totalCurrent} format={(n) => formatMoney(n, c)} delta={`${formatPct(totalTarget > 0 ? totalCurrent / totalTarget : 0, 0)} of all targets`} deltaTone="good" />
              <MetricCard label="Needing Attention" value={attention} format={(n) => String(Math.round(n))} deltaTone={attention > 0 ? "warn" : "good"} delta={attention > 0 ? "Simulated probability under 65%" : "All goals on track"} />
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} currency={c} probability={probabilities[g.id] ?? null} />
              ))}
            </div>
          </StaggerItem>
        </Stagger>
      )}
    </>
  );
}

export function GoalForm({ currency, initial, onDone }: { currency: string; initial?: GoalCardData; onDone?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: initial?.name ?? "", type: initial?.type ?? "home", targetAmount: initial?.targetAmount ?? 0, currentAmount: initial?.currentAmount ?? 0, targetDate: initial?.targetDate ?? toISODate(addMonths(new Date(), 36)), monthlyContribution: initial?.monthlyContribution ?? 0 });
  const [saving, setSaving] = useState(false);
  const months = monthsBetween(new Date(), new Date(form.targetDate));
  const required = requiredMonthly(form.targetAmount, form.currentAmount, months, 0.1);

  async function submit() {
    if (!form.name.trim() || form.targetAmount <= 0) return toast({ title: "Add a name and a target amount", tone: "warn" });
    setSaving(true);
    const r = await fetch("/api/goals", { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(initial ? { id: initial.id, ...form } : form) });
    setSaving(false);
    if (!r.ok) return toast({ title: "Couldn't save goal", tone: "warn" });
    const d = await r.json();
    toast({ title: initial ? "Goal updated" : "Goal created", description: `${form.name} · ${formatMoney(form.targetAmount, currency)}` });
    if (onDone) onDone();
    else router.push(`/goals/${d.goal.id}`);
    router.refresh();
  }

  return (
    <div className={initial ? "" : "mx-auto max-w-3xl"}>
      {!initial && <PageHeader eyebrow="Goals · New" title="What are you building toward?" description="Pick a goal type, then set the target. FinTwin estimates the required monthly contribution immediately." />}
      <Card className="space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {GOAL_TYPES.map((t) => (
            <OptionCard key={t.key} compact selected={form.type === t.key} onClick={() => setForm({ ...form, type: t.key, name: form.name || (t.key === "custom" ? "" : t.label) })} title={t.label} icon={<Icon name={GOAL_ICON[t.key]} className="h-4 w-4" />} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Goal name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Buy a Home" /></Field>
          <Field label="Target date"><Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></Field>
          <Field label="Target amount"><MoneyInput currency={currency} value={form.targetAmount} onChange={(v) => setForm({ ...form, targetAmount: v })} /></Field>
          <Field label="Current amount" hint="Already set aside for this goal."><MoneyInput currency={currency} value={form.currentAmount} onChange={(v) => setForm({ ...form, currentAmount: v })} /></Field>
          <Field label="Monthly contribution" hint={form.targetAmount > 0 ? `Deterministic estimate at 10% return: ${formatMoney(required, currency)}/month` : undefined}><MoneyInput currency={currency} value={form.monthlyContribution} onChange={(v) => setForm({ ...form, monthlyContribution: v })} /></Field>
          <div className="rounded-2xl bg-card2 p-4">
            <div className="label-sm">Live preview</div>
            <div className="mt-2 flex items-center gap-4">
              <CircularProgress value={form.targetAmount > 0 ? form.currentAmount / form.targetAmount : 0} size={64} stroke={6}><span className="text-[12px] font-extrabold tnum">{formatPct(form.targetAmount > 0 ? form.currentAmount / form.targetAmount : 0, 0)}</span></CircularProgress>
              <div className="text-[12.5px] text-muted"><b className="text-ink tnum">{months}</b> months to target · <b className="text-ink tnum">{formatMoney(form.monthlyContribution, currency)}</b>/month planned</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          {!initial && <Button variant="secondary" href="/goals">Cancel</Button>}
          <Button onClick={submit} loading={saving}>{initial ? "Save changes" : "Create goal"}</Button>
        </div>
      </Card>
    </div>
  );
}

export function GoalDetailView({ currency: c, goal, econ, baseline, impacts }: { currency: string; goal: GoalCardData; econ: EconAssumptions; baseline: SimResults; impacts: { id: number; name: string; probability: number; medianFund: number }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
  const months = monthsBetween(new Date(), new Date(goal.targetDate));
  const prob = baseline.goal?.probability ?? 0;
  const st = STATUS_META[goalStatus(progress, prob)];
  const required = requiredMonthly(goal.targetAmount, goal.currentAmount, months, econ.investmentReturn);
  const elapsedShare = 0;

  async function remove() {
    await fetch("/api/goals", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: goal.id }) });
    toast({ title: "Goal removed" });
    router.push("/goals");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow={<span><Link href="/goals" className="hover:text-ink">Goals</Link> / {goal.name}</span>}
        title={<span className="inline-flex items-center gap-3"><span className="grid h-11 w-11 place-items-center pill bg-accent text-accent-ink"><Icon name={GOAL_ICON[goal.type] ?? "Target"} className="h-5 w-5" /></span>{goal.name}</span>}
        description={<span className="inline-flex items-center gap-2">Target {formatDate(goal.targetDate, "month")} · {months} months left <StatusBadge tone={st.tone}>{st.label}</StatusBadge></span>}
        actions={<><Button variant="secondary" onClick={() => setEditing((e) => !e)}>{editing ? "Close editor" : "Edit"}</Button><Button variant="secondary" href={`/goals/${goal.id}/planner`} icon={<SlidersHorizontal className="h-4 w-4" />}>Planner</Button><Button variant="accent" href={`/simulations/new?goal=${goal.id}`} icon={<Play className="h-4 w-4" />}>Simulate Goal</Button></>}
      />
      {editing && <div className="mb-5"><GoalForm currency={c} initial={goal} onDone={() => setEditing(false)} /><div className="mt-2 flex justify-end"><Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete goal</Button></div></div>}
      <Stagger stagger={0.06} className="space-y-5">
        <StaggerItem>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card dark className="lg:col-span-1">
              <div className="label text-ink-fg/55">Progress</div>
              <div className="mt-2 text-[34px] font-extrabold tracking-tight tnum leading-none"><AnimatedNumber value={goal.currentAmount} format={(n) => formatMoney(n, c)} /></div>
              <div className="mt-1 text-[12.5px] text-ink-fg/60 tnum">→ {formatMoney(goal.targetAmount, c)}</div>
              <ProgressBar value={progress} className="mt-4" marker={1} />
              <div className="mt-2 flex justify-between text-[11px] text-ink-fg/60"><span>{formatPct(progress, 1)} funded</span><span>Target marker</span></div>
              <KeyValue dark className="mt-4" rows={[{ k: "Monthly contribution", v: formatMoney(goal.monthlyContribution, c) }, { k: "Required (deterministic)", v: formatMoney(required, c) }, { k: "Simulated probability", v: `${Math.round(prob * 100)}%` }]} />
            </Card>
            <Card className="lg:col-span-2">
              <CardTitle hint="Median, 25th–75th and 5th–95th percentile of the goal fund across simulated paths. The dashed line is the target.">Possible outcome range</CardTitle>
              <div className="mb-3 flex flex-wrap gap-6">
                <div><div className="label-sm">Median at target date</div><div className="text-[22px] font-extrabold tnum">{formatMoney(baseline.goal?.medianFund ?? 0, c, { compact: true })}</div></div>
                <div><div className="label-sm">10th–90th percentile</div><div className="text-[16px] font-bold tnum text-muted">{formatMoney(baseline.goal?.p10Fund ?? 0, c, { compact: true })} – {formatMoney(baseline.goal?.p90Fund ?? 0, c, { compact: true })}</div></div>
                <div><div className="label-sm">Probability</div><div className="text-[22px] font-extrabold tnum">{Math.round(prob * 100)}%</div></div>
              </div>
              <FanChart series={baseline.series} currency={c} height={220} goalTarget={undefined} />
              <div className="mt-2 text-[11.5px] text-muted">Net worth percentiles shown for context · {baseline.paths} paths · {econ.horizonYears}-year horizon</div>
            </Card>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardTitle>Timeline</CardTitle>
              <div className="relative mt-6 h-2 pill bg-card3">
                <div className="absolute inset-y-0 left-0 pill bg-accent" style={{ width: `${elapsedShare * 100}%` }} />
                <span className="absolute -top-6 left-0 text-[11px] font-semibold">Today</span>
                <span className="absolute -top-6 right-0 text-[11px] font-semibold">{formatDate(goal.targetDate, "month")}</span>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-muted tnum">{months} months</span>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-3 text-[12.5px]">
                <div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Required monthly</div><div className="mt-1 text-[18px] font-extrabold tnum">{formatMoney(required, c)}</div><div className="text-[11px] text-muted">at {formatPct(econ.investmentReturn, 0)} return</div></div>
                <div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Gap vs plan</div><div className={`mt-1 text-[18px] font-extrabold tnum ${goal.monthlyContribution >= required ? "text-good" : "text-warn"}`}>{formatMoney(goal.monthlyContribution - required, c, { sign: true })}</div><div className="text-[11px] text-muted">per month</div></div>
              </div>
            </Card>
            <Card>
              <CardTitle hint="Each scenario in your library re-simulated against this goal with 150 paths.">Scenario impact</CardTitle>
              <HBars currency={c} format={(n) => `${Math.round(n * 100)}%`} rows={[{ label: "Current plan", value: prob, tone: "accent" }, ...impacts.map((i) => ({ label: i.name, value: i.probability, tone: "ink" as const }))]} />
              <div className="mt-3 text-[11.5px] text-muted">Probability of reaching {formatMoney(goal.targetAmount, c, { compact: true })} by {formatDate(goal.targetDate, "month")}.</div>
            </Card>
          </div>
        </StaggerItem>
      </Stagger>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} title="Delete this goal?" description="Simulations referencing it keep their results, but the goal will no longer be tracked." confirmLabel="Delete goal" destructive />
    </>
  );
}
