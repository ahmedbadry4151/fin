"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-ink-fg hover:bg-ink-deep shadow-card",
  secondary: "bg-card2 text-ink hover:bg-card3 border border-line",
  accent: "bg-accent text-accent-ink hover:brightness-[1.03] shadow-card",
  ghost: "bg-transparent text-ink hover:bg-card2",
  outline: "bg-transparent text-ink border border-line-strong hover:bg-card2",
  danger: "bg-bad-soft text-bad hover:brightness-95 border border-transparent",
};

const SIZE: Record<Size, string> = {
  xs: "h-7 px-3 text-[11.5px] gap-1.5",
  sm: "h-8 px-3.5 text-[12.5px] gap-1.5",
  md: "h-10 px-4.5 text-[13px] gap-2",
  lg: "h-12 px-6 text-[14px] gap-2",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  href?: string;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", href, loading, icon, iconRight, className, children, disabled, ...rest },
  ref,
) {
  const cls = cn(
    "inline-flex items-center justify-center pill font-semibold whitespace-nowrap select-none press focus-ring transition-colors duration-200",
    VARIANT[variant],
    SIZE[size],
    (disabled || loading) && "opacity-60 pointer-events-none",
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {iconRight}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
});

export function IconButton({ children, className, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn("grid h-9 w-9 place-items-center pill text-muted hover:text-ink hover:bg-card2 press focus-ring transition-colors", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
