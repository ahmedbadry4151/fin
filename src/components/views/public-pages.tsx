"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Chip, StatusBadge } from "../ui/pill";
import { Icon } from "../ui/states";
import { Reveal, Stagger, StaggerItem } from "../motion/stagger";
import { Collapse } from "../motion/primitives";
import { HeroSimulation, Band, AiDemoCard } from "./marketing";
import { SCENARIO_TEMPLATES, SCENARIO_CATEGORIES, describeParams } from "@/lib/scenarios";

const FEATURES = [
  { i: "Fingerprint", t: "Financial Twin", d: "Income, expenses, accounts, assets, liabilities and goals in one editable, living model." },
  { i: "GitBranch", t: "Scenario Studio", d: "Twenty-plus templates across career, life, housing, transport, economy and savings — plus natural-language scenarios." },
  { i: "Activity", t: "Monte Carlo Simulation", d: "100 to 5,000 paths with seven percentiles, risk drivers, goal probability and sensitivity." },
  { i: "Target", t: "Goal Laboratory", d: "Required contributions, probability under any scenario, and an interactive planner." },
  { i: "Sparkles", t: "Grounded AI", d: "Answers computed from your model with data, assumptions and simulation details attached." },
  { i: "Globe", t: "Economic Environment", d: "Inflation, growth, returns and volatility with historical context and one-click presets." },
  { i: "BarChart3", t: "Analytics & Health", d: "Net worth, cash flow, spending, debt and savings — and six measurable health dimensions." },
  { i: "FileText", t: "Reports", d: "Snapshot, scenario, goal and annual reports with charts, assumptions and AI explanation." },
];

const FAQ = [
  ["Is FinTwin predicting my future?", "No. It simulates many possible futures under assumptions you can see and change, then reports the distribution. The median is a summary, not a promise."],
  ["Where do the economic assumptions come from?", "Defaults are sensible long-run values with historical context shown beside each one. You control them, and every simulation records which values it used."],
  ["Does FinTwin connect to my bank?", "Not automatically. Add accounts and transactions manually or import a CSV. Nothing leaves your account without your action."],
  ["Is the AI a chatbot?", "It's an intelligence layer over your Financial Twin. It detects intent, reads the model, runs or references a simulation, and answers with numbers and sources. It never invents data."],
  ["What currency does it support?", "EGP by default, plus USD, EUR, GBP, SAR and AED as display currencies. Amounts are not converted."],
  ["Is this financial advice?", "No. FinTwin is an educational simulation tool. Decisions remain yours; consult a licensed professional for advice."],
];

