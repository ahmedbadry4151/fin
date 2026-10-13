"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "./motion/toast";
import "@/lib/client-api";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({ theme: "light", setTheme: () => {}, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
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

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem("ft-theme")) as Theme | null;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    window.localStorage.setItem("ft-theme", t);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </ThemeContext.Provider>
  );
}
