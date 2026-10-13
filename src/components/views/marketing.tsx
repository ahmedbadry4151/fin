"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Moon, Sun, Sparkles, Menu, X } from "lucide-react";
import { Logo } from "../shell/app-shell";
import { Button } from "../ui/button";
import { AccentChip, StatusBadge, Chip } from "../ui/pill";
import { Icon } from "../ui/states";
import { AnimatedNumber, useCountUp } from "../motion/count-up";
import { ProgressBar } from "../motion/progress";
import { Reveal, Stagger, StaggerItem, EASE_OUT } from "../motion/stagger";
import { Collapse, KenBurns } from "../motion/primitives";
import { FanChart } from "../charts/fan-chart";
import { HBars } from "../charts/charts";
import { useTheme } from "../providers";
import { formatMoney } from "@/lib/format";
import { runSimulation, type SimTwin, type EconAssumptions } from "@/lib/simulation";
import { SCENARIO_TEMPLATES } from "@/lib/scenarios";
import { ASSUMPTION_DEFS, DEFAULT_ASSUMPTIONS } from "@/lib/economy";

export const DEMO_TWIN: SimTwin = {
  monthlyIncome: 32000,
  monthlyExpenses: 19650,
  essentialExpenses: 16700,
  cash: 168200,
  investments: 95000,
  emergencySavings: 88560,
  assets: [{ value: 185000, growth: -0.12 }, { value: 30000, growth: 0.04 }],
  liabilities: [{ balance: 41200, payment: 1250, rate: 0.12 }, { balance: 8500, payment: 425, rate: 0.24 }],
  goal: { id: 1, name: "Buy a Home", target: 1500000, current: 126000, contribution: 8500, months: 96 },
};
const DEMO_ECON: EconAssumptions = { ...DEFAULT_ASSUMPTIONS, horizonYears: 10 };

/* ---------------- Public chrome ---------------- */
const LINKS = [{ href: "/product", label: "Product" }, { href: "/how-it-works", label: "How it works" }, { href: "/features", label: "Features" }, { href: "/showcase", label: "Scenarios" }, { href: "/security", label: "Security" }, { href: "/faq", label: "FAQ" }];

export function PublicNav() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">{LINKS.map((l) => <Link key={l.href} href={l.href} className="pill px-3.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-card2 hover:text-ink">{l.label}</Link>)}</nav>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="grid h-9 w-9 place-items-center pill text-muted hover:bg-card2 hover:text-ink" aria-label="Toggle theme">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          <Button href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</Button>
          <Button href="/signup" size="sm" className="hidden sm:inline-flex">Build My Financial Twin</Button>
          <button onClick={() => setOpen(!open)} className="grid h-9 w-9 place-items-center pill lg:hidden" aria-label="Menu">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
        </div>
      </div>
      <Collapse open={open}><div className="border-t border-line px-5 py-3 lg:hidden"><nav className="flex flex-col">{LINKS.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-[14px] font-semibold">{l.label}</Link>)}<div className="mt-2 flex gap-2"><Button href="/login" variant="secondary" className="flex-1">Log in</Button><Button href="/signup" className="flex-1">Sign up</Button></div></nav></div></Collapse>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-4">
        <div><Logo /><p className="mt-3 max-w-xs text-[12.5px] text-muted">A living financial digital twin and scenario laboratory. Understand today. Simulate what could happen next.</p></div>
        {[{ h: "Product", items: [["Overview", "/product"], ["How it works", "/how-it-works"], ["Features", "/features"], ["Scenario showcase", "/showcase"], ["Demo mode", "/demo"]] }, { h: "Trust", items: [["Security & privacy", "/security"], ["FAQ", "/faq"], ["Model transparency", "/security#model"]] }, { h: "Account", items: [["Log in", "/login"], ["Sign up", "/signup"], ["Forgot password", "/forgot-password"]] }].map((col) => <div key={col.h}><div className="label mb-3">{col.h}</div><ul className="space-y-2">{col.items.map(([l, h]) => <li key={h}><Link href={h} className="text-[13px] font-semibold text-muted hover:text-ink">{l}</Link></li>)}</ul></div>)}
      </div>
      <div className="border-t border-line px-5 py-4 text-center text-[11.5px] text-subtle">FinTwin is an educational simulation tool. Outputs are estimates under stated assumptions — not forecasts or financial advice.</div>
    </footer>
  );
}

