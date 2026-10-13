"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowUpRight } from "lucide-react";
import { Stagger, StaggerItem } from "../motion/stagger";
import { Card, CardTitle, MetricCard, PageHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Field, Input, MoneyInput, Select, OptionCard } from "../ui/field";
import { ConfirmDialog } from "../ui/overlay";
import { EmptyState, Icon } from "../ui/states";
import { AccountCard, TransactionRow, ACCOUNT_ICON, type TxData } from "../domain/cards";
import { GroupedBars, Sparkline } from "../charts/charts";
import { useToast } from "../motion/toast";
import { formatMoney, formatPct } from "@/lib/format";
import { ACCOUNT_TYPES, type TwinMetrics } from "@/lib/finance";

type Acc = { id: number; name: string; type: string; balance: number; currency: string; institution: string | null; updatedAt: string };

export function AccountsView({ currency: c, accounts, metrics: m, months }: { currency: string; accounts: Acc[]; metrics: TwinMetrics; months: { label: string; income: number; expense: number }[] }) {
  const positive = accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0);
  const negative = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);
  return (
    <>
      <PageHeader eyebrow="Financial Life · Accounts" title="Accounts" description="Every liquid holding in your Financial Twin. Balances flow into net worth, emergency coverage and every simulation." actions={<><Button href="/transactions/import" variant="secondary">Import transactions</Button><Button href="/accounts/new" icon={<Plus className="h-4 w-4" />}>Add account</Button></>} />
      {accounts.length === 0 ? (
        <EmptyState icon="Wallet" title="Add your first account" description="Add your first account to start modeling your financial life." action={<Button href="/accounts/new">Add account</Button>} />
      ) : (
        <Stagger stagger={0.06} className="space-y-5">
          <StaggerItem>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard dark label="Total Balance" value={positive + negative} format={(n) => formatMoney(n, c)} delta={<span className="text-accent">{accounts.length} accounts</span>} />
              <MetricCard label="Liquid Assets" value={positive} format={(n) => formatMoney(n, c)} delta="Cash, savings and investments" />
              <MetricCard label="Card Debt" value={Math.abs(negative)} format={(n) => formatMoney(n, c)} deltaTone={negative < 0 ? "warn" : "neutral"} delta={negative < 0 ? "Carried on credit accounts" : "No card debt"} />
              <MetricCard label="Monthly Net Flow" value={m.savings} format={(n) => formatMoney(n, c, { sign: true })} deltaTone="good" delta={`${formatPct(m.savingsRate, 0)} savings rate`} />
            </div>
          </StaggerItem>
          <div className="grid gap-5 lg:grid-cols-3">
            <StaggerItem className="lg:col-span-2 space-y-3">
              {accounts.map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </StaggerItem>
            <StaggerItem>
              <Card className="h-full">
                <CardTitle>Cash flow · 6 months</CardTitle>
                <GroupedBars currency={c} height={180} groups={months.map((mo) => ({ label: mo.label, values: [{ key: "Income", value: mo.income, tone: "ink" }, { key: "Expenses", value: mo.expense, tone: "accent" }] }))} />
                <p className="mt-3 text-[11.5px] text-muted">Based on recorded transactions. The Twin's modelled budget may differ.</p>
              </Card>
            </StaggerItem>
          </div>
        </Stagger>
      )}
    </>
  );
}

export function AccountForm({ currency }: { currency: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", type: "bank", balance: 0, institution: "" });
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!form.name.trim()) return toast({ title: "Give the account a name", tone: "warn" });
    setSaving(true);
    const r = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, currency, balance: form.type === "credit" ? -Math.abs(form.balance) : form.balance }) });
    setSaving(false);
    if (!r.ok) return toast({ title: "Couldn't add account", tone: "warn" });
    toast({ title: "Account added", description: `${form.name} is now part of your Twin.` });
    router.push("/accounts");
    router.refresh();
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Accounts · New" title="Add an account" description="Balances update your net worth and emergency coverage immediately." />
      <Card className="space-y-5">
        <div>
          <div className="mb-2 text-[12.5px] font-semibold">Type</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACCOUNT_TYPES.map((t) => (
              <OptionCard key={t.key} compact selected={form.type === t.key} onClick={() => setForm({ ...form, type: t.key })} title={t.label} icon={<Icon name={ACCOUNT_ICON[t.key] ?? "Wallet"} className="h-4 w-4" />} />
            ))}
          </div>
        </div>
        <Field label="Account name"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.type === "credit" ? "Credit Card" : "Main Bank"} /></Field>
        <Field label="Institution" hint="Optional"><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="CIB, NBE, Thndr…" /></Field>
        <Field label={form.type === "credit" ? "Outstanding balance" : "Current balance"} hint={form.type === "credit" ? "Entered as debt — it reduces your net worth." : undefined}><MoneyInput currency={currency} value={form.balance} onChange={(v) => setForm({ ...form, balance: v })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" href="/accounts">Cancel</Button>
          <Button onClick={submit} loading={saving}>Add account</Button>
        </div>
      </Card>
    </div>
  );
}