export function PublicPage({ kind }: { kind: "product" | "how" | "features" | "showcase" | "security" | "faq" }) {
  if (kind === "product") {
    return (
      <>
        <Hero eyebrow="Product overview" title="One model. Every decision tested against it." text="FinTwin connects your financial life into a single living model, then lets you change one thing at a time and watch the range of futures respond." />
        <div className="mx-auto max-w-6xl px-5 pb-16"><HeroSimulation /></div>
        <Band eyebrow="Connected by design" title="Nothing is a separate product.">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">{["Accounts", "Transactions", "Financial Twin", "Analytics", "Goals", "Scenarios", "Simulations", "AI", "Reports"].map((x, i) => <span key={x} className="inline-flex items-center gap-2"><Chip>{x}</Chip>{i < 8 && <ArrowRight className="h-3.5 w-3.5 text-subtle" />}</span>)}</div>
          <p className="mt-4 max-w-2xl text-[13.5px] text-muted">The Economic Environment feeds the simulation system. The AI reads the model. Reports use simulation results. Goals are testable through scenarios.</p>
        </Band>
        <CTA />
      </>
    );
  }
  if (kind === "how") {
    return (
      <>
        <Hero eyebrow="How it works" title="Build. Change. Simulate." text="Three steps that repeat as your financial life evolves." />
        <div className="mx-auto max-w-4xl space-y-6 px-5 pb-16">
          {[["Build your Twin", "A progressive onboarding captures the essentials — with editable assumptions whenever you're unsure. The result is a model, not a form."], ["Change a scenario", "Pick a template or describe a decision in words. FinTwin extracts the parameters and shows every one of them before anything runs."], ["Simulate possible futures", "Hundreds of monthly paths produce percentiles, goal probability, shortfall risk and sensitivity. The AI can explain any of it."], ["Keep it living", "Add transactions, update accounts, adjust assumptions. Goals, scenarios, simulations and reports evolve with the model."]].map(([t, d], i) => <Reveal key={t}><div className="card flex gap-5 p-6"><div className="text-[36px] font-extrabold tracking-tight text-accent tnum">0{i + 1}</div><div><div className="text-[18px] font-bold">{t}</div><p className="mt-1 text-[13.5px] text-muted">{d}</p></div></div></Reveal>)}
        </div>
        <CTA />
      </>
    );
  }
  if (kind === "features") {
    return (
      <>
        <Hero eyebrow="Features" title="Everything a financial laboratory needs." />
        <Stagger inView stagger={0.05} className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-2 lg:grid-cols-4">{FEATURES.map((f) => <StaggerItem key={f.t}><div className="card h-full p-5"><span className="grid h-10 w-10 place-items-center pill bg-ink text-ink-fg"><Icon name={f.i} className="h-4.5 w-4.5" /></span><div className="mt-4 text-[15px] font-bold">{f.t}</div><p className="mt-1 text-[12.5px] text-muted">{f.d}</p></div></StaggerItem>)}</Stagger>
        <div className="mx-auto max-w-6xl px-5 pb-16"><AiDemoCard /></div>
        <CTA />
      </>
    );
  }
  if (kind === "showcase") {
    return (
      <>
        <Hero eyebrow="Scenario showcase" title="Decisions you can rehearse." text="Each scenario is an explicit, editable change to the model." />
        <div className="mx-auto max-w-6xl space-y-10 px-5 pb-16">
          {SCENARIO_CATEGORIES.filter((c) => c.key !== "custom").map((cat) => (
            <div key={cat.key}><Reveal><div className="label">{cat.label}</div><div className="text-[13px] text-muted">{cat.blurb}</div></Reveal><Stagger inView stagger={0.04} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{SCENARIO_TEMPLATES.filter((t) => t.category === cat.key).map((t) => <StaggerItem key={t.key}><div id={t.key} className="card h-full p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center pill bg-card3"><Icon name={t.icon} className="h-4.5 w-4.5" /></span><div className="text-[15px] font-bold">{t.name}</div></div><p className="mt-3 text-[12.5px] text-muted">{t.description}</p><ul className="mt-3 space-y-1 text-[11.5px]">{describeParams(t.params).slice(0, 3).map((l) => <li key={l} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 pill bg-accent" />{l}</li>)}</ul></div></StaggerItem>)}</Stagger></div>
          ))}
        </div>
        <CTA />
      </>
    );
  }
  if (kind === "security") {
    return (
      <>
        <Hero eyebrow="Security & privacy" title="Your model, your data, your assumptions." />
        <div className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-3">
          {[["Private by default", "Data is stored in your account only. No bank connections without your action; no selling or sharing."], ["Transparent models", "Every simulation records the data, scenario change, assumptions, path count and percentiles it used."], ["Honest language", "FinTwin never says “you will have”. It says what the simulation estimates under the selected assumptions."], ["Session security", "Signed, HTTP-only session cookies with a 30-day lifetime. Passwords are hashed with scrypt."], ["Your controls", "Export everything as JSON or CSV. Delete transactions, your financial profile, or your whole account."], ["Educational scope", "FinTwin is a simulation and learning tool — not investment, tax or legal advice."]].map(([t, d]) => <Reveal key={t}><div className="card h-full p-6"><StatusBadge tone="good">Commitment</StatusBadge><div className="mt-3 text-[16px] font-bold">{t}</div><p className="mt-1 text-[13px] text-muted">{d}</p></div></Reveal>)}
        </div>
        <div id="model" className="mx-auto max-w-6xl px-5 pb-16"><Reveal><div className="card-dark p-8"><div className="label text-ink-fg/55">Model transparency</div><div className="mt-2 text-[24px] font-extrabold tracking-tight">What every simulation page tells you</div><div className="mt-4 grid gap-3 md:grid-cols-3">{[["Financial Twin", "What data was used?"], ["Scenario", "What changed?"], ["Economic data", "What assumptions were applied?"], ["Monte Carlo", "How many paths?"], ["Results", "Which percentiles?"], ["AI", "What data generated the explanation?"]].map(([k, v]) => <div key={k} className="rounded-2xl bg-ink-fg/10 p-4"><div className="label-sm text-ink-fg/50">{k}</div><div className="mt-1 text-[14px] font-semibold">{v}</div></div>)}</div></div></Reveal></div>
        <CTA />
      </>
    );
  }
  return (
    <>
      <Hero eyebrow="FAQ" title="Questions people ask before building a Twin." />
      <div className="mx-auto max-w-3xl space-y-2 px-5 pb-16">{FAQ.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}</div>
      <CTA />
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-0"><button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"><span className="text-[14.5px] font-bold">{q}</span><ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} /></button><Collapse open={open}><p className="px-5 pb-5 text-[13.5px] text-muted">{a}</p></Collapse></div>
  );
}

function Hero({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <section className="glow"><div className="mx-auto max-w-6xl px-5 pb-12 pt-16"><Reveal><div className="label">{eyebrow}</div><h1 className="mt-3 max-w-3xl text-[36px] font-extrabold tracking-tight leading-[1.05] md:text-[52px] text-balance">{title}</h1>{text && <p className="mt-4 max-w-xl text-[15px] text-muted">{text}</p>}</Reveal></div></section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20"><Reveal><div className="card-dark flex flex-wrap items-center justify-between gap-4 p-8"><div><div className="text-[22px] font-extrabold tracking-tight">Build Your Financial Twin</div><div className="text-[13px] text-ink-fg/65">Six minutes to a living model.</div></div><div className="flex gap-2"><Button href="/signup" variant="accent" size="lg">Get started</Button><Link href="/demo" className="inline-flex h-12 items-center pill px-5 text-[14px] font-semibold text-ink-fg/80 hover:text-ink-fg">Watch the demo</Link></div></div></Reveal></section>
  );
}
