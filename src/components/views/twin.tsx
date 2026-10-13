"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, ArrowUpRight } from "lucide-react";
import { Stagger, StaggerItem } from "../motion/stagger";
import { Card, CardTitle, MetricCard, KeyValue, PageHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Drawer } from "../ui/overlay";
import { Field, MoneyInput, Input, Select } from "../ui/field";
import { HBars } from "../charts/charts";
import { ProgressBar } from "../motion/progress";
import { useToast } from "../motion/toast";
import { GoalCard } from "../domain/cards";
import { StatusBadge } from "../ui/pill";
import { formatMoney, formatPct, formatMonths } from "@/lib/format";
import { EXPENSE_CATEGORIES, ASSET_TYPES, LIABILITY_TYPES, type TwinMetrics } from "@/lib/finance";
import { ASSUMPTION_DEFS } from "@/lib/economy";
import type { EconAssumptions } from "@/lib/simulation";

type Asset = { id: number; name: string; type: string; value: number };
type Liability = { id: number; name: string; type: string; balance: number; monthlyPayment: number; interestRate: number; remainingMonths: number };
type Account = { id: number; name: string; type: string; balance: number };
type Goal = { id: number; name: string; type: string; targetAmount: number; currentAmount: number; targetDate: string; monthlyContribution: number; status: string };

