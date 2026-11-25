"use client";

import { motion } from "framer-motion";
import { useId, useMemo, useState } from "react";
import { formatMoney, monthLabel, yearLabel } from "@/lib/format";
import { DUR, EASE_OUT } from "../motion/tokens";
import { usePrefersReducedMotion } from "../motion/use-prefers-reduced-motion";

type Series = { p5?: number[]; p15?: number[]; p25?: number[]; p50: number[]; p75?: number[]; p85?: number[]; p95?: number[]; mean?: number[] };

export function FanChart({
  series,
  baseline,
  currency = "EGP",
  height = 280,
  compact = false,
  goalTarget,
  goalMonth,
  animate = true,
  showLegend = true,
  className = "",
}: {
  series: Series;
  baseline?: number[] | null;
  currency?: string;
  height?: number;
  compact?: boolean;
  goalTarget?: number;
  goalMonth?: number;
  animate?: boolean;
  showLegend?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const reduce = usePrefersReducedMotion();
  const W = 800;
  const H = height;
  const padL = compact ? 8 : 56;
  const padR = compact ? 8 : 16;
  const padT = 14;
  const padB = compact ? 8 : 26;
  const n = series.p50.length;

  const { minV, maxV } = useMemo(() => {
    const all = [...(series.p5 ?? series.p50), ...(series.p95 ?? series.p50), ...(baseline ?? [])];
    if (goalTarget) all.push(goalTarget);
    let min = Math.min(...all);
    let max = Math.max(...all);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.06;
    return { minV: min - pad, maxV: max + pad };
  }, [series, baseline, goalTarget]);

  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - minV) / (maxV - minV)) * (H - padT - padB);

  const points = (arr: number[]) => arr.map((v, i) => ({ x: x(i), y: y(v) }));

  // Monotone cubic interpolation: smooth, continuous curves that never
  // overshoot a monthly data point (unlike a plain Catmull-Rom spline).
  const curve = (pts: { x: number; y: number }[]) => {
    const count = pts.length;
    if (count < 2) return "";
    const dx: number[] = [];
    const slope: number[] = [];
    for (let i = 0; i < count - 1; i++) {
      dx.push(pts[i + 1].x - pts[i].x);
      slope.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1));
    }
    const m: number[] = new Array(count);
    m[0] = slope[0];
    m[count - 1] = slope[count - 2];
    for (let i = 1; i < count - 1; i++) {
      if (slope[i - 1] * slope[i] <= 0) m[i] = 0;
      else {
        const w1 = 2 * dx[i] + dx[i - 1];
        const w2 = dx[i] + 2 * dx[i - 1];
        m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
      }
    }
    for (let i = 0; i < count - 1; i++) {
      if (slope[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
      } else {
        const a = m[i] / slope[i];
        const b = m[i + 1] / slope[i];
        const mag = Math.hypot(a, b);
        if (mag > 3) {
          m[i] = ((3 * a) / mag) * slope[i];
          m[i + 1] = ((3 * b) / mag) * slope[i];
        }
      }
    }
    let d = "";
    for (let i = 0; i < count - 1; i++) {
      const step = dx[i] / 3;
      d += ` C${(pts[i].x + step).toFixed(1)},${(pts[i].y + m[i] * step).toFixed(1)} ${(pts[i + 1].x - step).toFixed(1)},${(pts[i + 1].y - m[i + 1] * step).toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
    }
    return d;
  };
  const line = (arr: number[]) => {
    const pts = points(arr);
    return pts.length ? `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}${curve(pts)}` : "";
  };
  const band = (lo: number[], hi: number[]) => {
    const top = points(hi);
    const bottom = points(lo).reverse();
    return top.length ? `M${top[0].x.toFixed(1)},${top[0].y.toFixed(1)}${curve(top)} ${curve(bottom)} Z` : "";
  };

  const ticks = useMemo(() => {
    const out: number[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) out.push(minV + ((maxV - minV) * i) / steps);
    return out;
  }, [minV, maxV]);

  const xTicks = useMemo(() => {
    const years = Math.round((n - 1) / 12);
    const every = years > 15 ? 60 : years > 6 ? 24 : 12;
    const out: number[] = [];
    for (let i = 0; i < n; i += every) out.push(i);
    return out;
  }, [n]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - padL) / (W - padL - padR)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const draw = animate && !reduce;
  const hi = hover;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} onPointerDown={onMove} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Projected net worth range over time">
        <defs>
          <pattern id={`hatch-${id}`} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(135)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--line-strong)" strokeWidth="1" />
          </pattern>
        </defs>
        {!compact &&
          ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={i === 0 ? undefined : "2 4"} />
              <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--subtle)" className="tnum">
                {formatMoney(t, "", { compact: true }).trim()}
              </text>
            </g>
          ))}
        {!compact &&
          xTicks.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : "middle"} fontSize="10" fill="var(--subtle)">
              {i === 0 ? "Today" : yearLabel(i)}
            </text>
          ))}

        {series.p5 && series.p95 && (
          <motion.path d={band(series.p5, series.p95)} fill={`url(#hatch-${id})`} initial={draw ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: DUR.rare, delay: DUR.rare }} />
        )}
        {series.p25 && series.p75 && (
          <motion.path d={band(series.p25, series.p75)} fill="var(--accent)" fillOpacity={0.18} initial={draw ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: DUR.rare, delay: DUR.base }} />
        )}
        {series.p5 && <motion.path d={line(series.p5)} fill="none" stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 4" initial={draw ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: DUR.rare, ease: EASE_OUT, delay: DUR.modal }} />}
        {series.p95 && <motion.path d={line(series.p95)} fill="none" stroke="var(--muted)" strokeWidth={1} strokeDasharray="1 4" initial={draw ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: DUR.rare, ease: EASE_OUT, delay: DUR.modal }} />}
        {baseline && <motion.path d={line(baseline)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 5" initial={draw ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: DUR.rare, ease: EASE_OUT, delay: DUR.fast }} />}
        {series.mean && <motion.path d={line(series.mean)} fill="none" stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="2 3" initial={draw ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: DUR.rare, ease: EASE_OUT, delay: DUR.fast }} />}
        <motion.path d={line(series.p50)} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" initial={draw ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: DUR.rare, ease: EASE_OUT }} />

        {goalTarget !== undefined && (
          <g>
            <line x1={padL} x2={goalMonth !== undefined ? x(Math.min(n - 1, goalMonth)) : W - padR} y1={y(goalTarget)} y2={y(goalTarget)} stroke="var(--ink)" strokeWidth={1} strokeDasharray="6 4" />
            {!compact && (
              <text x={W - padR} y={y(goalTarget) - 5} textAnchor="end" fontSize="10" fontWeight="700" fill="var(--ink)">
                Goal {formatMoney(goalTarget, "", { compact: true })}
              </text>
            )}
          </g>
        )}

        {hi !== null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={padT} y2={H - padB} stroke="var(--ink)" strokeWidth={1} strokeOpacity={0.4} />
            <circle cx={x(hi)} cy={y(series.p50[hi])} r={5} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
            {baseline && <circle cx={x(hi)} cy={y(baseline[hi])} r={3.5} fill="var(--muted)" stroke="var(--card)" strokeWidth={2} />}
          </g>
        )}
      </svg>

      {hi !== null && (
        <div className="pointer-events-none absolute top-2 z-10" style={{ left: `${(x(hi) / W) * 100}%`, transform: `translateX(${x(hi) > W * 0.7 ? "-105%" : "8px"})` }}>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.fast }}
            className="w-max min-w-[184px] rounded-[14px] bg-ink px-3 py-2 text-[11.5px] leading-[1.5] text-ink-fg shadow-float"
          >
            <div className="font-semibold opacity-60">{hi === 0 ? "Today" : monthLabel(hi)}</div>
            <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-1.5 w-1.5 shrink-0 pill bg-accent" />
              <span className="font-bold tnum">{formatMoney(series.p50[hi], currency)}</span>
              <span className="opacity-60">median</span>
            </div>
            {series.p5 && series.p95 && (
              <div className="mt-0.5 whitespace-nowrap tnum opacity-70">
                {formatMoney(series.p5[hi], "", { compact: true })} – {formatMoney(series.p95[hi], "", { compact: true })} <span className="opacity-60">(5th–95th)</span>
              </div>
            )}
            {baseline && <div className="mt-0.5 whitespace-nowrap tnum opacity-70">Current plan {formatMoney(baseline[hi], "", { compact: true })}</div>}
          </motion.div>
        </div>
      )}

      {showLegend && !compact && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
          <Legend swatch={<span className="h-[3px] w-5 pill bg-accent" />} label="Median" />
          {series.mean && <Legend swatch={<span className="h-[2px] w-5 border-t-2 border-dotted border-ink" />} label="Expected (mean)" />}
          {series.p25 && <Legend swatch={<span className="h-3 w-5 rounded-sm bg-accent/20" />} label="25th–75th" />}
          {series.p5 && <Legend swatch={<span className="h-3 w-5 rounded-sm hatch border border-line" />} label="5th–95th uncertainty" />}
          {series.p5 && <Legend swatch={<span className="h-[2px] w-5 border-t border-dashed border-muted" />} label="Stress (5th)" />}
          {series.p95 && <Legend swatch={<span className="h-[2px] w-5 border-t border-dotted border-muted" />} label="Optimistic (95th)" />}
          {baseline && <Legend swatch={<span className="h-[2px] w-5 border-t-2 border-dashed border-muted" />} label="Current plan" />}
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {label}
    </span>
  );
}
