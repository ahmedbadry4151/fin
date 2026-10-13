"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Play, ArrowUpRight } from "lucide-react";
import { Card, CardTitle, PageHeader, KeyValue } from "../ui/card";
import { Button } from "../ui/button";
import { StatusBadge, PillTabs } from "../ui/pill";
import { Slider } from "../ui/field";
import { Stagger, StaggerItem } from "../motion/stagger";
import { useCountUp } from "../motion/count-up";
import { FanChart } from "../charts/fan-chart";
import { Collapse } from "../motion/primitives";
import { useToast } from "../motion/toast";
import { formatMoney, formatPct } from "@/lib/format";
import { ASSUMPTION_DEFS, ECONOMIC_PRESETS, type AssumptionDef } from "@/lib/economy";
import { runSimulation, type EconAssumptions, type SimTwin } from "@/lib/simulation";

const TABS = [{ href: "/economy", label: "Environment" }, { href: "/economy/presets", label: "Scenario presets" }];

export function EconomyView({ currency: c, econ, stored, preset, simTwin }: { currency: string; econ: EconAssumptions; stored: EconAssumptions; preset: string; simTwin: SimTwin }) {
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<EconAssumptions>(stored);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(stored);
  const preview = useMemo(() => runSimulation(simTwin, draft, {}, { paths: 100, seed: 12 }), [draft, simTwin]);
  const median = useCountUp(preview.final.p50, { duration: 500 });

  async function save() {
    setSaving(true);
    await fetch("/api/assumptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, preset: "custom" }) });
    setSaving(false);
    toast({ title: "Assumptions updated", description: "Every new simulation and AI answer now uses them." });
    router.refresh();
  }

  return (
    <>
      <PageHeader eyebrow="Economic Data · Environment" title="Economic Environment" description="The assumptions that feed every simulation. Historical context is shown for reference — none of these are forecasts." actions={<><StatusBadge tone="accent" className="capitalize">Preset: {preset}</StatusBadge><Button onClick={save} loading={saving} disabled={!dirty}>Save assumptions</Button></>} />
      <PillTabs items={TABS} current="/economy" layoutId="economy-tabs" className="mb-5" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Stagger stagger={0.06} className="space-y-4 lg:col-span-2">
          {ASSUMPTION_DEFS.map((d) => (
            <StaggerItem key={d.key}>
              <AssumptionCard def={d} value={draft[d.key]} effective={econ[d.key]} onChange={(v) => setDraft({ ...draft, [d.key]: v })} open={open === d.key} onToggle={() => setOpen(open === d.key ? null : d.key)} />
            </StaggerItem>
          ))}
        </Stagger>
        <div className="space-y-4">
          <Card dark>
            <div className="label text-ink-fg/55">Live impact · {draft.horizonYears}-year median</div>
            <div className="mt-1 text-[30px] font-extrabold tracking-tight tnum text-accent">{formatMoney(median, c, { compact: true })}</div>
            <div className="text-[12px] text-ink-fg/60 tnum">5th {formatMoney(preview.final.p5, "", { compact: true })} · 95th {formatMoney(preview.final.p95, "", { compact: true })}</div>
            <div className="mt-3"><FanChart series={{ p50: preview.series.p50, p5: preview.series.p5, p95: preview.series.p95 }} currency={c} height={120} compact showLegend={false} /></div>
            <div className="mt-2 text-[11px] text-ink-fg/50">100-path preview. Planning style adjustments are applied on top when simulating.</div>
          </Card>
          <Card>
            <CardTitle>Historical vs model</CardTitle>
            <p className="text-[12.5px] text-muted">Historical notes describe what happened. Model values are what the simulation will use going forward — they are your choices, and you can change them any time.</p>
            <Link href="/economy/presets" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold">Apply a scenario preset <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </Card>
        </div>
      </div>
    </>
  );
}

export function AssumptionCard({ def: d, value, effective, onChange, open, onToggle }: { def: AssumptionDef; value: number; effective: number; onChange?: (v: number) => void; open: boolean; onToggle: () => void }) {
  const fmt = (v: number) => (d.unit === "%" ? formatPct(v, 1) : `${v} years`);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label">{d.label}</div>
          <div className="mt-1 text-[30px] font-extrabold tracking-tight tnum leading-none">{fmt(value)}</div>
          <div className="mt-1 text-[12.5px] text-muted">{d.short}</div>
        </div>
        <div className="flex items-center gap-2">
          {Math.abs(effective - value) > 1e-9 && <StatusBadge tone="neutral">Effective {fmt(effective)}</StatusBadge>}
          <Link href={`/economy/${d.key}`} className="pill bg-card2 px-3 py-1.5 text-[12px] font-semibold hover:bg-card3">Details</Link>
          <button onClick={onToggle} className="pill bg-card2 px-3 py-1.5 text-[12px] font-semibold hover:bg-card3">{open ? "Hide" : "Why this matters"}</button>
        </div>
      </div>
      {onChange && <Slider className="mt-4" min={d.min} max={d.max} step={d.step} value={value} onChange={onChange} />}
      <Collapse open={open}>
        <div className="mt-4 grid gap-3 rounded-2xl bg-card2 p-4 text-[12.5px] md:grid-cols-2">
          <div><div className="label-sm mb-1">Why it matters</div><p className="text-muted">{d.why}</p></div>
          <div><div className="label-sm mb-1">Historical context</div><p className="text-muted">{d.historical}</p></div>
          <div><div className="label-sm mb-1">Model use</div><p className="text-muted">{d.modelUse}</p></div>
          <div><div className="label-sm mb-1">Impact on simulation</div><p className="text-muted">{d.impact}</p></div>
        </div>
      </Collapse>
    </div>
  );
}

