"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "./motion/toast";
import { DEFAULT_ACCENT, applyAccent } from "@/lib/accent";
import "@/lib/client-api";

type Theme = "light" | "dark";
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  yellowInt?: number;
  setYellowInt: (n: number) => void;
  yellowColor: string; // hex
  setYellowColor: (c: string) => void;
}>({ theme: "light", setTheme: () => {}, toggle: () => {},  setYellowInt: () => {}, yellowColor: DEFAULT_ACCENT, setYellowColor: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

// localStorage is an external store. useSyncExternalStore reads it without a
// setState-in-effect and uses the server snapshot during hydration, so the
// persisted theme never produces a hydration mismatch.
const themeListeners = new Set<() => void>();
const accentListeners = new Set<() => void>();

function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  return () => { themeListeners.delete(cb); };
}

function subscribeAccent(cb: () => void) {
  accentListeners.add(cb);
  return () => { accentListeners.delete(cb); };
}

function getThemeSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("ft-theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function getAccentSnapshot(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  return window.localStorage.getItem("ft-yellow") || DEFAULT_ACCENT;
}

function getServerAccentSnapshot(): string {
  return DEFAULT_ACCENT;
}

export function YellowIntensity() {
  const { yellowInt = 100 } = useTheme();
  return (
    <style jsx global>{`
      :root { --yellow-base: 45; --yellow-sat: 95%; --yellow-light: 55%; }
      .yellow-slide { --y: ${yellowInt}; filter: hue-rotate(0deg); }
    `}</style>
  );
}

const CurrencyContext = createContext<string>("EGP");
export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyProvider({ currency, children }: { currency: string; children: ReactNode }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const yellowColor = useSyncExternalStore(subscribeAccent, getAccentSnapshot, getServerAccentSnapshot);
  const [yellowInt, setYellowInt] = useState(100);

  // DOM synchronisation is an effect responsibility, not state derivation.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    applyAccent(yellowColor, theme === "dark");
  }, [theme, yellowColor]);

  const setTheme = useCallback((t: Theme) => {
    window.localStorage.setItem("ft-theme", t);
    themeListeners.forEach((l) => l());
  }, []);

  const setYellowColor = useCallback((c: string) => {
    window.localStorage.setItem("ft-yellow", c);
    accentListeners.forEach((l) => l());
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark"), yellowInt, setYellowInt, yellowColor, setYellowColor }), [theme, setTheme, yellowInt, yellowColor, setYellowColor]);

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </ThemeContext.Provider>
  );
}
