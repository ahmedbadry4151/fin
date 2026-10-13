"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, FileSpreadsheet } from "lucide-react";
import { Card, PageHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Select } from "../ui/field";
import { StatusBadge } from "../ui/pill";
import { useToast } from "../motion/toast";
import { EASE_OUT } from "../motion/stagger";
import { formatMoney } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/finance";

const STEPS = ["Upload", "Map columns", "Validate", "Preview", "Import"];
const SAMPLE = `date,description,amount,category
2025-01-03,Salary,32000,salary
2025-01-05,Rent,-7500,housing
2025-01-08,Carrefour groceries,-920,food
2025-01-12,Netflix,-165,subscriptions
2025-01-15,Fuel,-850,transportation`;

type Row = Record<string, string>;
type Mapped = { description: string; amount: number; date: string; category: string; type: string; status: "valid" | "warning" | "invalid" | "duplicate"; note?: string };

function parseCSV(text: string): { headers: string[]; rows: Row[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const split = (l: string) => l.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0]);
  const rows = lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [headers[i] ?? `col${i}`, v])));
  return { headers, rows };
}

function guessCategory(desc: string) {
  const d = desc.toLowerCase();
  if (/salary|payroll/.test(d)) return "salary";
  if (/rent|mortgage/.test(d)) return "housing";
  if (/grocer|market|carrefour|food|restaurant|dinner|coffee/.test(d)) return "food";
  if (/fuel|uber|careem|taxi|petrol/.test(d)) return "transportation";
  if (/netflix|spotify|subscription|gym/.test(d)) return "subscriptions";
  if (/electric|water|internet|mobile|phone/.test(d)) return "utilities";
  if (/pharma|clinic|doctor|hospital/.test(d)) return "healthcare";
  if (/loan|card payment|instal/.test(d)) return "debt";
  return "other";
}

