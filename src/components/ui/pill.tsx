"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "./button";

export type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "ink";

const TONE: Record<Tone, string> = {
  neutral: "bg-card3 text-muted",
  accent: "bg-accent text-accent-ink",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  ink: "bg-ink text-ink-fg",
};

export function StatusBadge({ tone = "neutral", children, dot = true, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 pill px-2.5 py-1 text-[11px] font-semibold leading-none", TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 pill bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Chip({ children, className, icon }: { children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 pill border border-line bg-card px-3 py-1 text-[12px] font-medium text-ink", className)}>
      {icon}
      {children}
    </span>
  );
}

export function AccentChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 pill bg-ink px-3 py-1.5 text-[12px] font-semibold text-ink-fg shadow-card", className)}>
      <span className="h-1.5 w-1.5 pill bg-accent" />
      {children}
    </span>
  );
}

/** Pill-shaped segmented control with a shared moving indicator. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = "md",
  className,
  dark = false,
}: {
  options: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
  size?: "sm" | "md";
  className?: string;
  dark?: boolean;
}) {
  return (
    <div role="tablist" className={cn("inline-flex items-center gap-1 pill bg-card2 p-1 border border-line", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative pill font-semibold transition-colors focus-ring whitespace-nowrap",
              size === "sm" ? "px-3 py-1 text-[11.5px]" : "px-3.5 py-1.5 text-[12.5px]",
              active ? (dark ? "text-ink-fg" : "text-ink-fg") : "text-muted hover:text-ink",
            )}
          >
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 pill bg-ink shadow-card" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined && <span className={cn("tnum text-[10px] opacity-70")}>{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Link-based tabs sharing an indicator (for sub-pages). */
export function PillTabs({ items, current, layoutId, className }: { items: { href: string; label: string }[]; current: string; layoutId: string; className?: string }) {
  return (
    <nav className={cn("inline-flex items-center gap-1 pill bg-card2 p-1 border border-line overflow-x-auto no-scrollbar max-w-full", className)} aria-label="Sections">
      {items.map((it) => {
        const active = it.href === current;
        return (
          <Link key={it.href} href={it.href} className={cn("relative pill px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap focus-ring transition-colors", active ? "text-ink-fg" : "text-muted hover:text-ink")}>
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 pill bg-ink shadow-card" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative z-10">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function FilterPill({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "pill px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap press focus-ring transition-colors border",
        active ? "bg-ink text-ink-fg border-ink shadow-card" : "bg-card text-muted border-line hover:text-ink hover:bg-card2",
        className,
      )}
    >
      {children}
    </button>
  );
}
