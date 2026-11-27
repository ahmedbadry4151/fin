"use client";

import { motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Children, forwardRef, Fragment, isValidElement, useEffect, useId, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./button";
import { DUR, SPRING } from "../motion/tokens";

export function Field({ label, hint, error, children, className, right }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <label className={cn("block", className)}>
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-ink">{label}</span>
          {right}
        </div>
      )}
      {children}
      {error ? <div className="mt-1.5 text-[11.5px] font-medium text-bad">{error}</div> : hint ? <div className="mt-1.5 text-[11.5px] text-muted">{hint}</div> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-2xl border border-line bg-card px-4 text-[14px] font-medium text-ink placeholder:text-subtle outline-none transition-[border-color,box-shadow] duration-200 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { prefix?: string; suffix?: ReactNode }>(function Input({ className, prefix, suffix, ...rest }, ref) {
  if (prefix || suffix) {
    return (
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted">{prefix}</span>}
        <input ref={ref} className={cn(inputBase, "h-11 tnum", prefix ? "pl-14" : undefined, suffix ? "pr-14" : undefined, className)} {...rest} />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted">{suffix}</span>}
      </div>
    );
  }
  return <input ref={ref} className={cn(inputBase, "h-11", className)} {...rest} />;
});

export function MoneyInput({ value, onChange, currency = "EGP", className, min = 0, max, step = 1, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: number; onChange: (n: number) => void; currency?: string }) {
  const lo = Number(min);
  const hi = max === undefined ? Number.POSITIVE_INFINITY : Number(max);
  const delta = Number(step) || 1;
  const stepBy = (dir: number) => {
    const next = Math.min(hi, Math.max(lo, value + dir * delta));
    onChange(Number.isFinite(next) ? next : 0);
  };
  const steppers = (
    <span className="flex flex-col gap-0.5">
      <button type="button" aria-label="Increase amount" disabled={value >= hi} onClick={() => stepBy(1)} className="grid h-4 w-5 place-items-center rounded-t-lg text-accent hover:text-ink focus-ring disabled:opacity-40"><ChevronUp className="h-3 w-3" strokeWidth={2.5} /></button>
      <button type="button" aria-label="Decrease amount" disabled={value <= lo} onClick={() => stepBy(-1)} className="grid h-4 w-5 place-items-center rounded-b-lg text-accent hover:text-ink focus-ring disabled:opacity-40"><ChevronDown className="h-3 w-3" strokeWidth={2.5} /></button>
    </span>
  );
  return (
    <Input
      type="number"
      inputMode="decimal"
      prefix={currency}
      suffix={steppers}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={className}
      min={min}
      max={max}
      step={step}
      {...rest}
    />
  );
}

type SelectItem = { value: string; label: string };

/** Flattens fragments and concatenates text children so option labels never stringify React elements. */
function collectOptions(nodes: ReactNode): SelectItem[] {
  const out: SelectItem[] = [];
  Children.forEach(nodes, (node) => {
    if (node === null || node === undefined || typeof node === "boolean") return;
    if (isValidElement<{ children?: ReactNode }>(node)) {
      if (node.type === Fragment) {
        out.push(...collectOptions(node.props.children));
        return;
      }
      const props = node.props as { value?: string | number; children?: ReactNode };
      const label = Children.toArray(props.children).map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : "")).join("");
      out.push({ value: String(props.value ?? label ?? ""), label });
      return;
    }
    if (out.length) out[out.length - 1].label += String(node);
  });
  return out;
}

