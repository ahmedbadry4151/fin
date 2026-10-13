export const DEFAULT_ACCENT = "#f3c142";

export function normalizeHex(hex: string): string {
  let c = (hex || "").replace("#", "").trim().toLowerCase();
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (!/^[0-9a-f]{6}$/.test(c)) c = DEFAULT_ACCENT.replace("#", "");
  return `#${c}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const c = normalizeHex(hex).slice(1);
  const n = parseInt(c, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: ((h % 360) + 360) % 360, s: s * 100, l: l * 100 };
}

function hsl(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s));
  const ll = Math.max(0, Math.min(100, l));
  return `hsl(${Math.round(hh)} ${Math.round(ss)}% ${Math.round(ll)}%)`;
}

function luminance(hex: string): number {
  const c = normalizeHex(hex).slice(1);
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function accentVars(color: string, dark: boolean): Record<string, string> {
  const { h, s, l } = hexToHsl(color);
  const warnH = (h + 28) % 360;
  const accL = dark ? Math.max(l, 58) : Math.min(Math.max(l, 28), 78);
  const acc = hsl(h, s, accL);
  const inkOnAccent = luminance(normalizeHex(color)) > 0.42
    ? hsl(h, Math.min(72, s * 0.8), 13)
    : hsl(h, 45, 97);
  const vars: Record<string, string> = dark
    ? {
        "--accent-base": normalizeHex(color),
        "--accent": acc,
        "--accent-soft": hsl(h, Math.min(60, s * 0.85), 26),
        "--accent-ink": inkOnAccent,
        "--glow-a": hsl(h, Math.min(60, s), 18),
        "--glow-b": hsl(h, Math.min(45, s * 0.7), 13),
        "--warn": hsl(warnH, 65, 68),
        "--warn-soft": hsl(warnH, 45, 22),
        "--yellow-color": color,
      }
    : {
        "--accent-base": normalizeHex(color),
        "--accent": acc,
        "--accent-soft": hsl(h, s * 0.9, 90),
        "--accent-ink": inkOnAccent,
        "--glow-a": hsl(h, s, 88),
        "--glow-b": hsl(h, s * 0.7, 94),
        "--warn": hsl(warnH, 70, 55),
        "--warn-soft": hsl(warnH, 80, 90),
        "--yellow-color": color,
      };
  return vars;
}

export function applyAccent(color: string, dark: boolean): void {
  if (typeof document === "undefined") return;
  const vars = accentVars(color, dark);
  const style = document.documentElement.style;
  for (const [k, v] of Object.entries(vars)) style.setProperty(k, v);
}