export function ImportView({ currency: c, accounts, existingKeys }: { currency: string; accounts: { id: number; name: string }[]; existingKeys: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [raw, setRaw] = useState<{ headers: string[]; rows: Row[] }>({ headers: [], rows: [] });
  const [map, setMap] = useState({ date: "", description: "", amount: "", category: "" });
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 0);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const existing = useMemo(() => new Set(existingKeys), [existingKeys]);

  function load(text: string) {
    const parsed = parseCSV(text);
    setRaw(parsed);
    const h = parsed.headers.map((x) => x.toLowerCase());
    const find = (...cands: string[]) => parsed.headers[h.findIndex((x) => cands.some((cnd) => x.includes(cnd)))] ?? "";
    setMap({ date: find("date"), description: find("desc", "memo", "name", "payee"), amount: find("amount", "value", "sum"), category: find("categ") });
    setStep(1);
  }

  const mapped: Mapped[] = useMemo(() => {
    const seen = new Set<string>();
    return raw.rows.map((r) => {
      const desc = (r[map.description] ?? "").trim();
      const amtRaw = Number((r[map.amount] ?? "").replace(/[^\d.-]/g, ""));
      const date = (r[map.date] ?? "").slice(0, 10);
      const cat = (r[map.category] ?? "").trim().toLowerCase() || guessCategory(desc);
      const type = amtRaw > 0 && /salary|income|freelance|refund/.test(cat + desc.toLowerCase()) ? "income" : amtRaw > 0 && !map.category ? "income" : "expense";
      const amount = Math.abs(amtRaw);
      const key = `${date}|${desc.toLowerCase()}|${amount}`;
      let status: Mapped["status"] = "valid";
      let note: string | undefined;
      if (!desc || !Number.isFinite(amtRaw) || amount === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        status = "invalid";
        note = !desc ? "Missing description" : !/^\d{4}-\d{2}-\d{2}$/.test(date) ? "Date must be YYYY-MM-DD" : "Amount is not a number";
      } else if (existing.has(key) || seen.has(key)) {
        status = "duplicate";
        note = "Already recorded";
      } else if (!EXPENSE_CATEGORIES.some((x) => x.key === cat) && !["salary", "freelance", "income"].includes(cat)) {
        status = "warning";
        note = `Unknown category “${cat}” → other`;
      }
      seen.add(key);
      return { description: desc, amount, date, category: EXPENSE_CATEGORIES.some((x) => x.key === cat) || ["salary", "freelance", "income"].includes(cat) ? cat : "other", type, status, note };
    });
  }, [raw, map, existing]);

  const counts = useMemo(() => ({ valid: mapped.filter((m) => m.status === "valid").length, warning: mapped.filter((m) => m.status === "warning").length, invalid: mapped.filter((m) => m.status === "invalid").length, duplicate: mapped.filter((m) => m.status === "duplicate").length }), [mapped]);
  const importable = mapped.filter((m) => m.status === "valid" || m.status === "warning");

  async function doImport() {
    setImporting(true);
    setStep(4);
    const r = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: importable.map((m) => ({ ...m, accountId })) }) });
    setImporting(false);
    if (!r.ok) return toast({ title: "Some rows could not be imported", description: "Check the validation step and try again.", tone: "warn" });
    setDone(importable.length);
    toast({ title: "Transactions imported successfully", description: `${importable.length} rows added to ${accounts.find((a) => a.id === accountId)?.name ?? "your account"}.` });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Transactions · Import" title="Import transactions" description="Upload a CSV export from your bank. We'll map the columns, validate every row and show you a preview before anything is saved." />
      <ol className="mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`relative inline-flex items-center gap-2 pill px-3 py-1.5 text-[12px] font-semibold ${i === step ? "text-ink-fg" : i < step ? "text-ink" : "text-muted"}`}>
              {i === step && <motion.span layoutId="import-step" className="absolute inset-0 pill bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative z-10 grid h-4 w-4 place-items-center pill bg-current/10 text-[10px]">{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
              <span className="relative z-10">{s}</span>
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
          {step === 0 && (
            <Card>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) f.text().then(load); }}
                className={`grid place-items-center rounded-[20px] border-2 border-dashed px-6 py-16 text-center transition-colors ${dragging ? "border-accent bg-accent/10" : "border-line-strong bg-card2"}`}
              >
                <span className="grid h-14 w-14 place-items-center pill bg-ink text-ink-fg"><Upload className="h-6 w-6" strokeWidth={1.5} /></span>
                <div className="mt-4 text-[16px] font-bold">Drag & drop a CSV file</div>
                <div className="mt-1 text-[12.5px] text-muted">or</div>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 pill bg-card px-4 py-2 text-[13px] font-semibold border border-line hover:bg-card3">
                  <FileSpreadsheet className="h-4 w-4" /> Choose file
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0]?.text().then(load)} />
                </label>
                <button onClick={() => load(SAMPLE)} className="mt-4 text-[12px] font-semibold text-muted underline-offset-2 hover:underline">Use a sample file instead</button>
              </div>
            </Card>
          )}
          {step === 1 && (
            <Card className="space-y-4">
              <div className="text-[13px] text-muted">We detected {raw.headers.length} columns and {raw.rows.length} rows. Confirm which column holds each field.</div>
              <div className="grid gap-3 md:grid-cols-4">
                {(["date", "description", "amount", "category"] as const).map((k) => (
                  <label key={k} className="block"><span className="mb-1.5 block text-[12px] font-semibold capitalize">{k}{k !== "category" && <span className="text-bad"> *</span>}</span><Select value={map[k]} onChange={(e) => setMap({ ...map, [k]: e.target.value })}><option value="">— none —</option>{raw.headers.map((h) => <option key={h} value={h}>{h}</option>)}</Select></label>
                ))}
              </div>
              <label className="block max-w-xs"><span className="mb-1.5 block text-[12px] font-semibold">Import into account</span><Select value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></label>
              <div className="flex justify-between pt-2"><Button variant="secondary" onClick={() => setStep(0)}>Back</Button><Button onClick={() => setStep(2)} disabled={!map.date || !map.description || !map.amount}>Validate rows</Button></div>
            </Card>
          )}
          {step === 2 && (
            <Card className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {([["valid", "good"], ["warning", "warn"], ["invalid", "bad"], ["duplicate", "neutral"]] as const).map(([k, tone]) => (
                  <div key={k} className="rounded-2xl bg-card2 p-4"><StatusBadge tone={tone} className="capitalize">{k}</StatusBadge><div className="mt-2 text-[26px] font-extrabold tnum">{counts[k]}</div></div>
                ))}
              </div>
              <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
                {mapped.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                    <StatusBadge tone={m.status === "valid" ? "good" : m.status === "warning" ? "warn" : m.status === "invalid" ? "bad" : "neutral"} className="w-24 justify-center capitalize">{m.status}</StatusBadge>
                    <span className="min-w-0 flex-1 truncate font-semibold">{m.description || "—"}</span>
                    <span className="text-muted">{m.note}</span>
                    <span className="tnum font-bold">{formatMoney(m.amount, c)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between pt-2"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button onClick={() => setStep(3)} disabled={importable.length === 0}>Preview {importable.length} rows</Button></div>
            </Card>
          )}
          {step === 3 && (
            <Card className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-card2 text-left"><tr>{["Date", "Description", "Category", "Type", "Amount"].map((h) => <th key={h} className="label px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-line">
                    {importable.slice(0, 50).map((m, i) => (
                      <motion.tr key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.03 }}>
                        <td className="px-4 py-2 tnum">{m.date}</td><td className="px-4 py-2 font-semibold">{m.description}</td><td className="px-4 py-2 capitalize">{m.category}</td><td className="px-4 py-2">{m.type}</td><td className="px-4 py-2 text-right tnum font-bold">{m.type === "expense" ? "−" : "+"}{formatMoney(m.amount, c)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between pt-2"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><Button variant="accent" onClick={doImport}>Import {importable.length} transactions</Button></div>
            </Card>
          )}
          {step === 4 && (
            <Card className="grid place-items-center py-16 text-center">
              <motion.span className="grid h-16 w-16 place-items-center pill bg-ink text-accent" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                {importing ? <motion.span className="h-6 w-6 pill border-2 border-accent border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} /> : <Check className="h-7 w-7" strokeWidth={2.5} />}
              </motion.span>
              <div className="mt-4 text-[20px] font-extrabold tracking-tight">{importing ? "Importing…" : `${done} transactions imported`}</div>
              <p className="mt-1 max-w-sm text-[13px] text-muted">{importing ? "Writing rows and updating the account balance." : "Your Financial Twin, analytics and AI context now include this data."}</p>
              {!importing && <div className="mt-6 flex gap-2"><Button href="/transactions">View transactions</Button><Button variant="secondary" href="/analytics/spending">Spending analytics</Button></div>}
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
