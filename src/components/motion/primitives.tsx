"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState, type ReactNode } from "react";
import { EASE_OUT } from "./stagger";

/* ---------------- Page transition ---------------- */
export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.34, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Tooltip ---------------- */
export function Tooltip({ content, children, side = "top", className = "" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom"; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className={`pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 pill bg-ink px-3 py-1.5 text-[11.5px] font-medium leading-snug text-ink-fg shadow-float ${
              side === "top" ? "bottom-full mb-2" : "top-full mt-2"
            }`}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function InfoTip({ content }: { content: ReactNode }) {
  return (
    <Tooltip content={content}>
      <button type="button" className="grid h-4 w-4 place-items-center pill border border-line-strong text-[9px] font-bold text-muted focus-ring" aria-label="More information">
        i
      </button>
    </Tooltip>
  );
}

/* ---------------- Reflow list ---------------- */
export function ReflowList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
}

export function ReflowItem({ children, className = "", highlight = false, index = 0, layoutId }: { children: ReactNode; className?: string; highlight?: boolean; index?: number; layoutId?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout={!reduce}
      layoutId={layoutId}
      initial={reduce ? false : { opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, backgroundColor: highlight ? "var(--accent-soft)" : "rgba(0,0,0,0)" }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, transition: { duration: 0.28, ease: EASE_OUT } }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(index, 12) * 0.04, backgroundColor: { duration: highlight ? 0.2 : 1 } }}
      className={`overflow-hidden rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Accordion ---------------- */
export function Collapse({ open, children, className = "" }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE_OUT }}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Ken Burns ---------------- */
export function KenBurns({ children, className = "", scale = 1.18, duration = 4, active = true, origin = "50% 40%" }: { children: ReactNode; className?: string; scale?: number; duration?: number; active?: boolean; origin?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={{ transformOrigin: origin }}
      animate={reduce || !active ? { scale: 1 } : { scale }}
      transition={{ duration, ease: [0.3, 0.1, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Shared pill ---------------- */
export function SharedPill({ layoutId, className = "" }: { layoutId: string; className?: string }) {
  return <motion.span layoutId={layoutId} className={`absolute inset-0 -z-0 pill ${className}`} transition={{ type: "spring", stiffness: 400, damping: 32 }} />;
}
