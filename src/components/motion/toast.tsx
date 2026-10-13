"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT } from "./stagger";

export type ToastInput = { title: string; description?: string; action?: { label: string; onClick: () => void }; tone?: "accent" | "good" | "warn" | "bad"; duration?: number };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<{ toast: (t: ToastInput) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const DOT: Record<string, string> = { accent: "var(--accent)", good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((t: ToastInput) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), t.duration ?? 4200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-5 z-[100] flex flex-col gap-2 no-print" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: -20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -12, scale: 0.98 }}
              transition={{ duration: 0.32, ease: EASE_OUT }}
              className="pointer-events-auto flex items-center gap-3 pill bg-ink px-4 py-2.5 text-ink-fg shadow-float"
            >
              <span className="h-2 w-2 shrink-0 pill" style={{ background: DOT[t.tone ?? "accent"] }} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight">{t.title}</div>
                {t.description && <div className="text-[11.5px] opacity-70 leading-tight mt-0.5">{t.description}</div>}
              </div>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    setItems((prev) => prev.filter((x) => x.id !== t.id));
                  }}
                  className="ml-2 pill bg-accent px-3 py-1 text-[11.5px] font-semibold text-accent-ink press"
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
