"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./button";

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

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { prefix?: string; suffix?: string }>(function Input({ className, prefix, suffix, ...rest }, ref) {
  if (prefix || suffix) {
    return (
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted">{prefix}</span>}
        <input ref={ref} className={cn(inputBase, "h-11 tnum", prefix && "pl-14", suffix && "pr-14", className)} {...rest} />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted">{suffix}</span>}
      </div>
    );
  }
  return <input ref={ref} className={cn(inputBase, "h-11", className)} {...rest} />;
});

export function MoneyInput({ value, onChange, currency = "EGP", className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: number; onChange: (n: number) => void; currency?: string }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      prefix={currency}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={className}
      min={0}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "h-11 appearance-none bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10", className)} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23a19f94' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")" }} {...rest}>
      {children}
    </select>
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
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 pill transition-colors duration-200 focus-ring", checked ? "bg-ink" : "bg-card3")}
      >
        <motion.span
          className={cn("absolute top-0.5 h-5 w-5 pill shadow-card", checked ? "bg-accent" : "bg-card")}
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
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
        onClick={() => onChange(!checked)}
        className={cn("grid h-5 w-5 place-items-center rounded-[7px] border transition-colors focus-ring", checked ? "bg-ink border-ink text-ink-fg" : "bg-card border-line-strong")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 13l4 4L19 7" initial={false} animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ duration: 0.25 }} />
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
      whileTap={{ scale: 0.98 }}
      animate={{ scale: selected ? 1 : 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