/* ---------------- Hero simulation ---------------- */
export function HeroSimulation({ autoplay = true }: { autoplay?: boolean }) {
  const [phase, setPhase] = useState(0); // 0 metrics, 1 baseline chart, 2 scenario
  const baseline = useMemo(() => runSimulation(DEMO_TWIN, DEMO_ECON, {}, { paths: 60, seed: 3 }), []);
  const scenario = useMemo(() => runSimulation(DEMO_TWIN, DEMO_ECON, { savingsChangePct: 15 }, { paths: 60, seed: 3 }), []);
  useEffect(() => {
    if (!autoplay) return;
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => setPhase(2), 4600);
    const loop = setInterval(() => setPhase((p) => (p === 2 ? 1 : 2)), 7000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(loop);
    };
  }, [autoplay]);
  const active = phase === 2 ? scenario : baseline;
  const nw = useCountUp(428500, { duration: 1600, delay: 300 });
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.5 }} className="card relative overflow-hidden p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><span className="h-2 w-2 pill bg-good" /><span className="label">Financial Twin · live</span></div>
        <AnimatePresence mode="wait">
          {phase === 2 ? <motion.div key="s" initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}><AccentChip>Scenario: Save 15% More</AccentChip></motion.div> : <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Chip>Current plan</Chip></motion.div>}
        </AnimatePresence>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card-dark p-3.5 md:col-span-1"><div className="label text-ink-fg/55">Net worth</div><div className="mt-1 text-[22px] font-extrabold tracking-tight tnum">{formatMoney(nw, "EGP")}</div></div>
        <div className="card-compact p-3.5"><div className="label">Cash flow</div><div className="mt-1 text-[18px] font-extrabold tnum"><AnimatedNumber value={phase === 2 ? 12190 : 10600} format={(n) => formatMoney(n, "EGP", { sign: true })} delay={600} once={false} /></div></div>
        <div className="card-compact p-3.5"><div className="label">Savings</div><div className="mt-1 text-[18px] font-extrabold tnum"><AnimatedNumber value={263200} format={(n) => formatMoney(n, "", { compact: true })} delay={800} /></div></div>
        <div className="card-compact p-3.5"><div className="label">Buy a Home</div><div className="mt-1 flex items-baseline gap-1 text-[18px] font-extrabold tnum"><AnimatedNumber value={(active.goal?.probability ?? 0) * 100} format={(n) => `${Math.round(n)}%`} delay={1000} once={false} /><span className="text-[10.5px] font-semibold text-muted">probability</span></div><ProgressBar value={126000 / 1500000} height={4} className="mt-2" delay={1.1} /></div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11.5px]"><span className="font-semibold">10-year projection</span><span className="text-muted tnum">Median {formatMoney(active.final.p50, "EGP", { compact: true })} · 5th–95th {formatMoney(active.final.p5, "", { compact: true })}–{formatMoney(active.final.p95, "", { compact: true })}</span></div>
        <AnimatePresence mode="wait">
          {phase >= 1 && <motion.div key={phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}><FanChart series={active.series} baseline={phase === 2 ? baseline.series.p50 : null} currency="EGP" height={190} compact showLegend={false} /></motion.div>}
          {phase === 0 && <motion.div key="empty" className="hatch h-[190px] rounded-2xl border border-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
        </AnimatePresence>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-subtle"><span>60 simulated paths · hatched = uncertainty range</span><span className="inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 w-1.5 pill ${phase === i ? "bg-accent" : "bg-card3"}`} />)}</span></div>
    </motion.div>
  );
}

/* ---------------- Landing ---------------- */
const SCENARIO_GALLERY = ["lose-job", "get-raise", "buy-home", "save-more", "freelance", "have-child", "recession", "high-inflation"];

export function Landing() {
  const uncertainty = useMemo(() => runSimulation(DEMO_TWIN, { ...DEMO_ECON, volatility: 0.2 }, {}, { paths: 80, seed: 8 }), []);
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}><AccentChip>Living Financial Digital Twin & Scenario Laboratory</AccentChip></motion.div>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }} className="mt-5 text-[40px] font-extrabold tracking-tight leading-[1.02] md:text-[56px] text-balance">See Your Financial Future Before It Happens.</motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted md:text-[16px]">Build a living model of your financial life, test possible scenarios, and understand the range of futures your decisions could create.</motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.38 }} className="mt-7 flex flex-wrap gap-2">
              <Button href="/signup" size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>Build My Financial Twin</Button>
              <Button href="/login" size="lg" variant="secondary">Explore a Simulation</Button>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">{["Monte Carlo futures", "Grounded AI explanations", "Every assumption visible"].map((t) => <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-good" />{t}</span>)}</motion.div>
          </div>
          <HeroSimulation />
        </div>
      </section>

      <Band eyebrow="What is FinTwin?" title="A Financial Digital Twin is a living model of your money." text="Income, expenses, accounts, assets, debts, goals and economic assumptions — connected into one model that reacts when any part changes. Not a dashboard of the past: a laboratory for the future.">
        <div className="grid gap-4 md:grid-cols-3">{[{ i: "Fingerprint", t: "Understand today", d: "Net worth, cash flow, coverage and risk, computed from your own numbers." }, { i: "GitBranch", t: "Change one thing", d: "Lose a job, buy a home, save more, face inflation — each is one explicit change to the model." }, { i: "Activity", t: "Simulate what's next", d: "Hundreds of possible futures, summarised as percentiles — never a single promised line." }].map((x) => <Reveal key={x.t}><div className="card h-full p-6"><span className="grid h-10 w-10 place-items-center pill bg-ink text-ink-fg"><Icon name={x.i} className="h-4.5 w-4.5" /></span><div className="mt-4 text-[16px] font-bold">{x.t}</div><p className="mt-1 text-[13px] text-muted">{x.d}</p></div></Reveal>)}</div>
      </Band>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal><div className="card h-full p-8"><div className="label">Traditional finance</div><div className="mt-2 text-[26px] font-extrabold tracking-tight">Shows what happened.</div><p className="mt-2 text-[13.5px] text-muted">Statements, categories, charts of last month. Useful — and entirely backward-looking.</p><div className="mt-6 space-y-2 opacity-60">{["Rent −7,500", "Groceries −920", "Salary +32,000"].map((r) => <div key={r} className="flex justify-between rounded-xl bg-card2 px-3 py-2 text-[12.5px] tnum"><span>{r.split(" ")[0]}</span><span>{r.split(" ")[1]}</span></div>)}</div></div></Reveal>
          <Reveal delay={0.1}><div className="card-dark h-full p-8"><div className="label text-ink-fg/55">Why FinTwin</div><div className="mt-2 text-[26px] font-extrabold tracking-tight">Explores what could happen next.</div><p className="mt-2 text-[13.5px] text-ink-fg/65">Change a decision, re-run the future, compare the distributions. The product is the <em>range</em>, and the reasons behind it.</p><div className="mt-6 grid grid-cols-3 gap-2 text-center">{[["5th", "1.9M"], ["Median", "3.4M"], ["95th", "5.6M"]].map(([k, v]) => <div key={k} className="rounded-2xl bg-ink-fg/10 p-3"><div className="label-sm text-ink-fg/50">{k}</div><div className="mt-1 text-[18px] font-extrabold tnum text-accent">{v}</div></div>)}</div></div></Reveal>
        </div>
      </section>

      <Band eyebrow="How it works" title="Three steps. One living model." dark>
        <div className="grid gap-4 md:grid-cols-3">{[["Build your Twin", "A six-minute onboarding captures income, expenses, savings, assets, debt and goals. Unsure? Use editable assumptions."], ["Change a scenario", "Pick from the library or describe it in words. Every extracted parameter stays visible and editable."], ["Simulate possible futures", "Run 100 to 5,000 Monte Carlo paths. Read the percentiles, risk drivers and sensitivity — then ask the AI why."]].map(([t, d], i) => <Reveal key={t} delay={i * 0.08}><div className="rounded-[22px] bg-ink-fg/8 p-6 ring-1 ring-ink-fg/10"><div className="text-[40px] font-extrabold tracking-tight text-accent tnum">0{i + 1}</div><div className="mt-2 text-[17px] font-bold">{t}</div><p className="mt-1 text-[13px] text-ink-fg/65">{d}</p></div></Reveal>)}</div>
      </Band>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="label">Scenario gallery</div><h2 className="mt-2 text-[28px] font-extrabold tracking-tight md:text-[34px]">Test a decision before you make it.</h2></div><Button href="/showcase" variant="secondary">All scenarios</Button></div></Reveal>
        <Stagger inView stagger={0.05} className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">{SCENARIO_GALLERY.map((k) => { const t = SCENARIO_TEMPLATES.find((x) => x.key === k)!; return <StaggerItem key={k}><Link href={`/showcase#${k}`} className="card card-hover group block h-full p-5"><span className="grid h-10 w-10 place-items-center pill bg-card3 transition-colors group-hover:bg-ink group-hover:text-ink-fg"><Icon name={t.icon} className="h-4.5 w-4.5" /></span><div className="mt-4 text-[14.5px] font-bold">{t.name}</div><div className="mt-1 text-[11.5px] text-muted line-clamp-2">{t.description}</div></Link></StaggerItem>; })}</Stagger>
      </section>

      <Band eyebrow="Uncertainty, visualised" title="The future is a distribution, not one line." text="Every projection shows the median, the expected value, the 25th–75th band and the hatched 5th–95th range. Amber marks the key line; hatching marks what is uncertain.">
        <Reveal><div className="card p-6"><FanChart series={uncertainty.series} currency="EGP" height={300} /></div></Reveal>
      </Band>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal><div><div className="label">AI explanation</div><h2 className="mt-2 text-[28px] font-extrabold tracking-tight md:text-[34px]">AI that reads your model — and shows its work.</h2><p className="mt-3 text-[14px] text-muted">Ask in plain language. FinTwin reads your Twin, runs or references a simulation, and answers with numbers, charts and the exact assumptions used. No vague advice, no hidden reasoning.</p><div className="mt-5 flex flex-wrap gap-1.5">{["How long could my savings cover my expenses?", "What if I save 15% more?", "Which assumption matters most?"].map((q) => <Chip key={q}>{q}</Chip>)}</div></div></Reveal>
          <Reveal delay={0.1}><AiDemoCard /></Reveal>
        </div>
      </section>

      <Band eyebrow="Trust & transparency" title="Assumptions you can see. Calculations you can check." text="Every simulation page lists the data used, the scenario change, the economic assumptions, the number of Monte Carlo paths and which percentiles are reported.">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal><div className="card p-6"><div className="text-[14px] font-bold">Assumptions in the open</div><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">{ASSUMPTION_DEFS.filter((d) => d.key !== "horizonYears").map((d) => <div key={d.key} className="rounded-2xl bg-card2 p-3"><div className="label-sm">{d.label}</div><div className="mt-1 text-[18px] font-extrabold tnum">{Math.round(DEMO_ECON[d.key] * 100)}%</div></div>)}</div></div></Reveal>
          <Reveal delay={0.1}><div className="card p-6"><div className="text-[14px] font-bold">How a path is computed</div><ol className="mt-3 space-y-2 text-[13px] text-muted">{["Income compounds at a sampled growth rate; the scenario multiplies it where active.", "Expenses compound with inflation noise; debts amortise with explicit payments.", "Surplus flows to cash until a six-month buffer, then to investments.", "Investments earn normally-distributed monthly returns with your volatility.", "Net worth, goal fund and shortfalls are recorded every month for every path."].map((s, i) => <li key={s} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center pill bg-ink text-[10px] font-bold text-ink-fg">{i + 1}</span>{s}</li>)}</ol></div></Reveal>
        </div>
      </Band>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal><div className="card-dark relative overflow-hidden p-10 text-center md:p-16"><div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" /><h2 className="relative text-[32px] font-extrabold tracking-tight md:text-[44px] text-balance">Build Your Financial Twin</h2><p className="relative mx-auto mt-3 max-w-md text-[14px] text-ink-fg/65">Understand your financial life today. Change one thing. Simulate what could happen next.</p><div className="relative mt-7 flex flex-wrap justify-center gap-2"><Button href="/signup" size="lg" variant="accent" iconRight={<ArrowRight className="h-4 w-4" />}>Get started</Button><Button href="/demo" size="lg" variant="outline" className="!text-ink-fg !border-ink-fg/30 hover:!bg-ink-fg/10">Watch the demo</Button></div></div></Reveal>
      </section>
    </>
  );
}

export function Band({ eyebrow, title, text, children, dark = false }: { eyebrow: string; title: string; text?: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={dark ? "bg-ink text-ink-fg" : ""}>
      <div className="mx-auto max-w-6xl px-5 py-16">
        <Reveal><div className="max-w-2xl"><div className={`label ${dark ? "text-ink-fg/55" : ""}`}>{eyebrow}</div><h2 className="mt-2 text-[28px] font-extrabold tracking-tight md:text-[34px] text-balance">{title}</h2>{text && <p className={`mt-3 text-[14px] ${dark ? "text-ink-fg/65" : "text-muted"}`}>{text}</p>}</div></Reveal>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export function AiDemoCard() {
  return (
    <div className="card p-5">
      <div className="flex justify-end"><span className="pill bg-ink px-4 py-2 text-[13px] font-medium text-ink-fg">What if I save 15% more?</span></div>
      <div className="mt-3 flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center pill bg-ink text-accent"><Sparkles className="h-4 w-4" /></span><div className="flex-1 space-y-3 rounded-[20px] bg-card2 p-4"><p className="text-[13px] leading-relaxed">Saving 15% more means roughly <b className="tnum">EGP 1,590</b> extra per month. Under the selected assumptions the simulation moves the median 10-year net worth from <b className="tnum">EGP 3.4M</b> to <b className="tnum">EGP 3.7M</b>, and the estimated probability of reaching “Buy a Home” from 52% to 61%.</p><div className="grid grid-cols-3 gap-2">{[["Extra / month", "EGP 1,590", true], ["Median NW", "EGP 3.7M", false], ["Goal prob.", "61%", false]].map(([k, v, a]) => <div key={k as string} className={`rounded-xl p-2.5 ${a ? "bg-accent text-accent-ink" : "bg-card"}`}><div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] opacity-70">{k}</div><div className="text-[14px] font-extrabold tnum">{v}</div></div>)}</div><HBars currency="EGP" rows={[{ label: "Current plan", value: 3.4, display: "3.4M", tone: "accent" }, { label: "Save 15% more", value: 3.7, display: "3.7M", tone: "ink" }]} /><div className="flex flex-wrap gap-1.5 text-[11.5px] font-semibold"><span className="pill bg-ink px-3 py-1 text-ink-fg">Create this scenario</span><span className="pill bg-card px-3 py-1">Open goal planner</span><span className="ml-auto text-muted">View model context ▾</span></div></div></div>
    </div>
  );
}

/* ---------------- Demo mode ---------------- */
const DEMO_SCENES = [
  { t: 0, key: "logo", caption: "FinTwin" },
  { t: 2, key: "overview", caption: "Your Financial Twin builds from your own numbers." },
  { t: 7, key: "twin", caption: "Zoom into the model: income, expenses, assets, debt." },
  { t: 11, key: "goal", caption: "Pick a goal. See probability, not promises." },
  { t: 15, key: "scenario", caption: "Change one thing: save 15% more." },
  { t: 20, key: "simulation", caption: "Run 600 futures." },
  { t: 24, key: "distribution", caption: "The future is a distribution." },
  { t: 28, key: "ai", caption: "AI explains the result — with its sources." },
  { t: 32, key: "report", caption: "Turn it into a report." },
  { t: 35, key: "end", caption: "See your financial future before it happens." },
];

export function DemoMode() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed((e) => (e >= 38 ? 0 : e + 0.1)), 100);
    return () => clearInterval(id);
  }, [playing]);
  const scene = [...DEMO_SCENES].reverse().find((s) => elapsed >= s.t) ?? DEMO_SCENES[0];
  const sim = useMemo(() => runSimulation(DEMO_TWIN, DEMO_ECON, { savingsChangePct: 15 }, { paths: 80, seed: 5, baseline: true }), []);
  const pathCount = useCountUp(scene.key === "simulation" ? 600 : 0, { duration: 3200 });
  return (
    <div className="glow min-h-screen bg-page">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between"><Logo /><div className="flex items-center gap-2"><Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</Button><Button size="sm" variant="secondary" onClick={() => setElapsed(0)}>Restart</Button><Button size="sm" href="/signup">Build mine</Button></div></div>
        <div className="h-1 w-full overflow-hidden pill bg-card3"><motion.div className="h-full bg-accent" animate={{ width: `${(elapsed / 38) * 100}%` }} transition={{ duration: 0.1, ease: "linear" }} /></div>
        <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-[28px] border border-line bg-canvas shadow-float">
          <AnimatePresence mode="wait">
            <motion.div key={scene.key} initial={{ opacity: 0, filter: "blur(6px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.6 }} className="absolute inset-0 grid place-items-center p-6">
              <KenBurns active={playing} scale={scene.key === "twin" || scene.key === "goal" ? 1.22 : 1.08} duration={4.5} className="w-full max-w-3xl">
                {scene.key === "logo" && <div className="text-center"><span className="mx-auto grid h-20 w-20 place-items-center pill bg-ink"><span className="h-8 w-8 pill border-[3px] border-accent" /></span><div className="mt-4 text-[40px] font-extrabold tracking-tight">FinTwin</div></div>}
                {scene.key === "overview" && <div className="grid grid-cols-4 gap-3"><div className="card-dark col-span-2 p-5"><div className="label text-ink-fg/55">Net worth</div><div className="mt-2 text-[34px] font-extrabold tnum"><AnimatedNumber value={428500} format={(n) => formatMoney(n, "EGP")} /></div></div>{[["Income", 32000], ["Expenses", 21400], ["Savings", 10600], ["Coverage", 4.8]].map(([k, v]) => <div key={k as string} className="card p-4"><div className="label">{k}</div><div className="mt-1 text-[20px] font-extrabold tnum"><AnimatedNumber value={v as number} format={(n) => (k === "Coverage" ? `${n.toFixed(1)} mo` : formatMoney(n, "", { compact: true }))} /></div></div>)}</div>}
                {scene.key === "twin" && <div className="grid grid-cols-2 gap-3">{[["Income", "EGP 32,000"], ["Expenses", "EGP 21,400"], ["Assets", "EGP 478,200"], ["Liabilities", "EGP 49,700"]].map(([k, v]) => <div key={k} className="card p-5"><div className="label">{k}</div><div className="mt-1 text-[26px] font-extrabold tnum">{v}</div><div className="mt-3 h-1.5 pill bg-card3"><motion.div className="h-full pill bg-accent" initial={{ width: 0 }} animate={{ width: "70%" }} transition={{ duration: 1 }} /></div></div>)}</div>}
                {scene.key === "goal" && <div className="card mx-auto max-w-md p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center pill bg-accent text-accent-ink"><Icon name="Home" className="h-5 w-5" /></span><div><div className="text-[18px] font-extrabold">Buy a Home</div><div className="text-[12px] text-muted">EGP 1,500,000 · 8 years</div></div><StatusBadge tone="warn" className="ml-auto">Needs attention</StatusBadge></div><div className="mt-5 text-[30px] font-extrabold tnum"><AnimatedNumber value={126000} format={(n) => formatMoney(n, "EGP")} /></div><ProgressBar value={0.084} className="mt-3" marker={1} /><div className="mt-2 text-[12px] text-muted tnum">52% simulated probability under the current plan</div></div>}
                {scene.key === "scenario" && <div className="card mx-auto max-w-md p-6"><div className="label">Scenario builder</div><div className="mt-1 text-[22px] font-extrabold">Save 15% More</div><div className="mt-4 space-y-2">{["Savings +15%", "Goal contributions +15%", "Assumptions unchanged"].map((l, i) => <motion.div key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.3 }} className="flex items-center gap-2 rounded-xl bg-card2 px-3 py-2 text-[13px]"><span className="h-1.5 w-1.5 pill bg-accent" />{l}</motion.div>)}</div><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="mt-4"><span className="pill bg-accent px-4 py-2 text-[13px] font-bold text-accent-ink">Run Simulation</span></motion.div></div>}
                {scene.key === "simulation" && <div className="text-center"><div className="text-[64px] font-extrabold tracking-tight tnum">{Math.round(pathCount)}</div><div className="label">of 600 futures</div><div className="mx-auto mt-4 h-1.5 w-64 pill bg-card3"><motion.div className="h-full pill bg-accent" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 3.2, ease: "linear" }} /></div></div>}
                {scene.key === "distribution" && <div className="card w-full p-5"><div className="mb-2 flex items-baseline justify-between"><span className="text-[14px] font-bold">Future distribution</span><span className="text-[12px] text-muted tnum">Median {formatMoney(sim.final.p50, "EGP", { compact: true })}</span></div><FanChart series={sim.series} baseline={sim.baseline?.p50 ?? null} currency="EGP" height={240} showLegend={false} /></div>}
                {scene.key === "ai" && <div className="w-full max-w-xl"><AiDemoCard /></div>}
                {scene.key === "report" && <div className="card mx-auto w-full max-w-md p-8"><div className="label">Scenario report</div><div className="mt-1 text-[22px] font-extrabold">Save 15% More — March</div><div className="mt-4 space-y-2">{[90, 70, 85, 50].map((w, i) => <motion.div key={i} className="h-2.5 rounded bg-card3" initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: i * 0.15, duration: 0.5 }} />)}</div><motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }} className="mt-5 inline-flex items-center gap-2 pill bg-ink px-4 py-2 text-[12.5px] font-semibold text-ink-fg"><span className="h-1.5 w-1.5 pill bg-accent" />Your report is ready.</motion.div></div>}
                {scene.key === "end" && <div className="text-center"><div className="text-[36px] font-extrabold tracking-tight md:text-[48px] text-balance">See your financial future before it happens.</div><Button href="/signup" size="lg" className="mt-6">Build My Financial Twin</Button></div>}
              </KenBurns>
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5"><AnimatePresence mode="wait"><motion.div key={scene.caption} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2 pill bg-ink px-4 py-2 text-[13px] font-semibold text-ink-fg shadow-float"><span className="h-1.5 w-1.5 pill bg-accent" />{scene.caption}</motion.div></AnimatePresence></div>
        </div>
      </div>
    </div>
  );
}
