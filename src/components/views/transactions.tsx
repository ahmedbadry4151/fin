"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Upload, Trash2, X } from "lucide-react";
import { Card, PageHeader, KeyValue } from "../ui/card";
import { Button, IconButton } from "../ui/button";
import { FilterPill, SegmentedControl, StatusBadge } from "../ui/pill";
import { Field, Input, MoneyInput, Select } from "../ui/field";
import { Drawer, ConfirmDialog } from "../ui/overlay";
import { EmptyState } from "../ui/states";
import { ReflowList, ReflowItem } from "../motion/primitives";
import { TransactionRow, type TxData } from "../domain/cards";
import { useToast } from "../motion/toast";
import { formatMoney, formatDate, toISODate } from "@/lib/format";
import { EXPENSE_CATEGORIES, CATEGORY_LABEL } from "@/lib/finance";

type TType = "all" | "income" | "expense" | "transfer";

export function TransactionsView({ currency: c, accounts, initial, initialQuery, initialCategory, initialType }: { currency: string; accounts: { id: number; name: string }[]; initial: TxData[]; initialQuery: string; initialCategory: string; initialType: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState<TType>((["all", "income", "expense", "transfer"].includes(initialType) ? initialType : "all") as TType);
  const [category, setCategory] = useState(initialCategory);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [range, setRange] = useState<"all" | "30" | "90">("all");
  const [selected, setSelected] = useState<TxData | null>(null);
  const [adding, setAdding] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TxData | null>(null);
  const accountName = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);

  useEffect(() => setRows(initial), [initial]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const since = range === "all" ? null : Date.now() - Number(range) * 86400000;
    return rows.filter((t) => (type === "all" || t.type === type) && (!category || t.category === category) && (!accountId || t.accountId === accountId) && (!since || new Date(t.date).getTime() >= since) && (!term || t.description.toLowerCase().includes(term) || (CATEGORY_LABEL[t.category] ?? t.category).toLowerCase().includes(term)));
  }, [rows, q, type, category, accountId, range]);

  const totals = useMemo(() => ({ income: filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), expense: filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) }), [filtered]);
  const categories = useMemo(() => Array.from(new Set(rows.map((t) => t.category))).sort(), [rows]);

  async function remove(t: TxData) {
    setRows((r) => r.filter((x) => x.id !== t.id));
    setSelected(null);
    setConfirmDelete(null);
    await fetch("/api/transactions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) });
    toast({ title: "Transaction removed" });
    router.refresh();
  }

  return (
    <>
      <PageHeader eyebrow="Financial Life · Transactions" title="Transactions" description="Recorded activity across your accounts. Filters reflow live; nothing disappears abruptly." actions={<><Button href="/transactions/import" variant="secondary" icon={<Upload className="h-4 w-4" />}>Import</Button><Button onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" />}>Add transaction</Button></>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 md:flex-none md:w-[320px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions" className="h-10 w-full pill border border-line bg-card pl-11 pr-4 text-[13px] outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" aria-label="Search transactions" />
        </div>
        <SegmentedControl layoutId="tx-type" value={type} onChange={setType} options={[{ value: "all", label: "All" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }, { value: "transfer", label: "Transfer" }]} />
        <SegmentedControl layoutId="tx-range" size="sm" value={range} onChange={setRange} options={[{ value: "all", label: "All time" }, { value: "90", label: "90 days" }, { value: "30", label: "30 days" }]} />
        <Select value={accountId ?? ""} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)} className="!h-10 !w-auto pill !py-0 text-[12.5px]" aria-label="Account filter">
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
        <FilterPill active={!category} onClick={() => setCategory("")}>All categories</FilterPill>
        {categories.map((k) => (
          <FilterPill key={k} active={category === k} onClick={() => setCategory(category === k ? "" : k)}>{CATEGORY_LABEL[k] ?? k}</FilterPill>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
            <EmptyState icon="ArrowLeftRight" title={rows.length === 0 ? "No transactions yet" : "Nothing matches these filters"} description={rows.length === 0 ? "Add or import transactions to unlock deeper analytics." : "Try widening the date range or clearing the category."} action={rows.length === 0 ? <Button href="/transactions/import">Import transactions</Button> : <Button variant="secondary" onClick={() => { setQ(""); setType("all"); setCategory(""); setAccountId(null); setRange("all"); }}>Clear filters</Button>} />
          ) : (
            <Card className="p-2">
              <ReflowList className="divide-y divide-line">
                {filtered.slice(0, 120).map((t, i) => (
                  <ReflowItem key={t.id} index={i} highlight={highlightId === t.id}>
                    <TransactionRow t={t} currency={c} accountName={t.accountId ? accountName[t.accountId] : undefined} onClick={() => setSelected(t)} selected={selected?.id === t.id} actions={<IconButton label="Delete" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setConfirmDelete(t); }}><Trash2 className="h-3.5 w-3.5" /></IconButton>} />
                  </ReflowItem>
                ))}
              </ReflowList>
              {filtered.length > 120 && <div className="px-4 py-3 text-center text-[12px] text-muted">Showing the first 120 of {filtered.length} transactions.</div>}
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card dark>
            <div className="label text-ink-fg/55">In view</div>
            <div className="mt-2 text-[24px] font-extrabold tracking-tight tnum">{filtered.length} <span className="text-[13px] font-semibold text-ink-fg/60">transactions</span></div>
            <KeyValue dark className="mt-3" rows={[{ k: "Income", v: formatMoney(totals.income, c) }, { k: "Expenses", v: formatMoney(totals.expense, c) }, { k: "Net", v: formatMoney(totals.income - totals.expense, c, { sign: true }) }]} />
          </Card>
          <Card>
            <div className="text-[13px] font-bold">Analytics from this data</div>
            <p className="mt-1 text-[12px] text-muted">Spending analytics and the AI's “what changed” answers are built from these rows.</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" href="/analytics/spending">Spending analytics</Button><Button size="sm" variant="secondary" href="/ai?q=What%20changed%20in%20my%20finances%20this%20month%3F">Ask AI</Button></div>
          </Card>
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Transaction" footer={selected && <div className="flex gap-2"><Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(selected)}>Delete</Button><Button variant="secondary" className="flex-1" href={`/transactions?category=${selected.category}`}>View category</Button></div>}>
        {selected && (
          <div>
            <div className="text-[22px] font-extrabold tracking-tight tnum">{selected.type === "expense" ? "−" : selected.type === "income" ? "+" : ""}{formatMoney(selected.amount, c)}</div>
            <div className="mt-1 text-[14px] font-semibold">{selected.description}</div>
            <div className="mt-3"><StatusBadge tone={selected.type === "income" ? "good" : selected.type === "transfer" ? "neutral" : "ink"}>{selected.type}</StatusBadge></div>
            <KeyValue className="mt-4" rows={[{ k: "Category", v: CATEGORY_LABEL[selected.category] ?? selected.category }, { k: "Date", v: formatDate(selected.date, "long") }, { k: "Account", v: selected.accountId ? accountName[selected.accountId] ?? "—" : "—" }, { k: "Reference", v: `#${selected.id}` }]} />
          </div>
        )}
      </Drawer>

      <Drawer open={adding} onClose={() => setAdding(false)} title="Add transaction">
        <TransactionForm embedded currency={c} accounts={accounts} onCreated={(t) => { setRows((r) => [t, ...r]); setHighlightId(t.id); setTimeout(() => setHighlightId(null), 1200); setAdding(false); }} />
      </Drawer>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && remove(confirmDelete)} title="Delete transaction?" description="The linked account balance will be adjusted back. This can't be undone." confirmLabel="Delete" destructive />
    </>
  );
}

