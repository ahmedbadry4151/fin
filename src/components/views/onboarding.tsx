"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Clock, ShieldCheck, Info } from "lucide-react";
import { Logo } from "../shell/app-shell";
import { Button } from "../ui/button";
import { Field, Input, MoneyInput, Select, OptionCard, Slider } from "../ui/field";
import { StatusBadge, Chip } from "../ui/pill";
import { Icon } from "../ui/states";
import { AnimatedNumber, useCountUp } from "../motion/count-up";
import { InfoTip } from "../motion/primitives";
import { CircularProgress } from "../motion/progress";
import { EASE_OUT } from "../motion/stagger";
import { useTheme } from "../providers";
import { formatMoney, formatPct, toISODate, addMonths } from "@/lib/format";
import { CURRENCIES, EMPLOYMENT_TYPES, EXPENSE_CATEGORIES, ASSET_TYPES, LIABILITY_TYPES, GOAL_TYPES, splitExpenses } from "@/lib/finance";
import { ASSUMPTION_DEFS, DEFAULT_ASSUMPTIONS, PLANNING_STYLES } from "@/lib/economy";
import { GOAL_ICON } from "../domain/cards";

const STEPS = ["Welcome", "Profile", "Employment", "Income", "Expenses", "Savings", "Assets", "Liabilities", "Goals", "Preferences", "Assumptions", "Review"];

type AssetRow = { id: number; name: string; type: string; value: number };
type LiabRow = { id: number; name: string; type: string; balance: number; monthlyPayment: number; interestRate: number; remainingMonths: number };
type GoalRow = { id: number; type: string; name: string; targetAmount: number; currentAmount: number; targetDate: string; monthlyContribution: number };