export function PresetsView({ currency: c, current, simTwin, horizonYears }: { currency: string; current: string; simTwin: SimTwin; horizonYears: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [applying, setApplying] = useState<string | null>(null);
  const previews = useMemo(() => Object.fromEntries(ECONOMIC_PRESETS.map((p) => [p.key, runSimulation(simTwin, { ...p.values, horizonYears }, {}, { paths: 80, seed: 14 }).final.p50])), [simTwin, horizonYears]);

  async function apply(key: string) {
    const p = ECONOMIC_PRESETS.find((x) => x.key === key)!;
    setApplying(key);
    await fetch("/api/assumptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p.values, preset: key }) });
    setApplying(null);
    toast({ title: `${p.name} applied`, description: "Your Economic Environment now uses this preset.", action: { label: "Simulate", onClick: () => router.push("/simulations/new") } });
    router.refresh();
  }

  return (
    <>
      <PageHeader eyebrow="Economic Data · Presets" title="Economic Scenario Presets" description="Named macro environments you can apply to your model in one step." />
      <PillTabs items={TABS} current="/economy/presets" layoutId="economy-tabs" className="mb-5" />
      <Stagger stagger={0.06} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ECONOMIC_PRESETS.map((p) => {
          const active = current === p.key;
          return (
            <StaggerItem key={p.key}>
              <div className={`h-full rounded-[22px] p-5 ${active ? "card-dark" : "card"}`}>
                <div className="flex items-start justify-between"><div><div className="text-[16px] font-extrabold tracking-tight">{p.name}</div><div className={`mt-0.5 text-[12.5px] ${active ? "text-ink-fg/60" : "text-muted"}`}>{p.description}</div></div>{active && <StatusBadge tone="accent">Active</StatusBadge>}</div>
                <KeyValue dark={active} className="mt-3" rows={[{ k: "Inflation", v: formatPct(p.values.inflation, 0) }, { k: "Income growth", v: formatPct(p.values.incomeGrowth, 0) }, { k: "Expense growth", v: formatPct(p.values.expenseGrowth, 0) }, { k: "Return · volatility", v: `${formatPct(p.values.investmentReturn, 0)} · ${formatPct(p.values.volatility, 0)}` }]} />
                <div className={`mt-3 rounded-2xl p-3 ${active ? "bg-ink-fg/10" : "bg-card2"}`}><div className={`label-sm ${active ? "text-ink-fg/50" : ""}`}>{horizonYears}-year median (preview)</div><div className={`text-[18px] font-extrabold tnum ${active ? "text-accent" : ""}`}>{formatMoney(previews[p.key], c, { compact: true })}</div></div>
                <Button className="mt-4 w-full" variant={active ? "accent" : "primary"} onClick={() => apply(p.key)} loading={applying === p.key} icon={active ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}>{active ? "Applied" : "Apply to Simulation"}</Button>
              </div>
            </StaggerItem>
          );
        })}
        <StaggerItem>
          <Link href="/economy" className="card card-hover flex h-full flex-col items-center justify-center p-5 text-center"><div className="text-[16px] font-extrabold">Custom</div><div className="mt-1 text-[12.5px] text-muted">Tune each assumption yourself in the Economic Environment.</div></Link>
        </StaggerItem>
      </Stagger>
    </>
  );
}

export function AssumptionDetailView({ currency: c, def: d, value, simTwin, econ }: { currency: string; def: AssumptionDef; value: number; simTwin: SimTwin; econ: EconAssumptions }) {
  const [v, setV] = useState(value);
  const res = useMemo(() => runSimulation(simTwin, { ...econ, [d.key]: v }, {}, { paths: 120, seed: 15, baseline: false }), [v, simTwin, econ, d.key]);
  const base = useMemo(() => runSimulation(simTwin, econ, {}, { paths: 120, seed: 15 }), [simTwin, econ]);
  const fmt = (x: number) => (d.unit === "%" ? formatPct(x, 1) : `${x} years`);
  return (
    <>
      <PageHeader eyebrow={<span><Link href="/economy" className="hover:text-ink">Economic Environment</Link> / {d.label}</span>} title={d.label} description={d.short} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card dark><div className="label text-ink-fg/55">Current assumption</div><div className="mt-1 text-[40px] font-extrabold tracking-tight tnum leading-none">{fmt(value)}</div><p className="mt-3 text-[12.5px] text-ink-fg/60">{d.modelUse}</p></Card>
        <Card className="lg:col-span-2"><CardTitle>Impact on simulation</CardTitle><Slider label={`Try ${d.label.toLowerCase()}`} min={d.min} max={d.max} step={d.step} value={v} onChange={setV} display={fmt(v)} /><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-card2 p-3"><div className="label-sm">Median with current</div><div className="text-[18px] font-extrabold tnum">{formatMoney(base.final.p50, c, { compact: true })}</div></div><div className="rounded-2xl bg-ink p-3 text-ink-fg"><div className="label-sm text-ink-fg/60">Median with {fmt(v)}</div><div className="text-[18px] font-extrabold tnum text-accent">{formatMoney(res.final.p50, c, { compact: true })}</div></div></div><FanChart series={res.series} baseline={base.series.p50} currency={c} height={220} className="mt-3" /></Card>
        <Card><CardTitle>Historical context</CardTitle><p className="text-[13px] text-muted">{d.historical}</p></Card>
        <Card><CardTitle>Why it matters</CardTitle><p className="text-[13px] text-muted">{d.why}</p></Card>
        <Card><CardTitle>How the model uses it</CardTitle><p className="text-[13px] text-muted">{d.impact}</p><p className="mt-2 text-[11.5px] text-subtle">Forecasts are not certainties. This value is an assumption you control.</p></Card>
      </div>
    </>
  );
}
