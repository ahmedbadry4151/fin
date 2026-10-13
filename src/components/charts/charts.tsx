"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { EASE_OUT } from "../motion/stagger";

/* ---------------- Histogram ---------------- */
export function Histogram({ bins, percentiles, currency = "EGP", height = 200, className = "" }: { bins: { from: number; to: number; count: number }[]; percentiles?: Record<string, number>; currency?: string; height?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bins.map((b) => b.count));
  const total = bins.reduce((s, b) => s + b.count, 0);
  const median = percentiles?.p50;
  const lo = bins[0]?.from ?? 0;
  const hi = bins[bins.length - 1]?.to ?? 1;
  const pos = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const pctLabels = percentiles ? (["p5", "p15", "p25", "p50", "p75", "p85", "p95"] as const).filter((k) => percentiles[k] !== undefined) : [];

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label="Distribution of simulated outcomes">
        {bins.map((b, i) => {
          const isMedian = median !== undefined && median >= b.from && median < b.to;
          return (
            <div key={i} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <motion.div
                className="w-full rounded-t-md"
                style={{ background: isMedian ? "var(--accent)" : "var(--ink)", opacity: isMedian ? 1 : hover === null ? 0.6 + 0.4 * (b.count / max) : hover === i ? 1 : 0.35 }}
                initial={reduce ? false : { height: 0 }}
                animate={{ height: `${(b.count / max) * 100}%` }}
                transition={{ duration: 0.6, ease: EASE_OUT, delay: i * 0.02 }}
              />
              {hover === i && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 pill bg-ink px-3 py-1.5 text-[11px] text-ink-fg shadow-float">
                  <span className="font-bold tnum">{Math.round((b.count / total) * 100)}%</span> of paths · <span className="tnum">{formatMoney(b.from, "", { compact: true })}–{formatMoney(b.to, "", { compact: true })}</span>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
      {pctLabels.length > 0 && (
        <div className="relative mt-2 h-8">
          {pctLabels.map((k) => (
            <div key={k} className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${Math.max(2, Math.min(98, pos(percentiles![k])))}%` }}>
              <span className={`h-2 w-px ${k === "p50" ? "bg-accent" : "bg-line-strong"}`} />
              <span className={`mt-0.5 text-[10px] font-semibold ${k === "p50" ? "text-ink" : "text-subtle"}`}>{k.slice(1)}th</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 flex justify-between text-[10px] text-subtle tnum">
        <span>{formatMoney(lo, currency, { compact: true })}</span>
        <span>{formatMoney(hi, currency, { compact: true })}</span>
      </div>
    </div>
  );
}

/* ---------------- Sparkline ---------------- */
export function Sparkline({ data, color = "var(--accent)", height = 40, width = 120, fill = true, className = "", strokeWidth = 2 }: { data: number[]; color?: string; height?: number; width?: number; fill?: boolean; className?: string; strokeWidth?: number }) {
  const reduce = useReducedMotion();
  const d = useMemo(() => {
    if (data.length < 2) return { line: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const x = (i: number) => (i / (data.length - 1)) * width;
    const y = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
    const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [data, width, height]);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} style={{ width, height }} aria-hidden>
      {fill && <path d={d.area} fill={color} opacity={0.12} />}
      <motion.path d={d.line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE_OUT }} />
    </svg>
  );
}

/* ---------------- Horizontal bars ---------------- */
export function HBars({ rows, currency = "EGP", format, className = "", onSelect, selected }: { rows: { key?: string; label: string; value: number; tone?: "ink" | "accent" | "muted" | "good" | "bad"; display?: string }[]; currency?: string; format?: (n: number) => string; className?: string; onSelect?: (key: string) => void; selected?: string | null }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const color = { ink: "var(--ink)", accent: "var(--accent)", muted: "var(--subtle)", good: "var(--good)", bad: "var(--bad)" };
  return (
    <div className={`space-y-2.5 ${className}`}>
      {rows.map((r, i) => {
        const key = r.key ?? r.label;
        const Tag = onSelect ? "button" : "div";
        return (
          <Tag key={key} onClick={onSelect ? () => onSelect(key) : undefined} className={`block w-full text-left ${onSelect ? "group rounded-xl px-1 -mx-1 hover:bg-card2 transition-colors" : ""} ${selected && selected !== key ? "opacity-50" : ""}`}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="font-semibold">{r.label}</span>
              <span className="tnum font-bold">{r.display ?? (format ? format(r.value) : formatMoney(r.value, currency))}</span>
            </div>
            <div className="h-2 w-full overflow-hidden pill bg-card3">
              <motion.div className="h-full pill" style={{ background: color[r.tone ?? "ink"] }} initial={reduce ? false : { width: 0 }} animate={{ width: `${(Math.abs(r.value) / max) * 100}%` }} transition={{ duration: 0.7, ease: EASE_OUT, delay: i * 0.05 }} />
            </div>
          </Tag>
        );
      })}
    </div>
  );
}

/* ---------------- Grouped bars (cash flow) ---------------- */
export function GroupedBars({ groups, currency = "EGP", height = 220, className = "" }: { groups: { label: string; values: { key: string; value: number; tone: "ink" | "accent" | "muted" }[] }[]; currency?: string; height?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...groups.flatMap((g) => g.values.map((v) => v.value)));
  const color = { ink: "var(--ink)", accent: "var(--accent)", muted: "var(--card-3)" };
  return (
    <div className={className}>
      <div className="flex items-end gap-3" style={{ height }}>
        {groups.map((g, gi) => (
          <div key={g.label} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(gi)} onMouseLeave={() => setHover(null)}>
            <div className="flex h-full items-end justify-center gap-1">
              {g.values.map((v, vi) => (
                <motion.div key={v.key} className="w-full max-w-[22px] rounded-t-md" style={{ background: color[v.tone], opacity: hover === null || hover === gi ? 1 : 0.4 }} initial={reduce ? false : { height: 0 }} animate={{ height: `${(v.value / max) * 100}%` }} transition={{ duration: 0.6, ease: EASE_OUT, delay: gi * 0.05 + vi * 0.04 }} />
              ))}
            </div>
            {hover === gi && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 pill bg-ink px-3 py-2 text-[11px] text-ink-fg shadow-float">
                <div className="font-semibold opacity-70">{g.label}</div>
                {g.values.map((v) => (
                  <div key={v.key} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 pill" style={{ background: v.tone === "muted" ? "var(--subtle)" : color[v.tone] }} />
                    <span className="opacity-70">{v.key}</span>
                    <span className="ml-auto font-bold tnum">{formatMoney(v.value, currency)}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {groups.map((g) => (
          <div key={g.label} className="flex-1 text-center text-[10.5px] font-semibold text-subtle">
            {g.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Donut ---------------- */
export function Donut({ segments, size = 160, stroke = 18, centerLabel, centerValue, className = "" }: { segments: { label: string; value: number; color: string }[]; size?: number; stroke?: number; centerLabel?: string; centerValue?: string; className?: string }) {
  const reduce = useReducedMotion();
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-3)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <motion.circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} initial={reduce ? false : { opacity: 0, strokeDasharray: `0 ${c}` }} animate={{ opacity: 1, strokeDasharray: `${len} ${c - len}` }} transition={{ duration: 0.8, ease: EASE_OUT, delay: i * 0.08 }} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          {centerLabel && <div className="label-sm">{centerLabel}</div>}
          {centerValue && <div className="text-[18px] font-extrabold tracking-tight tnum">{centerValue}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Simple line (history) ---------------- */
export function LineChart({ points, currency = "EGP", height = 200, color = "var(--accent)", className = "", secondary }: { points: { label: string; value: number }[]; currency?: string; height?: number; color?: string; className?: string; secondary?: { label: string; value: number }[] }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const all = [...points.map((p) => p.value), ...(secondary?.map((p) => p.value) ?? [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const d = (arr: { value: number }[]) => arr.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          setHover(Math.max(0, Math.min(points.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1)))));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(min + (max - min) * t)} y2={y(min + (max - min) * t)} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={pad.l - 6} y={y(min + (max - min) * t) + 3} fontSize="10" textAnchor="end" fill="var(--subtle)">
              {formatMoney(min + (max - min) * t, "", { compact: true })}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--subtle)">
            {p.label}
          </text>
        ))}
        {secondary && <motion.path d={d(secondary)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE_OUT }} />}
        <motion.path d={`${d(points)} L${x(points.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`} fill={color} opacity={0.1} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 0.1 }} transition={{ duration: 1 }} />
        <motion.path d={d(points)} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE_OUT }} />
        {points.map((p, i) => (
          <motion.circle key={i} cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 3.5} fill={hover === i ? "var(--accent)" : "var(--card)"} stroke={color} strokeWidth={2} animate={{ r: hover === i ? 6 : 3.5 }} transition={{ duration: 0.15 }} />
        ))}
      </svg>
      {hover !== null && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="pointer-events-none absolute top-1 z-10 pill bg-ink px-3 py-1.5 text-[11.5px] text-ink-fg shadow-float" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${x(hover) > W * 0.7 ? "-105%" : "8px"})` }}>
          <span className="opacity-70">{points[hover].label}</span> <span className="ml-1 font-bold tnum">{formatMoney(points[hover].value, currency)}</span>
          {secondary && <span className="ml-2 opacity-70 tnum">vs {formatMoney(secondary[hover]?.value ?? 0, "", { compact: true })}</span>}
        </motion.div>
      )}
    </div>
  );
}
