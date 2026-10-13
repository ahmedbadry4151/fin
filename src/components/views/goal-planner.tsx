"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Card, CardTitle, PageHeader, KeyValue } from "../ui/card";
import { Button } from "../ui/button";
import { Slider, Field, MoneyInput, Input } from "../ui/field";
import { CircularProgress } from "../motion/progress";
import { useCountUp } from "../motion/count-up";
import { FanChart } from "../charts/fan-chart";
import { useToast } from "../motion/toast";
import { formatMoney, formatPct, toISODate, addMonths } from "@/lib/format";
import { requiredMonthly, goalFutureValue } from "@/lib/finance";
import { runSimulation, type EconAssumptions, type SimTwin } from "@/lib/simulation";
import type { GoalCardData } from "../domain/cards";

export function GoalPlannerView({ currency: c, goal, simTwin, econ }: { currency: string; goal: GoalCardData; simTwin: SimTwin; econ: EconAssumptions }) {
  const router = useRouter();
  const { toast } = useToast();
  const [target, setTarget] = useState(goal.targetAmount);
  const [months, setMonths] = useState(Math.max(6, Math.round((new Date(goal.targetDate).getTime() - Date.now()) / (30.44 * 86400000))));
  const [contribution, setContribution] = useState(goal.monthlyContribution);
  const [starting, setStarting] = useState(goal.currentAmount);
  const [saving, setSaving] = useState(false);

  const deferred = useDeferredValue({ target, months, contribution, starting });
  const result = useMemo(() => {
    const twin: SimTwin = { ...simTwin, goal: { id: goal.id, name: goal.name, target: deferred.target, current: deferred.starting, contribution: deferred.contribution, months: deferred.months } };
    return runSimulation(twin, { ...econ, horizonYears: Math.max(1, Math.ceil(deferred.months / 12)) }, {}, { paths: 160, seed: 77 });
  }, [deferred, simTwin, econ, goal.id, goal.name]);

  const prob = result.goal?.probability ?? 0;
  const required = requiredMonthly(target, starting, months, econ.investmentReturn);
  const deterministic = goalFutureValue(starting, contribution, months, econ.investmentReturn);
  const animatedProb = useCountUp(prob * 100, { duration: 500 });
  const animatedRequired = useCountUp(required, { duration: 500 });
  const animatedMedian = useCountUp(result.goal?.medianFund ?? 0, { duration: 500 });

  async function save() {
    setSaving(true);
    await fetch("/api/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: goal.id, targetAmount: target, currentAmount: starting, monthlyContribution: contribution, targetDate: toISODate(addMonths(new Date(), months)) }) });
    setSaving(false);
    toast({ title: "Goal plan saved", description: `${goal.name} updated with your new plan.` });
    router.refresh();
  }

  return (
    <>
      <PageHeader eyebrow={<span><Link href="/goals" className="hover:text-ink">Goals</Link> / <Link href={`/goals/${goal.id}`} className="hover:text-ink">{goal.name}</Link> / Planner</span>} title="Goal Planner" description="Move a control and watch probability, required contribution and the outcome range update — no refresh, no page jump." actions={<Button onClick={save} loading={saving} icon={<Save className="h-4 w-4" />}>Save plan</Button>} />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="space-y-6 lg:col-span-2">
          <Slider label="Target" min={10000} max={Math.max(5000000, goal.targetAmount * 2)} step={10000} value={target} onChange={setTarget} display={formatMoney(target, c)} />
          <Slider label="Months to target" min={6} max={240} step={1} value={months} onChange={setMonths} display={`${months} months · ${(months / 12).toFixed(1)} yrs`} />
          <Slider label="Monthly contribution" min={0} max={Math.max(50000, simTwin.monthlyIncome)} step={250} value={contribution} onChange={setContribution} display={formatMoney(contribution, c)} />
          <Slider label="Starting balance" min={0} max={Math.max(target, 1000000)} step={5000} value={starting} onChange={setStarting} display={formatMoney(starting, c)} />
          <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <Field label="Target"><MoneyInput currency={c} value={target} onChange={setTarget} /></Field>
            <Field label="Contribution"><MoneyInput currency={c} value={contribution} onChange={setContribution} /></Field>
            <Field label="Months"><Input type="number" value={months} onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))} /></Field>
            <Field label="Starting"><MoneyInput currency={c} value={starting} onChange={setStarting} /></Field>
          </div>
        </Card>
        <div className="space-y-5 lg:col-span-3">
          <div className="grid grid-cols-3 gap-4">
            <Card dark className="flex flex-col items-center justify-center text-center">
              <CircularProgress value={prob} size={92} stroke={8}><span className="text-[20px] font-extrabold tnum">{Math.round(animatedProb)}%</span></CircularProgress>
              <div className="label mt-3 text-ink-fg/55">Simulated probability</div>
            </Card>
            <Card>
              <div className="label">Required monthly</div>
              <div className="mt-2 text-[24px] font-extrabold tracking-tight tnum">{formatMoney(animatedRequired, c)}</div>
              <div className={`mt-1 text-[12px] font-semibold ${contribution >= required ? "text-good" : "text-warn"}`}>{contribution >= required ? "Plan covers it" : `${formatMoney(required - contribution, c)} short`}</div>
            </Card>
            <Card>
              <div className="label">Median fund at target</div>
              <div className="mt-2 text-[24px] font-extrabold tracking-tight tnum">{formatMoney(animatedMedian, c, { compact: true })}</div>
              <div className="mt-1 text-[12px] text-muted tnum">Deterministic {formatMoney(deterministic, c, { compact: true })}</div>
            </Card>
          </div>
          <Card>
            <CardTitle hint="Net worth percentiles over the planning horizon with your current plan. The goal fund itself is tracked separately — see probability.">Outcome range</CardTitle>
            <FanChart series={result.series} currency={c} height={240} />
          </Card>
          <Card>
            <CardTitle>Model context</CardTitle>
            <KeyValue rows={[{ k: "Paths", v: `${result.paths} (live preview)` }, { k: "Return assumption", v: `${formatPct(econ.investmentReturn, 1)} ± ${formatPct(econ.volatility, 0)}` }, { k: "10th–90th fund range", v: `${formatMoney(result.goal?.p10Fund ?? 0, c, { compact: true })} – ${formatMoney(result.goal?.p90Fund ?? 0, c, { compact: true })}` }, { k: "Contributions pause", v: "when monthly surplus falls below the planned amount" }]} />
            <p className="mt-3 text-[11.5px] text-muted">Under the selected simulation assumptions, the estimated probability of reaching the goal is {Math.round(prob * 100)}%. This is an estimate, not a forecast or investment advice.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
