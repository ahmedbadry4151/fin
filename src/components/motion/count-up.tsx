"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

export function useCountUp(target: number, opts: { duration?: number; delay?: number; start?: boolean } = {}) {
  const { duration = 1100, delay = 0, start = true } = opts;
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (!start) return;
    const from = current.current;
    const to = Number.isFinite(target) ? target : 0;
    if (reduce) {
      current.current = to;
      setValue(to);
      return;
    }
    if (from === to) return;
    let raf = 0;
    let begin: number | null = null;
    const tick = (ts: number) => {
      if (begin === null) begin = ts + delay;
      const t = Math.min(1, Math.max(0, (ts - begin) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      current.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else current.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, reduce, start]);

  return start ? value : 0;
}

export function AnimatedNumber({
  value,
  format,
  className,
  duration,
  delay,
  once = true,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, margin: "0px 0px -5% 0px" });
  const v = useCountUp(value, { duration, delay, start: inView });
  return (
    <span ref={ref} className={`tnum ${className ?? ""}`}>
      {format ? format(v) : Math.round(v).toLocaleString("en-US")}
    </span>
  );
}
