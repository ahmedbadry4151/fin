"use client";

import { motion } from "framer-motion";
import { DUR, EASE_IN_OUT, EASE_OUT } from "./tokens";

const TONE: Record<string, string> = {
  accent: "var(--accent)",
  ink: "var(--ink)",
  good: "var(--good)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  muted: "var(--subtle)",
};

export function ProgressBar({
  value,
  height = 8,
  tone = "accent",
  className = "",
  delay = 0,
  marker,
  trackClassName = "",
  trackColor,
}: {
  value: number;
  height?: number;
  tone?: keyof typeof TONE;
  className?: string;
  delay?: number;
  marker?: number;
  trackClassName?: string;
  trackColor?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={`relative w-full overflow-hidden pill bg-card3 ${trackClassName} ${className}`}
      style={{ height, background: trackColor }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full w-full pill origin-left"
        style={{ background: TONE[tone] }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: DUR.modal, ease: EASE_IN_OUT, delay: DUR.leadIn + delay }}
      />
      {marker !== undefined && (
        <motion.div
          className="absolute top-0 h-full w-[2px] bg-ink"
          initial={{ left: 0, opacity: 0 }}
          animate={{ left: `${Math.max(0, Math.min(1, marker)) * 100}%`, opacity: 1 }}
          transition={{ duration: DUR.modal, ease: EASE_IN_OUT, delay: DUR.leadIn + delay + DUR.fast }}
        />
      )}
    </div>
  );
}

export function CircularProgress({
  value,
  size = 72,
  stroke = 6,
  tone = "accent",
  children,
  delay = 0,
  trackColor = "var(--card-3)",
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: keyof typeof TONE;
  children?: React.ReactNode;
  delay?: number;
  trackColor?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: DUR.rare, ease: EASE_OUT, delay: DUR.leadIn + delay }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