export function OnboardingWizard({ initialName, initialCurrency }: { initialName: string; initialCurrency: string }) {
  const router = useRouter();
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [profile, setProfile] = useState({ name: initialName, age: 30, country: "Egypt", city: "Cairo", currency: initialCurrency || "EGP", employment: "employed", planningStyle: "balanced" });
  const [income, setIncome] = useState({ monthlyIncome: 0, additionalIncome: 0, incomeFrequency: "monthly", incomeGrowth: DEFAULT_ASSUMPTIONS.incomeGrowth, unsure: false });
  const [expenses, setExpenses] = useState<Record<string, number>>(Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, 0])));
  const [savings, setSavings] = useState({ cashSavings: 0, emergencySavings: 0, monthlySavings: 0, otherLiquid: 0 });
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [liabs, setLiabs] = useState<LiabRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [assumptions, setAssumptions] = useState({ ...DEFAULT_ASSUMPTIONS });
  const [submitting, setSubmitting] = useState(false);
  const c = profile.currency;

  const totals = useMemo(() => splitExpenses(expenses), [expenses]);
  const totalIncome = income.monthlyIncome + income.additionalIncome;
  const savingsRate = totalIncome > 0 ? (totalIncome - totals.total) / totalIncome : 0;
  const coverage = totals.essential > 0 ? savings.emergencySavings / totals.essential : 0;
  const totalAssets = assets.reduce((s, a) => s + a.value, 0) + savings.cashSavings + savings.emergencySavings + savings.otherLiquid;
  const totalDebt = liabs.reduce((s, l) => s + l.balance, 0);
  const debtPayments = liabs.reduce((s, l) => s + l.monthlyPayment, 0);

  useEffect(() => {
    if (income.unsure && income.monthlyIncome === 0) setIncome((i) => ({ ...i, monthlyIncome: 25000 }));
  }, [income.unsure, income.monthlyIncome]);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function submit() {
    setSubmitting(true);
    const r = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, income: { monthlyIncome: income.monthlyIncome, additionalIncome: income.additionalIncome, incomeFrequency: income.incomeFrequency, incomeGrowth: income.incomeGrowth }, expenses, savings: { ...savings, monthlySavings: Math.max(0, totalIncome - totals.total) }, assets: assets.map(({ name, type, value }) => ({ name, type, value })), liabilities: liabs.map(({ name, type, balance, monthlyPayment, interestRate, remainingMonths }) => ({ name, type, balance, monthlyPayment, interestRate, remainingMonths })), goals: goals.map(({ name, type, targetAmount, currentAmount, targetDate, monthlyContribution }) => ({ name, type, targetAmount, currentAmount, targetDate, monthlyContribution })), assumptions }),
    });
    if (r.ok) router.push("/onboarding/build");
    else setSubmitting(false);
  }

  const canContinue = step === 3 ? income.monthlyIncome > 0 : step === 1 ? profile.name.trim().length > 0 : true;

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-20 border-b border-line bg-page/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo />
          <div className="text-[12px] font-semibold text-muted tnum">Step {Math.min(step + 1, STEPS.length)} / {STEPS.length}</div>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="h-1.5 w-full overflow-hidden pill bg-card3"><motion.div className="h-full pill bg-accent" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.5, ease: EASE_OUT }} /></div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-28">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -16 }} transition={{ duration: 0.32, ease: EASE_OUT }}>
            {step === 0 && (
              <section className="text-center">
                <motion.span className="mx-auto grid h-16 w-16 place-items-center pill bg-ink" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}><span className="h-7 w-7 pill border-[3px] border-accent" /></motion.span>
                <h1 className="mt-6 text-[36px] md:text-[44px] font-extrabold tracking-tight leading-[1.05]">Let's build your financial twin.</h1>
                <p className="mx-auto mt-3 max-w-md text-[14.5px] text-muted">A few details are enough to create your starting model. Everything can be changed later.</p>
                <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
                  {[{ icon: Clock, t: "About 6 minutes", d: "Skip anything you don't know" }, { icon: ShieldCheck, t: "Private by default", d: "Your data stays in your account" }, { icon: Info, t: "Educational model", d: "Not financial advice" }].map((x) => <div key={x.t} className="card p-4 text-left"><x.icon className="h-4.5 w-4.5 text-ink" strokeWidth={1.5} /><div className="mt-2 text-[13px] font-bold">{x.t}</div><div className="text-[11.5px] text-muted">{x.d}</div></div>)}
                </div>
              </section>
            )}
            {step === 1 && (
              <Section title="A little about you" sub="We only ask for what the model needs.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name"><Input autoFocus value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
                  <Field label="Age"><Input type="number" value={profile.age || ""} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })} /></Field>
                  <Field label="Country"><Input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} /></Field>
                  <Field label="City"><Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></Field>
                </div>
                <div className="mt-4"><div className="mb-2 text-[12.5px] font-semibold">Currency</div><div className="flex flex-wrap gap-1.5">{CURRENCIES.map((x) => <button key={x} onClick={() => setProfile({ ...profile, currency: x === "Other" ? "USD" : x })} className={`pill border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${profile.currency === x ? "border-ink bg-ink text-ink-fg" : "border-line bg-card text-muted hover:text-ink"}`}>{x}</button>)}</div></div>
              </Section>
            )}
            {step === 2 && (
              <Section title="How does your income currently work?" sub="This shapes how we model stability and risk.">
                <div className="grid gap-2 sm:grid-cols-2">{EMPLOYMENT_TYPES.map((t) => <OptionCard key={t.key} selected={profile.employment === t.key} onClick={() => setProfile({ ...profile, employment: t.key })} title={t.label} hint={t.hint} />)}</div>
              </Section>
            )}
            {step === 3 && (
              <Section title="Your income" sub="Net monthly amounts. If you're not sure, we'll start with a sensible editable assumption.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Monthly income"><MoneyInput currency={c} value={income.monthlyIncome} onChange={(v) => setIncome({ ...income, monthlyIncome: v })} /></Field>
                  <Field label="Additional income" hint="Freelance, rent, support…"><MoneyInput currency={c} value={income.additionalIncome} onChange={(v) => setIncome({ ...income, additionalIncome: v })} /></Field>
                  <Field label="Income frequency"><Select value={income.incomeFrequency} onChange={(e) => setIncome({ ...income, incomeFrequency: e.target.value })}><option value="monthly">Monthly</option><option value="biweekly">Every two weeks</option><option value="irregular">Irregular</option></Select></Field>
                  <Slider label="Expected annual income growth" min={0} max={0.3} step={0.005} value={income.incomeGrowth} onChange={(v) => setIncome({ ...income, incomeGrowth: v })} display={formatPct(income.incomeGrowth, 1)} />
                </div>
                <button onClick={() => setIncome({ ...income, unsure: !income.unsure })} className={`mt-4 pill border px-3.5 py-1.5 text-[12.5px] font-semibold ${income.unsure ? "border-ink bg-ink text-ink-fg" : "border-line bg-card text-muted"}`}>I'm not sure {income.unsure && "· using EGP 25,000 as a starting assumption"}</button>
              </Section>
            )}
            {step === 4 && (
              <Section title="Monthly expenses" sub="Rough numbers are fine. Essential categories drive emergency coverage.">
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{EXPENSE_CATEGORIES.map((cat) => <Field key={cat.key} label={cat.label} hint={cat.essential ? "Essential" : "Flexible"}><MoneyInput currency={c} value={expenses[cat.key]} onChange={(v) => setExpenses({ ...expenses, [cat.key]: v })} /></Field>)}</div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Total label="Monthly Expenses" value={totals.total} c={c} dark />
                  <Total label="Essential" value={totals.essential} c={c} />
                  <Total label="Flexible" value={totals.flexible} c={c} />
                </div>
              </Section>
            )}
            {step === 5 && (
              <Section title="Savings" sub="What's already set aside, and what you add each month.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cash & bank balance"><MoneyInput currency={c} value={savings.cashSavings} onChange={(v) => setSavings({ ...savings, cashSavings: v })} /></Field>
                  <Field label="Emergency savings" hint="Money you'd use if income stopped."><MoneyInput currency={c} value={savings.emergencySavings} onChange={(v) => setSavings({ ...savings, emergencySavings: v })} /></Field>
                  <Field label="Monthly savings" hint={`Income minus expenses suggests ${formatMoney(Math.max(0, totalIncome - totals.total), c)}`}><MoneyInput currency={c} value={savings.monthlySavings} onChange={(v) => setSavings({ ...savings, monthlySavings: v })} /></Field>
                  <Field label="Other liquid assets"><MoneyInput currency={c} value={savings.otherLiquid} onChange={(v) => setSavings({ ...savings, otherLiquid: v })} /></Field>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="card-dark p-5"><div className="label text-ink-fg/55">Savings rate</div><div className="mt-1 text-[30px] font-extrabold tnum"><AnimatedNumber value={savingsRate * 100} format={(n) => `${n.toFixed(1)}%`} once={false} /></div></div>
                  <div className="card p-5"><div className="label">Months of essentials covered</div><div className="mt-1 text-[30px] font-extrabold tnum"><AnimatedNumber value={coverage} format={(n) => n.toFixed(1)} once={false} /></div></div>
                </div>
              </Section>
            )}
            {step === 6 && (
              <Section title="Assets" sub="Property, vehicles, investments, a business — anything with value.">
                <RowEditor<AssetRow> rows={assets} onChange={setAssets} empty={{ id: 0, name: "", type: "property", value: 0 }} render={(row, set) => <div className="grid flex-1 gap-3 sm:grid-cols-3"><Input placeholder="Apartment" value={row.name} onChange={(e) => set({ ...row, name: e.target.value })} /><Select value={row.type} onChange={(e) => set({ ...row, type: e.target.value })}>{ASSET_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select><MoneyInput currency={c} value={row.value} onChange={(v) => set({ ...row, value: v })} /></div>} />
                <div className="mt-4 flex flex-wrap gap-2">{assets.filter((a) => a.name).map((a) => <Chip key={a.id}>{a.name} · {formatMoney(a.value, c, { compact: true })} · <span className="capitalize text-muted">{a.type}</span></Chip>)}</div>
              </Section>
            )}
            {step === 7 && (
              <Section title="Liabilities" sub="Loans and cards. Payments are modelled explicitly in every simulation.">
                <RowEditor<LiabRow> rows={liabs} onChange={setLiabs} empty={{ id: 0, name: "", type: "personal_loan", balance: 0, monthlyPayment: 0, interestRate: 0.15, remainingMonths: 24 }} render={(row, set) => <div className="grid flex-1 gap-3 sm:grid-cols-3"><Input placeholder="Car loan" value={row.name} onChange={(e) => set({ ...row, name: e.target.value })} /><Select value={row.type} onChange={(e) => set({ ...row, type: e.target.value })}>{LIABILITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select><MoneyInput currency={c} placeholder="Balance" value={row.balance} onChange={(v) => set({ ...row, balance: v })} /><MoneyInput currency={c} placeholder="Payment" value={row.monthlyPayment} onChange={(v) => set({ ...row, monthlyPayment: v })} /><Input type="number" suffix="% rate" value={Math.round(row.interestRate * 1000) / 10} onChange={(e) => set({ ...row, interestRate: Number(e.target.value) / 100 })} /><Input type="number" suffix="months" value={row.remainingMonths} onChange={(e) => set({ ...row, remainingMonths: Number(e.target.value) })} /></div>} />
                <div className="mt-6 grid grid-cols-2 gap-3"><Total label="Total Debt" value={totalDebt} c={c} dark /><Total label="Monthly Debt Payments" value={debtPayments} c={c} /></div>
              </Section>
            )}
            {step === 8 && (
              <Section title="What are you building toward?" sub="Select any that apply — details appear as you pick.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{GOAL_TYPES.map((t) => { const on = goals.some((g) => g.type === t.key); return <OptionCard key={t.key} compact selected={on} icon={<Icon name={GOAL_ICON[t.key]} className="h-4 w-4" />} title={t.label} onClick={() => setGoals(on ? goals.filter((g) => g.type !== t.key) : [...goals, { id: Date.now(), type: t.key, name: t.label, targetAmount: t.key === "emergency" ? Math.round(totals.essential * 6) : t.key === "home" ? 1500000 : t.key === "car" ? 450000 : 100000, currentAmount: 0, targetDate: toISODate(addMonths(new Date(), t.key === "home" ? 96 : 36)), monthlyContribution: 0 }])} />; })}</div>
                <AnimatePresence>{goals.map((g) => (
                  <motion.div key={g.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="card mt-3 grid gap-3 p-4 sm:grid-cols-5">
                      <Field label="Name" className="sm:col-span-1"><Input value={g.name} onChange={(e) => setGoals(goals.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)))} /></Field>
                      <Field label="Target"><MoneyInput currency={c} value={g.targetAmount} onChange={(v) => setGoals(goals.map((x) => (x.id === g.id ? { ...x, targetAmount: v } : x)))} /></Field>
                      <Field label="Target date"><Input type="date" value={g.targetDate} onChange={(e) => setGoals(goals.map((x) => (x.id === g.id ? { ...x, targetDate: e.target.value } : x)))} /></Field>
                      <Field label="Current"><MoneyInput currency={c} value={g.currentAmount} onChange={(v) => setGoals(goals.map((x) => (x.id === g.id ? { ...x, currentAmount: v } : x)))} /></Field>
                      <Field label="Monthly"><MoneyInput currency={c} value={g.monthlyContribution} onChange={(v) => setGoals(goals.map((x) => (x.id === g.id ? { ...x, monthlyContribution: v } : x)))} /></Field>
                    </div>
                  </motion.div>
                ))}</AnimatePresence>
              </Section>
            )}
            {step === 9 && (
              <Section title="How would you like FinTwin to model uncertainty?" sub="This changes the model assumptions and scenario ranges. It does not predict your future or provide investment advice.">
                <div className="grid gap-2 sm:grid-cols-2">{PLANNING_STYLES.map((s) => <OptionCard key={s.key} selected={profile.planningStyle === s.key} onClick={() => setProfile({ ...profile, planningStyle: s.key })} title={s.label} hint={s.hint} />)}</div>
              </Section>
            )}
            {step === 10 && (
              <Section title="Economic assumptions" sub="Sensible defaults for Egypt. Each one can be changed now or later in the Economic Environment.">
                <div className="space-y-3">{ASSUMPTION_DEFS.map((d) => { const v = d.key === "incomeGrowth" ? income.incomeGrowth : assumptions[d.key]; const set = (x: number) => (d.key === "incomeGrowth" ? setIncome({ ...income, incomeGrowth: x }) : setAssumptions({ ...assumptions, [d.key]: x })); return <div key={d.key} className="card p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-[13.5px] font-bold">{d.label}</span><InfoTip content={d.why} /></div><span className="text-[18px] font-extrabold tnum">{d.unit === "%" ? formatPct(v, 1) : `${v} years`}</span></div><div className="mt-1 text-[12px] text-muted">{d.short}</div><Slider className="mt-3" min={d.min} max={d.max} step={d.step} value={v} onChange={set} /></div>; })}</div>
              </Section>
            )}
            {step === 11 && (
              <Section title="Review your starting model" sub="Everything here becomes your Financial Twin. Edit any section before building.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReviewBlock title="You" onEdit={() => go(1)} rows={[["Name", profile.name], ["Age", String(profile.age)], ["Country", profile.country], ["Currency", profile.currency], ["Employment", EMPLOYMENT_TYPES.find((t) => t.key === profile.employment)?.label ?? ""]]} />
                  <ReviewBlock title="Your cash flow" onEdit={() => go(3)} rows={[["Income", formatMoney(totalIncome, c)], ["Expenses", formatMoney(totals.total, c)], ["Savings", formatMoney(totalIncome - totals.total, c)], ["Savings rate", formatPct(savingsRate, 1)]]} />
                  <ReviewBlock title="Your balance sheet" onEdit={() => go(6)} rows={[["Assets", formatMoney(totalAssets, c)], ["Debt", formatMoney(totalDebt, c)], ["Net worth", formatMoney(totalAssets - totalDebt, c)], ["Emergency coverage", `${coverage.toFixed(1)} months`]]} dark />
                  <ReviewBlock title="Your goals" onEdit={() => go(8)} rows={goals.length ? goals.map((g) => [g.name, formatMoney(g.targetAmount, c, { compact: true })] as [string, string]) : [["Goals", "None yet"]]} />
                  <ReviewBlock title="Model assumptions" onEdit={() => go(10)} rows={[["Inflation", formatPct(assumptions.inflation, 1)], ["Income growth", formatPct(income.incomeGrowth, 1)], ["Return", formatPct(assumptions.investmentReturn, 1)], ["Volatility", formatPct(assumptions.volatility, 1)], ["Horizon", `${assumptions.horizonYears} years`]]} />
                  <div className="card flex flex-col justify-between p-5"><div><div className="label">Planning style</div><div className="mt-1 text-[16px] font-bold">{PLANNING_STYLES.find((s) => s.key === profile.planningStyle)?.label}</div></div><button onClick={() => go(9)} className="mt-3 self-start text-[12px] font-bold text-muted hover:text-ink">Edit</button></div>
                </div>
              </Section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          <div className="hidden text-[11.5px] text-muted sm:block">{theme === "dark" ? "Dark mode" : "Light mode"} · {STEPS[step]}</div>
          {step < STEPS.length - 1 ? <Button onClick={() => go(step + 1)} disabled={!canContinue} iconRight={<ArrowRight className="h-4 w-4" />}>Continue</Button> : <Button variant="accent" size="lg" onClick={submit} loading={submitting} icon={<Check className="h-4 w-4" />}>Build Financial Twin</Button>}
        </div>
      </footer>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight leading-tight">{title}</h1>
      {sub && <p className="mt-2 max-w-xl text-[13.5px] text-muted">{sub}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Total({ label, value, c, dark = false }: { label: string; value: number; c: string; dark?: boolean }) {
  return <div className={`${dark ? "card-dark" : "card"} p-4`}><div className={`label ${dark ? "text-ink-fg/55" : ""}`}>{label}</div><div className="mt-1 text-[22px] font-extrabold tnum"><AnimatedNumber value={value} format={(n) => formatMoney(n, c)} once={false} duration={600} /></div></div>;
}

function ReviewBlock({ title, rows, onEdit, dark = false }: { title: string; rows: [string, string][]; onEdit: () => void; dark?: boolean }) {
  return (
    <div className={`${dark ? "card-dark" : "card"} p-5`}>
      <div className="flex items-center justify-between"><div className={`label ${dark ? "text-ink-fg/55" : ""}`}>{title}</div><button onClick={onEdit} className={`text-[12px] font-bold ${dark ? "text-accent" : "text-muted hover:text-ink"}`}>Edit</button></div>
      <dl className={`mt-2 divide-y ${dark ? "divide-ink-fg/10" : "divide-line"}`}>{rows.map(([k, v]) => <div key={k} className="flex justify-between py-1.5 text-[13px]"><dt className={dark ? "text-ink-fg/60" : "text-muted"}>{k}</dt><dd className="font-bold tnum">{v}</dd></div>)}</dl>
    </div>
  );
}

function RowEditor<T extends { id: number }>({ rows, onChange, empty, render }: { rows: T[]; onChange: (r: T[]) => void; empty: T; render: (row: T, set: (r: T) => void) => React.ReactNode }) {
  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {rows.map((row) => (
          <motion.div key={row.id} layout initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, height: 0 }} className="card flex items-start gap-3 p-3">
            {render(row, (r) => onChange(rows.map((x) => (x.id === row.id ? r : x))))}
            <button onClick={() => onChange(rows.filter((x) => x.id !== row.id))} className="grid h-10 w-10 shrink-0 place-items-center pill text-subtle hover:bg-bad-soft hover:text-bad" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button variant="secondary" onClick={() => onChange([...rows, { ...empty, id: Date.now() }])} icon={<Plus className="h-4 w-4" />}>Add</Button>
    </div>
  );
}

/* ---------------- Build scene ---------------- */
const BUILD_STAGES = ["Reading your inputs", "Mapping your financial structure", "Calculating cash flow", "Connecting goals", "Applying assumptions", "Preparing possible futures", "Your Twin is ready"];

export function BuildTwinScene({ name }: { name: string }) {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const pct = useCountUp(100, { duration: 5600 });
  useEffect(() => {
    const timers = BUILD_STAGES.map((_, i) => setTimeout(() => setStage(i), i * 850));
    const done = setTimeout(() => router.push("/onboarding/complete"), BUILD_STAGES.length * 850 + 900);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [router]);
  return (
    <div className="glow grid min-h-screen place-items-center bg-page px-6">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto h-44 w-44">
          <CircularProgress value={pct / 100} size={176} stroke={6}><div><div className="text-[36px] font-extrabold tracking-tight tnum">{Math.round(pct)}</div><div className="label-sm">percent</div></div></CircularProgress>
          {[0, 1, 2].map((i) => <motion.span key={i} className="absolute inset-0 rounded-full border border-accent/40" animate={{ scale: [1, 1.25 + i * 0.1], opacity: [0.5, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }} />)}
        </div>
        <h1 className="mt-8 text-[28px] font-extrabold tracking-tight">Building your Financial Twin…</h1>
        <p className="mt-1 text-[13px] text-muted">{name.split(" ")[0]}, this takes a few seconds.</p>
        <ol className="mx-auto mt-8 max-w-xs space-y-2 text-left">
          {BUILD_STAGES.map((s, i) => (
            <motion.li key={s} animate={{ opacity: i <= stage ? 1 : 0.3, x: i <= stage ? 0 : 6 }} transition={{ duration: 0.35 }} className="flex items-center gap-3 text-[13.5px] font-semibold">
              <span className={`grid h-6 w-6 place-items-center pill ${i < stage ? "bg-ink text-accent" : i === stage ? "bg-accent text-accent-ink" : "bg-card3 text-subtle"}`}>{i < stage ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 pill bg-current" />}</span>{s}
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function CompleteScene({ name, netWorth, currency }: { name: string; netWorth: number; currency: string }) {
  return (
    <div className="glow grid min-h-screen place-items-center bg-page px-6">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }} className="w-full max-w-lg text-center">
        <motion.span className="mx-auto grid h-16 w-16 place-items-center pill bg-ink text-accent" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 }}><Check className="h-7 w-7" strokeWidth={2.5} /></motion.span>
        <h1 className="mt-6 text-[34px] font-extrabold tracking-tight leading-tight">Your Twin is ready, {name.split(" ")[0]}.</h1>
        <p className="mt-2 text-[14px] text-muted">Starting net worth in the model:</p>
        <div className="mt-1 text-[40px] font-extrabold tracking-tight tnum"><AnimatedNumber value={netWorth} format={(n) => formatMoney(n, currency)} duration={1400} /></div>
        <div className="mt-8 flex flex-wrap justify-center gap-2"><Button size="lg" href="/overview">Open my overview</Button><Button size="lg" variant="secondary" href="/scenarios">Explore a scenario</Button></div>
        <div className="mt-6"><StatusBadge tone="neutral" dot={false}>Educational model · not financial advice</StatusBadge></div>
        <p className="mt-3 text-[11.5px] text-subtle"><Link href="/twin" className="underline-offset-2 hover:underline">Review the full Twin</Link></p>
      </motion.div>
    </div>
  );
}
