"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  const [theme, setThemeState] = useState<Theme>("light");

  const [yellowInt, setYellowIntState] = useState(100);

  const [yellowColor, setYellowColorState] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem("ft-theme")) as Theme | null;
    const yStr = window.localStorage.getItem("ft-yellow") || DEFAULT_ACCENT;
    setYellowColorState(yStr);
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  useEffect(() => {
    applyAccent(yellowColor, theme === "dark");
  }, [yellowColor, theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    window.localStorage.setItem("ft-theme", t);
  }, []);

  const setYellowColor = useCallback((c: string) => {
    setYellowColorState(c);
    window.localStorage.setItem("ft-yellow", c);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark"), yellowInt, setYellowInt: setYellowIntState, yellowColor, setYellowColor }), [theme, setTheme, yellowInt, yellowColor, setYellowColor]);

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </ThemeContext.Provider>
  );
}