export function Select({ className, children, value, onChange, disabled, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const items = collectOptions(children);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = String(value ?? "");
  const selected = items.find((it) => it.value === current);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const openAt = () => {
    setOpen(true);
    setActive(Math.max(0, items.findIndex((it) => it.value === current)));
  };
  const commit = (it: SelectItem) => {
    setOpen(false);
    triggerRef.current?.focus();
    onChange?.({ target: { value: it.value } } as unknown as ChangeEvent<HTMLSelectElement>);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || !items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openAt();
      setActive((a) => (e.key === "ArrowDown" ? Math.min(items.length - 1, a + 1) : Math.max(0, a - 1)));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : items.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && items[active]) commit(items[active]);
      else openAt();
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={rest["aria-label"]}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt())}
        onKeyDown={onKeyDown}
        className={cn(inputBase, "flex h-11 items-center justify-between gap-2 text-left", className)}
      >
        <span className="truncate">{selected?.label ?? items[0]?.label ?? ""}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div id={listId} role="listbox" className="absolute left-0 top-[calc(100%+6px)] z-[70] max-h-64 w-max min-w-full max-w-[min(90vw,320px)] overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-panel">
          {items.map((it, i) => (
            <button key={`${it.value}-${i}`} id={`${listId}-${i}`} type="button" role="option" tabIndex={-1} aria-selected={it.value === current} onMouseEnter={() => setActive(i)} onClick={() => commit(it)} className={cn("block w-full whitespace-nowrap rounded-xl px-3 py-2 text-left text-[13px] font-medium", i === active ? "bg-accent text-accent-ink" : "text-ink hover:bg-card2")}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-[96px] py-3 leading-relaxed", className)} {...rest} />;
}

export function Slider({ value, min, max, step = 1, onChange, className, label, display }: { value: number; min: number; max: number; step?: number; onChange: (n: number) => void; className?: string; label?: ReactNode; display?: ReactNode }) {
  const fill = ((value - min) / (max - min || 1)) * 100;
  const id = useId();
  return (
    <div className={className}>
      {(label || display) && (
        <div className="mb-2 flex items-center justify-between text-[12.5px]">
          <label htmlFor={id} className="font-semibold text-ink">
            {label}
          </label>
          <span className="font-bold tnum">{display}</span>
        </div>
      )}
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--fill" as string]: `${fill}%` }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, className }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; className?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4", className)}>
      {(label || description) && (
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold">{label}</span>
          {description && <span className="block text-[11.5px] text-muted">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === "string" ? label : undefined}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 pill transition-colors duration-200 focus-ring", checked ? "bg-ink" : "bg-card3")}
      >
        <motion.span
          className={cn("absolute left-0.5 top-0.5 h-5 w-5 pill shadow-card", checked ? "bg-accent" : "bg-card")}
          animate={{ x: checked ? 20 : 0 }}
          transition={SPRING.pill}
        />
      </button>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; className?: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5 text-[13px] font-medium", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={typeof label === "string" ? label : undefined}
        onClick={() => onChange(!checked)}
        className={cn("grid h-5 w-5 place-items-center rounded-[7px] border transition-colors focus-ring", checked ? "bg-ink border-ink text-ink-fg" : "bg-card border-line-strong")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 13l4 4L19 7" initial={false} animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ duration: DUR.fast }} />
        </svg>
      </button>
      {label}
    </label>
  );
}

export function OptionCard({ selected, onClick, title, hint, icon, className, compact = false }: { selected: boolean; onClick: () => void; title: ReactNode; hint?: ReactNode; icon?: ReactNode; className?: string; compact?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.96 }}
      animate={{ scale: selected ? 1 : 0.985 }}
      transition={SPRING.pill}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-2xl border text-left transition-colors focus-ring",
        compact ? "p-3" : "p-4",
        selected ? "border-ink bg-card shadow-card" : "border-line bg-card2 hover:bg-card",
        className,
      )}
    >
      {icon && <span className={cn("grid h-9 w-9 shrink-0 place-items-center pill", selected ? "bg-ink text-ink-fg" : "bg-card3 text-ink")}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold leading-tight">{title}</span>
        {hint && <span className="mt-0.5 block text-[11.5px] text-muted leading-snug">{hint}</span>}
      </span>
      <span className={cn("grid h-5 w-5 shrink-0 place-items-center pill transition-colors", selected ? "bg-accent text-accent-ink" : "border border-line-strong")}>{selected && <Check className="h-3 w-3" strokeWidth={3} />}</span>
    </motion.button>
  );
}
