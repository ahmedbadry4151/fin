export function formatMoney(value: number, currency = "EGP", opts: { compact?: boolean; sign?: boolean; decimals?: number } = {}) {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? "−" : opts.sign && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  let body: string;
  if (opts.compact) {
    if (abs >= 1_000_000_000) body = `${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
    else if (abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`;
    else if (abs >= 10_000) body = `${Math.round(abs / 1000)}k`;
    else if (abs >= 1_000) body = `${(abs / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    else body = abs.toFixed(0);
  } else {
    body = abs.toLocaleString("en-US", { maximumFractionDigits: opts.decimals ?? 0, minimumFractionDigits: opts.decimals ?? 0 });
  }
  return `${sign}${currency} ${body}`;
}

export function formatNumber(value: number, decimals = 0) {
  return (Number.isFinite(value) ? value : 0).toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function formatPct(value: number, decimals = 1, sign = false) {
  const n = (Number.isFinite(value) ? value : 0) * 100;
  const s = sign && n > 0 ? "+" : "";
  return `${s}${n.toFixed(decimals)}%`;
}

export function formatMonths(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 24) return `${(value / 12).toFixed(1)} years`;
  return `${value.toFixed(1)} months`;
}

export function formatDate(value: string | Date | null | undefined, style: "short" | "long" | "month" = "short") {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length === 10 ? value + "T00:00:00" : value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  if (style === "month") return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  if (style === "long") return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function relativeTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(d);
}

export function monthLabel(offsetMonths: number, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() + offsetMonths, 1);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function yearLabel(offsetMonths: number, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() + offsetMonths, 1);
  return String(d.getFullYear());
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, Math.min(d.getDate(), 28));
}
