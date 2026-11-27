"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

type HSV = { h: number; s: number; v: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function hexToHsv(hex: string): HSV {
  let c = hex.replace("#", "").trim();
  if (/^[0-9a-f]{3}$/i.test(c)) c = c.split("").map((x) => x + x).join("");
  if (!/^[0-9a-f]{6}$/i.test(c)) c = "3b82f6";
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex({ h, s, v }: HSV): string {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) { r = c; g = x; }
  else if (hh < 120) { r = x; g = c; }
  else if (hh < 180) { g = c; b = x; }
  else if (hh < 240) { g = x; b = c; }
  else if (hh < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const part = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function ColorPicker({ value, onChange, active = false }: { value: string; onChange: (hex: string) => void; active?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: globalThis.PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      const target = e.target as HTMLElement | null;
      if (!target?.closest("button, a, input, select, textarea, [tabindex]")) triggerRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const apply = (next: HSV) => {
    setHsv(next);
    setHexInput(hsvToHex(next));
    onChange(hsvToHex(next));
  };

  const openPicker = () => {
    const next = hexToHsv(value);
    setHsv(next);
    setHexInput(value);
    setOpen(true);
  };

  const updateFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const el = fieldRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    apply({ ...hsv, s: clamp((e.clientX - r.left) / r.width, 0, 1), v: 1 - clamp((e.clientY - r.top) / r.height, 0, 1) });
  };

  const setHex = (text: string) => {
    setHexInput(text);
    const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(text.trim());
    if (!m) return;
    const hex = m[1].length === 3 ? `#${m[1].split("").map((x) => x + x).join("")}` : `#${m[1]}`;
    setHsv(hexToHsv(hex));
    onChange(hex);
  };

  const preview = hsvToHex(hsv);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Custom accent color"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="grid h-8 w-8 place-items-center rounded-full focus-ring press"
      >
        <span
          className={`h-8 w-8 rounded-full border-2 border-dashed border-line-strong ${active ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""}`}
          style={{ background: "conic-gradient(from 0deg, #f3c142, #f97316, #ef4444, #ec4899, #a855f7, #3b82f6, #14b8a6, #22c55e, #f3c142)" }}
        />
      </button>
      {open && (
        <div role="dialog" aria-label="Custom color picker" className="absolute left-0 top-[calc(100%+8px)] z-[70] w-[264px] max-w-[calc(100vw-32px)] rounded-2xl border border-line bg-card p-3 shadow-panel">
          <div
            ref={fieldRef}
            onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); updateFromPointer(e); }}
            onPointerMove={(e) => { if (dragging.current) updateFromPointer(e); }}
            onPointerUp={(e) => { dragging.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
            onPointerCancel={() => { dragging.current = false; }}
            onLostPointerCapture={() => { dragging.current = false; }}
            className="relative h-36 w-full cursor-crosshair rounded-xl"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))` }}
          >
            <span className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-card" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: preview }} />
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(hsv.h)}
            aria-label="Hue"
            onChange={(e) => apply({ ...hsv, h: Number(e.target.value) })}
            className="mt-3 h-3 w-full rounded-full"
            style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
          />
          <div className="mt-3 flex items-center gap-2">
            <span className="h-7 w-7 shrink-0 rounded-full border border-line" style={{ background: preview }} />
            <input
              value={hexInput}
              onChange={(e) => setHex(e.target.value)}
              aria-label="Hex color"
              spellCheck={false}
              className="h-9 w-full rounded-xl border border-line bg-card2 px-3 text-[12.5px] font-semibold tnum text-ink outline-none focus-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}