export function TransactionForm({ currency, accounts, embedded = false, onCreated }: { currency: string; accounts: { id: number; name: string }[]; embedded?: boolean; onCreated?: (t: TxData) => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [form, setForm] = useState({ description: "", category: "food", type: "expense", amount: 0, date: toISODate(new Date()), accountId: Number(params.get("account")) || accounts[0]?.id || 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!form.description.trim() || form.amount <= 0) return setError("Add a description and an amount greater than zero.");
    setError(null);
    setSaving(true);
    const r = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!r.ok) return setError("We couldn't save this transaction.");
    const d = await r.json();
    const t = d.transactions[0];
    toast({ title: "Transaction added", description: `${form.description} · ${formatMoney(form.amount, currency)}` });
    if (onCreated) onCreated({ ...t, date: String(t.date) });
    else {
      router.push("/transactions");
      router.refresh();
    }
  }

  const body = (
    <div className="space-y-4">
      <SegmentedControl layoutId={embedded ? "tx-form-type-embedded" : "tx-form-type"} value={form.type} onChange={(v) => setForm({ ...form, type: v, category: v === "income" ? "salary" : v === "transfer" ? "savings" : "food" })} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }, { value: "transfer", label: "Transfer" }]} />
      <Field label="Description"><Input autoFocus value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Groceries, salary, rent…" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount"><MoneyInput currency={currency} value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} /></Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {form.type === "income" ? <><option value="salary">Salary</option><option value="freelance">Freelance</option><option value="income">Other income</option></> : form.type === "transfer" ? <><option value="savings">Savings</option><option value="investment">Investment</option><option value="transfer">Transfer</option></> : EXPENSE_CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
          </Select>
        </Field>
        <Field label="Account"><Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      </div>
      {error && <div className="rounded-xl bg-warn-soft px-3 py-2 text-[12px] font-medium text-warn">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">{!embedded && <Button variant="secondary" href="/transactions">Cancel</Button>}<Button onClick={submit} loading={saving} className={embedded ? "w-full" : ""}>Add transaction</Button></div>
    </div>
  );
  if (embedded) return body;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Transactions · New" title="Add a transaction" description="Account balances and analytics update as soon as it's saved." />
      <Card>{body}</Card>
    </div>
  );
}

export function CloseIcon() {
  return <X className="h-4 w-4" />;
}