export function AccountDetailView({ currency: c, account, transactions, months, goals, simulations }: { currency: string; account: Acc; transactions: TxData[]; months: { label: string; income: number; expense: number }[]; goals: { id: number; name: string }[]; simulations: { id: number; name: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: account.name, balance: account.balance, institution: account.institution ?? "" });
  const inflow = transactions.filter((t) => t.type === "income").slice(0, 60).reduce((s, t) => s + t.amount, 0) / Math.max(1, months.filter((m) => m.income > 0).length || 1);
  const outflow = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) / Math.max(1, months.filter((m) => m.expense > 0).length || 1);
  const trend = (() => {
    let b = account.balance;
    const arr = [b];
    for (const t of transactions.slice(0, 40)) {
      b -= t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0;
      arr.unshift(b);
    }
    return arr;
  })();

  async function remove() {
    await fetch("/api/accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id }) });
    toast({ title: "Account removed" });
    router.push("/accounts");
    router.refresh();
  }
  async function save() {
    await fetch("/api/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: account.id, ...form }) });
    toast({ title: "Account updated" });
    setEditing(false);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1"><Link href="/accounts" className="hover:text-ink">Accounts</Link> / {account.name}</span>}
        title={<span className="inline-flex items-center gap-3"><span className="grid h-11 w-11 place-items-center pill bg-card3"><Icon name={ACCOUNT_ICON[account.type] ?? "Wallet"} className="h-5 w-5" /></span>{account.name}</span>}
        description={`${account.type} account${account.institution ? ` at ${account.institution}` : ""}`}
        actions={<><Button variant="secondary" onClick={() => setEditing((e) => !e)}>{editing ? "Close" : "Edit"}</Button><Button href={`/transactions/new?account=${account.id}`} icon={<Plus className="h-4 w-4" />}>Add Transaction</Button></>}
      />
      {editing && (
        <Card className="mb-5 grid gap-4 md:grid-cols-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Institution"><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></Field>
          <Field label="Balance"><Input type="number" prefix={c} value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} /></Field>
          <div className="flex items-end gap-2"><Button onClick={save}>Save</Button><Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete</Button></div>
        </Card>
      )}
      <Stagger stagger={0.06} className="space-y-5">
        <StaggerItem>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard dark label="Current Balance" value={account.balance} format={(n) => formatMoney(n, c)} delta={<span className="text-accent">Updated {new Date(account.updatedAt).toLocaleDateString("en-GB")}</span>} />
            <MetricCard label="Monthly Inflow" value={inflow} format={(n) => formatMoney(n, c)} delta="average of recorded months" />
            <MetricCard label="Monthly Outflow" value={outflow} format={(n) => formatMoney(n, c)} delta="average of recorded months" />
            <MetricCard label="Net Change" value={inflow - outflow} format={(n) => formatMoney(n, c, { sign: true })} deltaTone={inflow - outflow >= 0 ? "good" : "warn"} delta="per month" />
          </div>
        </StaggerItem>
        <div className="grid gap-5 lg:grid-cols-3">
          <StaggerItem className="lg:col-span-2">
            <Card>
              <CardTitle>Balance trend</CardTitle>
              <div className="flex items-end justify-between gap-4">
                <Sparkline data={trend} width={520} height={120} color="var(--accent)" className="w-full" />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-subtle"><span>Reconstructed from the last {Math.min(40, transactions.length)} transactions</span><span>Today</span></div>
            </Card>
            <Card className="mt-5">
              <CardTitle>Cash flow</CardTitle>
              <GroupedBars currency={c} height={160} groups={months.map((mo) => ({ label: mo.label, values: [{ key: "In", value: mo.income, tone: "ink" }, { key: "Out", value: mo.expense, tone: "accent" }] }))} />
            </Card>
          </StaggerItem>
          <StaggerItem className="space-y-5">
            <Card>
              <CardTitle>Linked goals</CardTitle>
              <ul className="space-y-1.5">
                {goals.map((g) => (
                  <li key={g.id}><Link href={`/goals/${g.id}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-[13px] font-semibold hover:bg-card2">{g.name}<ArrowUpRight className="h-3.5 w-3.5 text-subtle" /></Link></li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitle>Related simulations</CardTitle>
              <ul className="space-y-1.5">
                {simulations.map((s) => (
                  <li key={s.id}><Link href={`/simulations/${s.id}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-[13px] font-semibold hover:bg-card2">{s.name}<ArrowUpRight className="h-3.5 w-3.5 text-subtle" /></Link></li>
                ))}
              </ul>
            </Card>
          </StaggerItem>
        </div>
        <StaggerItem>
          <Card className="p-2">
            <CardTitle className="px-3 pt-3">Recent transactions</CardTitle>
            {transactions.length === 0 ? <div className="px-4 pb-6 text-[13px] text-muted">No transactions on this account yet.</div> : <div className="divide-y divide-line">{transactions.slice(0, 15).map((t) => <TransactionRow key={t.id} t={t} currency={c} />)}</div>}
          </Card>
        </StaggerItem>
      </Stagger>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} title="Delete this account?" description="Transactions linked to it will be kept but unlinked. Net worth and simulations will update immediately." confirmLabel="Delete account" destructive />
    </>
  );
}
