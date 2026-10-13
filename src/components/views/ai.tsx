"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, ChevronDown, Trash2, ArrowUpRight } from "lucide-react";
import { Card, CardTitle, KeyValue, PageHeader } from "../ui/card";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/pill";
import { Collapse } from "../motion/primitives";
import { Skeleton, Avatar } from "../ui/states";
import { HBars } from "../charts/charts";
import { EASE_OUT } from "../motion/stagger";
import { formatMoney, formatMonths, formatPct } from "@/lib/format";
import { SUGGESTED_QUESTIONS, type AiAnswer } from "@/lib/intelligence";
import type { TwinMetrics } from "@/lib/finance";

type Msg = { id: string; role: "user" | "assistant"; content: string; meta?: AiAnswer | null };

export function AiView({ currency: c, userName, metrics: m, emergencySavings, goal, activeScenario, history, initialQuestion }: { currency: string; userName: string; metrics: TwinMetrics; emergencySavings: number; goal: { id: number; name: string; targetAmount: number; currentAmount: number } | null; activeScenario: { id: number; name: string } | null; history: Msg[]; initialQuestion?: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(history);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((ms) => [...ms, { id: `u-${Date.now()}`, role: "user", content: text }]);
    setLoading(true);
    try {
      const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { answer: AiAnswer };
      setMessages((ms) => [...ms, { id: `a-${Date.now()}`, role: "assistant", content: d.answer.text, meta: d.answer }]);
    } catch {
      setMessages((ms) => [...ms, { id: `e-${Date.now()}`, role: "assistant", content: "AI analysis is temporarily unavailable. Your data is intact — try again in a moment.", meta: null }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  async function clear() {
    await fetch("/api/ai", { method: "DELETE" });
    setMessages([]);
    router.refresh();
  }

  return (
    <>
      <PageHeader eyebrow="Intelligence · AI Financial Intelligence" title="Ask your Financial Twin" description="Every answer is computed from your model and simulations. Expand “View model context” to see exactly what was used." actions={messages.length > 0 && <Button variant="secondary" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={clear}>Clear conversation</Button>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="flex min-h-[560px] flex-col p-0">
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {messages.length === 0 && !loading && (
                <div className="grid place-items-center py-10 text-center">
                  <span className="grid h-12 w-12 place-items-center pill bg-ink text-accent"><Sparkles className="h-5 w-5" /></span>
                  <div className="mt-4 text-[16px] font-bold">What would you like to understand?</div>
                  <p className="mt-1 max-w-sm text-[12.5px] text-muted">Ask about coverage, goals, a decision you're weighing, or which assumptions matter most.</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                    {msg.role === "assistant" && <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center pill bg-ink text-accent"><Sparkles className="h-4 w-4" /></span>}
                    <div className={`max-w-[85%] ${msg.role === "user" ? "pill bg-ink px-4 py-2.5 text-[13.5px] font-medium text-ink-fg" : "w-full"}`}>
                      {msg.role === "user" ? msg.content : <AssistantMessage msg={msg} c={c} onFollowUp={ask} />}
                    </div>
                    {msg.role === "user" && <Avatar name={userName} size={32} className="mt-0.5" />}
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <div className="flex gap-3">
                  <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center pill bg-ink text-accent"><Sparkles className="h-4 w-4" /></span>
                  <div className="w-full max-w-md space-y-2 rounded-2xl bg-card2 p-4">
                    <div className="text-[11.5px] font-semibold text-muted">Reading your Financial Twin → running simulation → analyzing…</div>
                    <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" />
                    <div className="grid grid-cols-2 gap-2 pt-1"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="border-t border-line p-4">
              <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => ask(q)} className="shrink-0 pill border border-line bg-card2 px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:bg-card3 hover:text-ink">{q}</button>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your financial future…" className="h-11 flex-1 pill border border-line bg-card px-4 text-[14px] outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" aria-label="Your question" />
                <Button type="submit" loading={loading} icon={<Send className="h-4 w-4" />} className="h-11 w-11 !px-0" aria-label="Send" />
              </form>
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card dark>
            <CardTitle><span className="text-ink-fg">Financial Context</span></CardTitle>
            <KeyValue dark rows={[{ k: "Net Worth", v: formatMoney(m.netWorth, c) }, { k: "Income", v: formatMoney(m.income, c) }, { k: "Expenses", v: formatMoney(m.expenses, c) }, { k: "Savings", v: formatMoney(m.savings, c) }, { k: "Emergency Coverage", v: formatMonths(m.emergencyCoverage) }, { k: "Savings Rate", v: formatPct(m.savingsRate, 0) }]} />
            <div className="mt-4 space-y-2">
              <div className="rounded-2xl bg-ink-fg/10 p-3"><div className="label-sm text-ink-fg/50">Current goal</div>{goal ? <Link href={`/goals/${goal.id}`} className="mt-0.5 flex items-center justify-between text-[13px] font-bold">{goal.name}<span className="tnum text-accent">{formatPct(goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0, 0)}</span></Link> : <div className="text-[12.5px] text-ink-fg/60">None yet</div>}</div>
              <div className="rounded-2xl bg-ink-fg/10 p-3"><div className="label-sm text-ink-fg/50">Active scenario</div>{activeScenario ? <Link href={`/scenarios/${activeScenario.id}`} className="mt-0.5 block text-[13px] font-bold">{activeScenario.name}</Link> : <div className="text-[12.5px] text-ink-fg/60">Current plan</div>}</div>
            </div>
            <div className="mt-3 text-[11px] text-ink-fg/50">Emergency savings {formatMoney(emergencySavings, c)} · context refreshes with your Twin</div>
          </Card>
          <Card>
            <div className="text-[13px] font-bold">How this works</div>
            <ol className="mt-2 space-y-1.5 text-[12px] text-muted">{["Understands intent", "Reads your Financial Twin", "Determines required data", "Runs or references a simulation", "Explains and suggests next exploration"].map((s, i) => <li key={s} className="flex gap-2"><span className="grid h-4 w-4 shrink-0 place-items-center pill bg-card3 text-[9.5px] font-bold text-ink">{i + 1}</span>{s}</li>)}</ol>
            <p className="mt-3 text-[11px] text-subtle">Educational analysis — not investment advice. Outputs are estimates under stated assumptions.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

const TONE: Record<string, string> = { accent: "text-accent-ink bg-accent", good: "text-good bg-good-soft", warn: "text-warn bg-warn-soft", bad: "text-bad bg-bad-soft", neutral: "bg-card2" };

function AssistantMessage({ msg, c, onFollowUp }: { msg: Msg; c: string; onFollowUp: (q: string) => void }) {
  const [open, setOpen] = useState(false);
  const a = msg.meta;
  return (
    <div className="space-y-3 rounded-[20px] bg-card2 p-4">
      <p className="text-[13.5px] leading-relaxed">{msg.content}</p>
      {a && a.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {a.kpis.map((k, i) => (
            <motion.div key={k.label + i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className={`rounded-2xl p-3 ${TONE[k.tone ?? "neutral"]}`}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">{k.label}</div>
              <div className="mt-0.5 text-[15px] font-extrabold tnum leading-tight">{k.value}</div>
              {k.hint && <div className="text-[10.5px] opacity-70">{k.hint}</div>}
            </motion.div>
          ))}
        </div>
      )}
      {a?.chart && a.chart.points.length > 0 && (
        <div className="rounded-2xl bg-card p-3">
          <div className="label-sm mb-2">{a.chart.title}</div>
          <HBars currency={c} rows={a.chart.points.map((p, i) => ({ label: p.label, value: p.value, display: p.display, tone: i === 0 ? "accent" : "ink" }))} />
        </div>
      )}
      {a && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {a.actions.map((ac) => (
              <Link key={ac.href + ac.label} href={ac.href} className="inline-flex items-center gap-1 pill bg-ink px-3 py-1.5 text-[12px] font-semibold text-ink-fg press">{ac.label} <ArrowUpRight className="h-3 w-3" /></Link>
            ))}
            <button onClick={() => setOpen((o) => !o)} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-ink">View model context <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} /></button>
          </div>
          <Collapse open={open}>
            <div className="grid gap-3 rounded-2xl border border-line bg-card p-3 text-[12px] md:grid-cols-2">
              <div><div className="label-sm mb-1">Data used</div><ul className="space-y-1 text-muted">{a.dataUsed.map((d) => <li key={d}>• {d}</li>)}</ul></div>
              <div><div className="label-sm mb-1">Assumptions</div><ul className="space-y-1 text-muted">{a.assumptions.map((d) => <li key={d}>• {d}</li>)}</ul></div>
              <div><div className="label-sm mb-1">Simulation</div><div className="text-muted">{a.simulation ? `${a.simulation.paths} paths · ${a.simulation.horizonYears} years · ${a.simulation.scenario}` : "No new simulation — computed directly from the Twin"}</div></div>
              <div><div className="label-sm mb-1">Result · timestamp</div><div className="flex items-center gap-2 text-muted"><StatusBadge tone="accent" dot={false}>{a.intent}</StatusBadge>{new Date(a.timestamp).toLocaleString("en-GB")}</div></div>
            </div>
          </Collapse>
          {a.followUps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
              {a.followUps.map((f) => <button key={f} onClick={() => onFollowUp(f)} className="pill border border-line bg-card px-3 py-1 text-[11.5px] font-semibold text-muted hover:text-ink">{f}</button>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
