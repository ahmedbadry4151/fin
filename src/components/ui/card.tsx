"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "./button";
import { AnimatedNumber } from "../motion/count-up";
import { InfoTip } from "../motion/primitives";

export function Card({ children, className, dark = false, compact = false, hover = false, as: Tag = "div" }: { children: ReactNode; className?: string; dark?: boolean; compact?: boolean; hover?: boolean; as?: "div" | "section" | "article" }) {
  return <Tag className={cn(dark ? "card-dark" : compact ? "card-compact" : "card", hover && "card-hover", compact ? "p-4" : "p-5", className)}>{children}</Tag>;
}

export function CardTitle({ children, hint, action, className }: { children: ReactNode; hint?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-start justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        <h3 className="text-[14px] font-bold tracking-tight">{children}</h3>
        {hint && <InfoTip content={hint} />}
      </div>
      {action}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, action, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        {eyebrow && <div className="label mb-1.5">{eyebrow}</div>}
        <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight leading-tight">{title}</h2>
        {description && <p className="mt-1 max-w-xl text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="label mb-2">{eyebrow}</div>}
        <h1 className="text-[26px] md:text-[32px] font-extrabold tracking-tight leading-[1.05]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  format,
  display,
  delta,
  deltaTone = "neutral",
  hint,
  icon,
  dark = false,
  href,
  size = "md",
  className,
  footer,
  animate = true,
  delay = 0,
}: {
  label: string;
  value?: number;
  format?: (n: number) => string;
  display?: ReactNode;
  delta?: ReactNode;
  deltaTone?: "neutral" | "good" | "warn" | "bad" | "accent";
  hint?: ReactNode;
  icon?: ReactNode;
  dark?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  footer?: ReactNode;
  animate?: boolean;
  delay?: number;
}) {
  const toneCls = { neutral: dark ? "text-ink-fg/60" : "text-muted", good: "text-good", warn: "text-warn", bad: "text-bad", accent: dark ? "text-accent" : "text-accent-ink" }[deltaTone];
  const valueCls = size === "lg" ? "text-[34px] md:text-[38px]" : size === "sm" ? "text-[20px]" : "text-[26px] md:text-[30px]";
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className={cn("label", dark && "text-ink-fg/55")}>{label}</div>
        <div className="flex items-center gap-1.5">
          {hint && <InfoTip content={hint} />}
          {icon && <span className={cn("grid h-7 w-7 place-items-center pill", dark ? "bg-ink-fg/10 text-ink-fg" : "bg-card3 text-ink")}>{icon}</span>}
          {href && <ArrowUpRight className={cn("h-4 w-4", dark ? "text-ink-fg/50" : "text-subtle")} />}
        </div>
      </div>
      <div className={cn("mt-2 font-extrabold tracking-tight leading-none tnum", valueCls)}>
        {display ?? (value !== undefined ? animate ? <AnimatedNumber value={value} format={format} delay={delay} /> : <span>{format ? format(value) : value}</span> : "—")}
      </div>
      {(delta || footer) && <div className={cn("mt-2 text-[12px] font-medium", toneCls)}>{delta ?? footer}</div>}
    </>
  );
  const cls = cn(dark ? "card-dark" : "card", "p-5 relative", href && "card-hover block", className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

export function Stat({ label, value, sub, className, dark = false }: { label: string; value: ReactNode; sub?: ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={className}>
      <div className={cn("label-sm", dark && "text-ink-fg/50")}>{label}</div>
      <div className="mt-1 text-[17px] font-bold tracking-tight tnum">{value}</div>
      {sub && <div className={cn("text-[11.5px]", dark ? "text-ink-fg/60" : "text-muted")}>{sub}</div>}
    </div>
  );
}

export function KeyValue({ rows, dark = false, className }: { rows: { k: ReactNode; v: ReactNode }[]; dark?: boolean; className?: string }) {
  return (
    <dl className={cn("divide-y", dark ? "divide-ink-fg/10" : "divide-line", className)}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-2 text-[13px]">
          <dt className={dark ? "text-ink-fg/60" : "text-muted"}>{r.k}</dt>
          <dd className="font-semibold tnum text-right">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}
