"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { Icon } from "../ui/states";
import { useTheme } from "../providers";
import { EASE_OUT } from "../motion/stagger";

type Item = { id: string; label: string; hint?: string; icon: string; group: string; href?: string; run?: () => void };

const COMMANDS: Omit<Item, "group">[] = [
  { id: "add-account", label: "Add account", icon: "Plus", href: "/accounts/new" },
  { id: "add-transaction", label: "Add transaction", icon: "Plus", href: "/transactions/new" },
  { id: "add-goal", label: "Add goal", icon: "Target", href: "/goals/new" },
  { id: "create-scenario", label: "Create scenario", icon: "GitBranch", href: "/scenarios/new" },
  { id: "run-simulation", label: "Run simulation", icon: "Play", href: "/simulations/new" },
  { id: "ask-ai", label: "Ask AI", icon: "Sparkles", href: "/ai" },
  { id: "create-report", label: "Create report", icon: "FileText", href: "/reports/new" },
  { id: "analytics", label: "View analytics", icon: "BarChart3", href: "/analytics" },
  { id: "economy", label: "Open economic environment", icon: "Globe", href: "/economy" },
  { id: "twin", label: "Open Financial Twin", icon: "Fingerprint", href: "/twin" },
  { id: "theme", label: "Toggle theme", icon: "SunMoon" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { toggle } = useTheme();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { results: Item[] }) => setResults(d.results ?? []))
        .catch(() => {});
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const items: Item[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    const cmds = COMMANDS.filter((c) => !term || c.label.toLowerCase().includes(term)).map((c) => ({ ...c, group: "Commands" }));
    return [...results, ...cmds];
  }, [q, results]);

  const select = useCallback(
    (it: Item) => {
      onClose();
      if (it.id === "theme") toggle();
      else if (it.href) router.push(it.href);
    },
    [onClose, router, toggle],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(items.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter" && items[active]) {
        e.preventDefault();
        select(items[active]);
      } else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active, select, onClose]);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    items.forEach((it) => map.set(it.group, [...(map.get(it.group) ?? []), it]));
    return Array.from(map.entries());
  }, [items]);

  let flat = -1;
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[96] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div className="absolute inset-0 bg-ink-deep/40 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="relative w-full max-w-xl overflow-hidden rounded-[24px] bg-card shadow-panel" initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -4 }} transition={{ duration: 0.24, ease: EASE_OUT }}>
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <Search className="h-4 w-4 text-muted" />
              <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} placeholder="Search accounts, goals, scenarios, simulations… or run a command" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-subtle" />
              <kbd className="pill border border-line px-2 py-0.5 text-[10px] font-semibold text-muted">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {groups.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-muted">No matches yet.</div>}
              {groups.map(([group, list]) => (
                <motion.div key={group} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <div className="label px-3 pb-1 pt-3">{group}</div>
                  {list.map((it) => {
                    flat++;
                    const idx = flat;
                    const isActive = idx === active;
                    return (
                      <button key={it.id} onMouseEnter={() => setActive(idx)} onClick={() => select(it)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${isActive ? "bg-ink text-ink-fg" : "hover:bg-card2"}`}>
                        <span className={`grid h-8 w-8 place-items-center pill ${isActive ? "bg-ink-fg/10" : "bg-card3"}`}>
                          <Icon name={it.icon} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{it.label}</span>
                          {it.hint && <span className={`block truncate text-[11px] ${isActive ? "text-ink-fg/60" : "text-muted"}`}>{it.hint}</span>}
                        </span>
                        {isActive && <CornerDownLeft className="h-3.5 w-3.5 opacity-60" />}
                      </button>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
