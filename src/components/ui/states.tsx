"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { icons, type LucideProps } from "lucide-react";
import { cn, Button } from "./button";
import { initials } from "@/lib/format";

export function Icon({ name, className, strokeWidth = 1.5, ...rest }: { name: string } & LucideProps) {
  const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[name] ?? icons.Circle;
  return <Cmp className={className} strokeWidth={strokeWidth} {...rest} />;
}

export function Avatar({ name, size = 36, className, src }: { name: string; size?: number; className?: string; src?: string }) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center pill bg-ink text-ink-fg font-bold select-none overflow-hidden", className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      aria-label={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}

export function EmptyState({ icon = "Sparkles", title, description, action, className, compact = false }: { icon?: string; title: string; description?: ReactNode; action?: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn("card flex flex-col items-center justify-center text-center", compact ? "px-5 py-8" : "px-6 py-14", className)}>
      <span className="grid h-12 w-12 place-items-center pill bg-card3 text-ink">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-[16px] font-bold tracking-tight">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something didn't work", description, onRetry, secondary, className }: { title?: string; description?: ReactNode; onRetry?: () => void; secondary?: ReactNode; className?: string }) {
  return (
    <div className={cn("card flex flex-col items-center px-6 py-12 text-center", className)} role="alert">
      <span className="grid h-12 w-12 place-items-center pill bg-warn-soft text-warn">
        <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <h3 className="mt-4 text-[16px] font-bold tracking-tight">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-[13px] text-muted">{description}</p>}
      <div className="mt-5 flex gap-2">
        {onRetry && (
          <Button onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>
            Retry
          </Button>
        )}
        {secondary}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-card3", className)} />;
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="card p-5">
      <Skeleton className="h-3 w-32" />
      <div className="mt-4 flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-line p-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <Skeleton className="h-9 w-9 pill" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-5 h-2 w-full pill" />
        </div>
      ))}
    </div>
  );
}