export function TwinView({ currency: c, metrics: m, profile, accounts, assets, liabilities, goals, econ, goalProbabilities }: { currency: string; metrics: TwinMetrics; profile: { monthlyIncome: number; additionalIncome: number; incomeFrequency: string; expenses: Record<string, number>; cashSavings: number; emergencySavings: number; monthlySavings: number }; accounts: Account[]; assets: Asset[]; liabilities: Liability[]; goals: Goal[]; econ: EconAssumptions; goalProbabilities: Record<number, number> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [drawer, setDrawer] = useState<null | "income" | "expenses" | "savings" | "asset" | "liability">(null);
  const [editing, setEditing] = useState<Asset | Liability | null>(null);
  const [saving, setSaving] = useState(false);

  const [income, setIncome] = useState({ monthlyIncome: profile.monthlyIncome, additionalIncome: profile.additionalIncome, incomeFrequency: profile.incomeFrequency });
  const [expenses, setExpenses] = useState<Record<string, number>>({ ...profile.expenses });
  const [savings, setSavings] = useState({ cashSavings: profile.cashSavings, emergencySavings: profile.emergencySavings, monthlySavings: profile.monthlySavings });
  const [assetForm, setAssetForm] = useState({ name: "", type: "property", value: 0 });
  const [liabForm, setLiabForm] = useState({ name: "", type: "personal_loan", balance: 0, monthlyPayment: 0, interestRate: 0.15, remainingMonths: 24 });

  async function save(url: string, method: string, body: unknown, msg: string) {
    setSaving(true);
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!r.ok) {
      toast({ title: "Couldn't save changes", tone: "warn" });
      return;
    }
    toast({ title: msg });
    setDrawer(null);
    setEditing(null);
    router.refresh();
  }

  const expenseRows = EXPENSE_CATEGORIES.map((cat) => ({ key: cat.key, label: cat.label, value: profile.expenses[cat.key] ?? 0, tone: cat.essential ? ("ink" as const) : ("accent" as const) })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader eyebrow="Financial Life · Financial Twin" title="Your Financial Twin" description="The living model every simulation starts from. Edit any value — scenarios, goals, and AI explanations update with it." actions={<Button href="/simulations/new" variant="accent">Simulate current plan</Button>} />

      <Stagger stagger={0.07} className="space-y-5">
        <StaggerItem>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard dark label="Net Worth" value={m.netWorth} format={(n) => formatMoney(n, c)} delta={<span className="text-accent">{formatMoney(m.totalAssets, c, { compact: true })} assets − {formatMoney(m.totalDebt, c, { compact: true })} debt</span>} />
            <MetricCard label="Monthly Cash Flow" value={m.savings} format={(n) => formatMoney(n, c, { sign: true })} delta={`${formatPct(m.savingsRate, 1)} of income saved`} deltaTone="good" />
            <MetricCard label="Emergency Coverage" display={formatMonths(m.emergencyCoverage)} delta={`${formatMoney(profile.emergencySavings, c)} buffer`} />
            <MetricCard label="Liquid Assets" value={m.liquid} format={(n) => formatMoney(n, c)} delta={`${formatMoney(m.investments, c, { compact: true })} invested`} />
          </div>
        </StaggerItem>

        <div className="grid gap-5 lg:grid-cols-2">
          <StaggerItem>
            <Card className="h-full group">
              <CardTitle action={<EditButton onClick={() => setDrawer("income")} />}>Income</CardTitle>
              <div className="text-[30px] font-extrabold tracking-tight tnum">{formatMoney(m.income, c)}</div>
              <div className="text-[12px] text-muted">per month · {profile.incomeFrequency}</div>
              <KeyValue className="mt-3" rows={[{ k: "Primary income", v: formatMoney(profile.monthlyIncome, c) }, { k: "Additional income", v: formatMoney(profile.additionalIncome, c) }, { k: "Assumed growth", v: formatPct(econ.incomeGrowth, 1) + " / year" }]} />
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="h-full">
              <CardTitle action={<EditButton onClick={() => setDrawer("expenses")} />}>Expenses</CardTitle>
              <div className="flex items-baseline gap-4">
                <div className="text-[30px] font-extrabold tracking-tight tnum">{formatMoney(m.expenses, c)}</div>
                <div className="text-[12px] text-muted">
                  Essential <b className="text-ink tnum">{formatMoney(m.essential, c, { compact: true })}</b> · Flexible <b className="text-ink tnum">{formatMoney(m.flexible, c, { compact: true })}</b>
                </div>
              </div>
              <ProgressBar value={m.expenses > 0 ? m.essential / m.expenses : 0} tone="ink" className="mt-3" height={6} />
              <HBars rows={expenseRows.slice(0, 6)} currency={c} className="mt-4" />
            </Card>
          </StaggerItem>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <StaggerItem>
            <Card className="h-full">
              <CardTitle action={<Button size="xs" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditing(null); setAssetForm({ name: "", type: "property", value: 0 }); setDrawer("asset"); }}>Add</Button>}>Assets</CardTitle>
              <div className="text-[24px] font-extrabold tracking-tight tnum">{formatMoney(m.totalAssets, c)}</div>
              <ul className="mt-3 divide-y divide-line">
                {accounts.filter((a) => a.balance >= 0).map((a) => (
                  <li key={`acc-${a.id}`} className="flex items-center justify-between py-2.5 text-[13px]">
                    <Link href={`/accounts/${a.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                      {a.name} <StatusBadge dot={false} className="capitalize">{a.type}</StatusBadge>
                    </Link>
                    <span className="tnum font-bold">{formatMoney(a.balance, c)}</span>
                  </li>
                ))}
                {assets.map((a) => (
                  <li key={a.id} className="group flex items-center justify-between py-2.5 text-[13px]">
                    <span className="flex items-center gap-2 font-semibold">
                      {a.name} <StatusBadge dot={false} className="capitalize">{a.type}</StatusBadge>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tnum font-bold">{formatMoney(a.value, c)}</span>
                      <button className="grid h-7 w-7 place-items-center pill text-subtle opacity-0 transition-opacity hover:bg-card2 hover:text-ink group-hover:opacity-100" aria-label="Edit asset" onClick={() => { setEditing(a); setAssetForm({ name: a.name, type: a.type, value: a.value }); setDrawer("asset"); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="h-full">
              <CardTitle action={<Button size="xs" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditing(null); setLiabForm({ name: "", type: "personal_loan", balance: 0, monthlyPayment: 0, interestRate: 0.15, remainingMonths: 24 }); setDrawer("liability"); }}>Add</Button>}>Liabilities</CardTitle>
              <div className="flex items-baseline gap-3">
                <div className="text-[24px] font-extrabold tracking-tight tnum">{formatMoney(m.totalDebt, c)}</div>
                <div className="text-[12px] text-muted tnum">{formatMoney(m.monthlyDebtPayments, c)}/month · {formatPct(m.debtToIncome, 0)} of income</div>
              </div>
              <ul className="mt-3 divide-y divide-line">
                {accounts.filter((a) => a.balance < 0).map((a) => (
                  <li key={`acc-${a.id}`} className="flex items-center justify-between py-2.5 text-[13px]">
                    <Link href={`/accounts/${a.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                      {a.name} <StatusBadge dot={false}>credit</StatusBadge>
                    </Link>
                    <span className="tnum font-bold text-bad">{formatMoney(a.balance, c)}</span>
                  </li>
                ))}
                {liabilities.map((l) => (
                  <li key={l.id} className="group flex items-center justify-between py-2.5 text-[13px]">
                    <span>
                      <span className="flex items-center gap-2 font-semibold">
                        {l.name} <StatusBadge dot={false} className="capitalize">{l.type.replace("_", " ")}</StatusBadge>
                      </span>
                      <span className="text-[11px] text-muted tnum">
                        {formatMoney(l.monthlyPayment, c)}/mo · {formatPct(l.interestRate, 1)} · {l.remainingMonths} months left
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tnum font-bold">{formatMoney(l.balance, c)}</span>
                      <button className="grid h-7 w-7 place-items-center pill text-subtle opacity-0 transition-opacity hover:bg-card2 hover:text-ink group-hover:opacity-100" aria-label="Edit liability" onClick={() => { setEditing(l); setLiabForm({ name: l.name, type: l.type, balance: l.balance, monthlyPayment: l.monthlyPayment, interestRate: l.interestRate, remainingMonths: l.remainingMonths }); setDrawer("liability"); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
                {liabilities.length === 0 && accounts.every((a) => a.balance >= 0) && <li className="py-3 text-[12.5px] text-muted">No debt recorded.</li>}
              </ul>
            </Card>
          </StaggerItem>
        </div>

        <StaggerItem>
          <Card>
            <CardTitle action={<Link href="/goals" className="inline-flex items-center gap-1 text-[12px] font-bold text-muted hover:text-ink">Goals center <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>Goals</CardTitle>
            {goals.length === 0 ? (
              <div className="rounded-2xl bg-card2 p-6 text-center text-[13px] text-muted">Give your future something to measure.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {goals.map((g) => (
                  <GoalCard key={g.id} goal={g} currency={c} probability={goalProbabilities[g.id] ?? null} compact />
                ))}
              </div>
            )}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardTitle hint="These feed every simulation. Change them in the Economic Environment." action={<Link href="/economy" className="inline-flex items-center gap-1 text-[12px] font-bold text-muted hover:text-ink">Economic environment <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>Financial Assumptions</CardTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {ASSUMPTION_DEFS.map((d) => (
                <Link key={d.key} href={`/economy/${d.key}`} className="rounded-2xl bg-card2 p-3.5 transition-colors hover:bg-card3">
                  <div className="label-sm">{d.label}</div>
                  <div className="mt-1 text-[20px] font-extrabold tracking-tight tnum">{d.unit === "%" ? formatPct(econ[d.key], 1) : `${econ[d.key]} yrs`}</div>
                </Link>
              ))}
            </div>
          </Card>
        </StaggerItem>
      </Stagger>

      <Drawer open={drawer === "income"} onClose={() => setDrawer(null)} title="Edit income" footer={<Button className="w-full" loading={saving} onClick={() => save("/api/profile", "PATCH", income, "Income updated")}>Save changes</Button>}>
        <div className="space-y-4">
          <Field label="Monthly income" hint="Net amount you receive each month."><MoneyInput currency={c} value={income.monthlyIncome} onChange={(v) => setIncome({ ...income, monthlyIncome: v })} /></Field>
          <Field label="Additional income"><MoneyInput currency={c} value={income.additionalIncome} onChange={(v) => setIncome({ ...income, additionalIncome: v })} /></Field>
          <Field label="Frequency"><Select value={income.incomeFrequency} onChange={(e) => setIncome({ ...income, incomeFrequency: e.target.value })}><option value="monthly">Monthly</option><option value="biweekly">Every two weeks</option><option value="irregular">Irregular</option></Select></Field>
        </div>
      </Drawer>

      <Drawer open={drawer === "expenses"} onClose={() => setDrawer(null)} title="Edit monthly expenses" footer={<div className="flex items-center justify-between gap-3"><div className="text-[12px] text-muted">Total <b className="text-ink tnum">{formatMoney(Object.values(expenses).reduce((a, b) => a + (Number(b) || 0), 0), c)}</b></div><Button loading={saving} onClick={() => save("/api/profile", "PATCH", { expenses }, "Expenses updated")}>Save changes</Button></div>}>
        <div className="grid grid-cols-2 gap-3">
          {EXPENSE_CATEGORIES.map((cat) => (
            <Field key={cat.key} label={cat.label} hint={cat.essential ? "Essential" : "Flexible"}>
              <MoneyInput currency={c} value={expenses[cat.key] ?? 0} onChange={(v) => setExpenses({ ...expenses, [cat.key]: v })} />
            </Field>
          ))}
        </div>
      </Drawer>

      <Drawer open={drawer === "asset"} onClose={() => setDrawer(null)} title={editing ? "Edit asset" : "Add asset"} footer={<div className="flex gap-2">{editing && <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => save("/api/assets", "DELETE", { id: editing.id }, "Asset removed")}>Remove</Button>}<Button className="flex-1" loading={saving} onClick={() => save("/api/assets", editing ? "PATCH" : "POST", editing ? { id: editing.id, ...assetForm } : assetForm, editing ? "Asset updated" : "Asset added")}>{editing ? "Save" : "Add asset"}</Button></div>}>
        <div className="space-y-4">
          <Field label="Name"><Input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="Apartment" /></Field>
          <Field label="Type"><Select value={assetForm.type} onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}>{ASSET_TYPES.filter((t) => !["cash", "bank"].includes(t.key)).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select></Field>
          <Field label="Current value"><MoneyInput currency={c} value={assetForm.value} onChange={(v) => setAssetForm({ ...assetForm, value: v })} /></Field>
          <p className="text-[11.5px] text-muted">Liquid holdings (bank, savings, investments) live under Accounts.</p>
        </div>
      </Drawer>

      <Drawer open={drawer === "liability"} onClose={() => setDrawer(null)} title={editing ? "Edit liability" : "Add liability"} footer={<div className="flex gap-2">{editing && <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => save("/api/liabilities", "DELETE", { id: editing.id }, "Liability removed")}>Remove</Button>}<Button className="flex-1" loading={saving} onClick={() => save("/api/liabilities", editing ? "PATCH" : "POST", editing ? { id: editing.id, ...liabForm } : liabForm, editing ? "Liability updated" : "Liability added")}>{editing ? "Save" : "Add liability"}</Button></div>}>
        <div className="space-y-4">
          <Field label="Name"><Input value={liabForm.name} onChange={(e) => setLiabForm({ ...liabForm, name: e.target.value })} placeholder="Car loan" /></Field>
          <Field label="Type"><Select value={liabForm.type} onChange={(e) => setLiabForm({ ...liabForm, type: e.target.value })}>{LIABILITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select></Field>
          <Field label="Remaining balance"><MoneyInput currency={c} value={liabForm.balance} onChange={(v) => setLiabForm({ ...liabForm, balance: v })} /></Field>
          <Field label="Monthly payment"><MoneyInput currency={c} value={liabForm.monthlyPayment} onChange={(v) => setLiabForm({ ...liabForm, monthlyPayment: v })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Interest rate"><Input type="number" step="0.5" suffix="%" value={Math.round(liabForm.interestRate * 1000) / 10} onChange={(e) => setLiabForm({ ...liabForm, interestRate: Number(e.target.value) / 100 })} /></Field>
            <Field label="Remaining duration"><Input type="number" suffix="months" value={liabForm.remainingMonths} onChange={(e) => setLiabForm({ ...liabForm, remainingMonths: Number(e.target.value) })} /></Field>
          </div>
        </div>
      </Drawer>
    </>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 pill px-2.5 py-1 text-[12px] font-semibold text-muted transition-colors hover:bg-card2 hover:text-ink focus-ring">
      <Pencil className="h-3.5 w-3.5" /> Edit
    </button>
  );
}
