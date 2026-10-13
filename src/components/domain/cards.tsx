"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowUpRight, Play, Pencil, Copy, MoreHorizontal, ArrowDownLeft, ArrowLeftRight, Trash2 } from "lucide-react";
import { formatMoney, formatDate, formatPct, relativeTime } from "@/lib/format";
import { CATEGORY_LABEL, goalStatus, monthsBetween } from "@/lib/finance";
import { describeParams } from "@/lib/scenarios";
import type { ScenarioParams } from "@/lib/simulation";
import { ProgressBar } from "../motion/progress";
import { AnimatedNumber } from "../motion/count-up";
import { StatusBadge, Chip, type Tone } from "../ui/pill";
import { Icon } from "../ui/states";
import { cn } from "../ui/button";

/* ---------------- Goal ---------------- */
export const GOAL_ICON: Record<string, string> = { emergency: "ShieldCheck", home: "Home", car: "Car", marriage: "Heart", education: "GraduationCap", travel: "Plane", retirement: "Sunset", business: "Rocket", debt_free: "Unlink", wealth: "TrendingUp", custom: "Target" };

export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  on_track: { label: "On track", tone: "good" },
  attention: { label: "Needs attention", tone: "warn" },
  at_risk: { label: "At risk", tone: "bad" },
  reached: { label: "Reached", tone: "accent" },
};

export type GoalCardData = { id: number; name: string; type: string; targetAmount: number; currentAmount: number; targetDate: string; monthlyContribution: number; status: string };

export function GoalCard({ goal, probability, currency, href, compact = false, selected = false, onClick }: { goal: GoalCardData; probability?: number | null; currency: string; href?: string; compact?: boolean; selected?: boolean; onClick?: () => void }) {
  const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
  const st = STATUS_META[goalStatus(progress, probability ?? null)];
  const months = monthsBetween(new Date(), new Date(goal.targetDate));
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 place-items-center pill", selected ? "bg-accent text-accent-ink" : "bg-card3 text-ink")}>
            <Icon name={GOAL_ICON[goal.type] ?? "Target"} className="h-4.5 w-4.5" />
          </span>
          <div>
            <div className="text-[14.5px] font-bold tracking-tight leading-tight">{goal.name}</div>
            <div className="text-[11.5px] text-muted">
              {formatDate(goal.targetDate, "month")} · {months} months left
            </div>
          </div>
        </div>
        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[22px] font-extrabold tracking-tight leading-none tnum">
            <AnimatedNumber value={goal.currentAmount} format={(n) => formatMoney(n, currency)} />
          </div>
          <div className="mt-1 text-[11.5px] text-muted tnum">of {formatMoney(goal.targetAmount, currency)}</div>
        </div>
        <div className="text-right">
          <div className="text-[18px] font-extrabold tnum leading-none">{formatPct(progress, 0)}</div>
          {probability !== undefined && probability !== null && <div className="mt-1 text-[11.5px] text-muted tnum">{Math.round(probability * 100)}% simulated probability</div>}
        </div>
      </div>
      <ProgressBar value={progress} className="mt-3" />
      {!compact && (
        <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted">
          <span className="tnum">{formatMoney(goal.monthlyContribution, currency)}/month</span>
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            Details <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
    </>
  );
  const cls = cn("card card-hover block p-5 text-left w-full", selected && "ring-2 ring-accent");
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return (
    <Link href={href ?? `/goals/${goal.id}`} className={cls}>
      {inner}
    </Link>
  );
}

/* ---------------- Scenario ---------------- */
export type ScenarioCardData = { id: number; name: string; category: string; description: string | null; params: ScenarioParams; lastRunAt: string | Date | null; templateKey?: string | null };

export function ScenarioCard({ scenario, currency, outcome, onDuplicate, onDelete, iconName, index = 0 }: { scenario: ScenarioCardData; currency: string; outcome?: ReactNode; onDuplicate?: () => void; onDelete?: () => void; iconName?: string; index?: number }) {
  const lines = describeParams(scenario.params, currency);
  return (
    <motion.article layoutId={`scenario-${scenario.id}`} className="card card-hover group flex flex-col p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.05 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center pill bg-card3 text-ink transition-transform group-hover:translate-x-0.5">
            <Icon name={iconName ?? "GitBranch"} className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-[14.5px] font-bold tracking-tight leading-tight">{scenario.name}</h3>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{scenario.category}</div>
          </div>
        </div>
        <StatusBadge tone={scenario.lastRunAt ? "good" : "neutral"} dot>
          {scenario.lastRunAt ? `Run ${relativeTime(scenario.lastRunAt)}` : "Not run"}
        </StatusBadge>
      </div>
      {scenario.description && <p className="mt-3 text-[12.5px] text-muted leading-relaxed">{scenario.description}</p>}
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {lines.slice(0, 3).map((l) => (
          <li key={l}>
            <Chip className="text-[11px] py-0.5">{l}</Chip>
          </li>
        ))}
      </ul>
      {outcome && <div className="mt-3 rounded-2xl bg-card2 px-3.5 py-2.5 text-[12px]">{outcome}</div>}
      <div className="mt-4 flex items-center gap-1.5 border-t border-line pt-3">
        <Link href={`/simulations/new?scenario=${scenario.id}`} className="inline-flex items-center gap-1.5 pill bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-ink-fg press focus-ring">
          <Play className="h-3.5 w-3.5" /> Run
        </Link>
        <Link href={`/scenarios/${scenario.id}`} className="inline-flex items-center gap-1.5 pill bg-card2 px-3 py-1.5 text-[12px] font-semibold hover:bg-card3 press focus-ring">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
        {onDuplicate && (
          <button onClick={onDuplicate} className="inline-flex items-center gap-1.5 pill bg-card2 px-3 py-1.5 text-[12px] font-semibold hover:bg-card3 press focus-ring">
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </button>
        )}
        {onDelete ? (
          <button onClick={onDelete} className="ml-auto grid h-8 w-8 place-items-center pill text-muted hover:bg-bad-soft hover:text-bad press focus-ring" aria-label="Delete scenario">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="ml-auto grid h-8 w-8 place-items-center pill text-subtle">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        )}
      </div>
    </motion.article>
  );
}

/* ---------------- Account ---------------- */
export const ACCOUNT_ICON: Record<string, string> = { bank: "Landmark", savings: "PiggyBank", cash: "Banknote", investment: "TrendingUp", credit: "CreditCard", wallet: "Smartphone" };

export function AccountCard({ account, href, selected = false }: { account: { id: number; name: string; type: string; balance: number; currency: string; institution?: string | null; updatedAt: string | Date }; href?: string; selected?: boolean }) {
  return (
    <Link href={href ?? `/accounts/${account.id}`} className={cn("card card-hover flex items-center gap-4 p-4", selected && "ring-2 ring-accent")}>
      <span className="grid h-11 w-11 shrink-0 place-items-center pill bg-card3 text-ink">
        <Icon name={ACCOUNT_ICON[account.type] ?? "Wallet"} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold tracking-tight">{account.name}</div>
        <div className="text-[11.5px] text-muted capitalize">
          {account.type} {account.institution ? `· ${account.institution}` : ""} · updated {relativeTime(account.updatedAt)}
        </div>
      </div>
      <div className="text-right">
        <div className={cn("text-[17px] font-extrabold tracking-tight tnum", account.balance < 0 && "text-bad")}>
          <AnimatedNumber value={account.balance} format={(n) => formatMoney(n, account.currency)} />
        </div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-subtle">{account.currency}</div>
      </div>
    </Link>
  );
}

/* ---------------- Transaction ---------------- */
export type TxData = { id: number; description: string; category: string; type: string; amount: number; date: string; accountId: number | null };

export function TransactionRow({ t, accountName, currency, onClick, selected, actions }: { t: TxData; accountName?: string; currency: string; onClick?: () => void; selected?: boolean; actions?: ReactNode }) {
  const sign = t.type === "income" ? 1 : t.type === "expense" ? -1 : 0;
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={(e) => onClick && e.key === "Enter" && onClick()} className={cn("group flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer focus-ring rounded-2xl", selected ? "bg-accent/15" : "hover:bg-card2")}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center pill", t.type === "income" ? "bg-good-soft text-good" : t.type === "transfer" ? "bg-card3 text-muted" : "bg-card3 text-ink")}>
        {t.type === "income" ? <ArrowDownLeft className="h-4 w-4" /> : t.type === "transfer" ? <ArrowLeftRight className="h-4 w-4" /> : <Icon name={CATEGORY_ICON[t.category] ?? "Receipt"} className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{t.description}</div>
        <div className="truncate text-[11.5px] text-muted">
          {CATEGORY_LABEL[t.category] ?? t.category} · {formatDate(t.date)}
          {accountName ? ` · ${accountName}` : ""}
        </div>
      </div>
      <div className="hidden items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 md:flex">{actions}</div>
      <div className={cn("w-[120px] shrink-0 text-right text-[14px] font-bold tnum", sign > 0 ? "text-good" : sign === 0 ? "text-muted" : "")}>
        {sign === 0 ? "" : sign > 0 ? "+" : "−"}
        {formatMoney(Math.abs(t.amount), currency)}
      </div>
    </div>
  );
}

export const CATEGORY_ICON: Record<string, string> = { housing: "Home", food: "UtensilsCrossed", transportation: "Car", utilities: "Zap", healthcare: "HeartPulse", education: "GraduationCap", debt: "Landmark", family: "Users", entertainment: "Clapperboard", shopping: "ShoppingBag", travel: "Plane", subscriptions: "Repeat", other: "Receipt", salary: "Briefcase", freelance: "Laptop", savings: "PiggyBank", income: "ArrowDownLeft", transfer: "ArrowLeftRight" };

/* ---------------- Insight ---------------- */
export function InsightCard({ title, text, kpi, kpiLabel, href, cta = "Explore", tone = "neutral", icon = "Sparkles" }: { title: string; text: string; kpi?: string; kpiLabel?: string; href?: string; cta?: string; tone?: Tone; icon?: string }) {
  return (
    <article className="card flex flex-col p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center pill bg-card3">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <h3 className="text-[13.5px] font-bold tracking-tight">{title}</h3>
        {tone !== "neutral" && <StatusBadge tone={tone} className="ml-auto">{tone === "good" ? "Healthy" : tone === "warn" ? "Watch" : tone === "bad" ? "Risk" : "Insight"}</StatusBadge>}
      </div>
      {kpi && (
        <div className="mt-3">
          <div className="text-[24px] font-extrabold tracking-tight tnum leading-none">{kpi}</div>
          {kpiLabel && <div className="label-sm mt-1">{kpiLabel}</div>}
        </div>
      )}
      <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-muted">{text}</p>
      {href && (
        <Link href={href} className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-ink hover:gap-2 transition-all">
          {cta} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </article>
  );
}

/* ---------------- Report ---------------- */
export const REPORT_ICON: Record<string, string> = { snapshot: "Camera", twin: "Fingerprint", scenario: "GitBranch", goal: "Target", annual: "CalendarRange", simulation: "Activity" };

export function ReportCard({ report }: { report: { id: number; name: string; type: string; createdAt: string | Date } }) {
  return (
    <Link href={`/reports/${report.id}`} className="card card-hover flex items-center gap-4 p-4">
      <span className="grid h-11 w-11 place-items-center pill bg-card3">
        <Icon name={REPORT_ICON[report.type] ?? "FileText"} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold tracking-tight">{report.name}</div>
        <div className="text-[11.5px] text-muted capitalize">
          {report.type} report · {formatDate(report.createdAt)}
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-subtle" />
    </Link>
  );
}
