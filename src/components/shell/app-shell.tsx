"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Search, Moon, Sun, LayoutGrid, Fingerprint, GitBranch, Target, Sparkles, Menu, X, ChevronRight } from "lucide-react";
import { Icon, Avatar } from "../ui/states";
import { useTheme, CurrencyProvider } from "../providers";
import { CommandPalette } from "./command-palette";
import { EASE_OUT } from "../motion/stagger";

export type ShellUser = { id: number; name: string; email: string; currency: string };

const NAV: { group: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    group: "Financial Life",
    items: [
      { href: "/overview", label: "Overview", icon: "LayoutGrid" },
      { href: "/twin", label: "Financial Twin", icon: "Fingerprint" },
      { href: "/accounts", label: "Accounts", icon: "Wallet" },
      { href: "/transactions", label: "Transactions", icon: "ArrowLeftRight" },
      { href: "/goals", label: "Goals", icon: "Target" },
    ],
  },
  {
    group: "Simulation Lab",
    items: [
      { href: "/scenarios", label: "Scenarios", icon: "GitBranch" },
      { href: "/simulations", label: "Simulations", icon: "Activity" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { href: "/ai", label: "AI Financial Intelligence", icon: "Sparkles" },
      { href: "/analytics", label: "Analytics", icon: "BarChart3" },
      { href: "/health", label: "Financial Health", icon: "HeartPulse" },
    ],
  },
  { group: "Economic Data", items: [{ href: "/economy", label: "Economic Environment", icon: "Globe" }] },
  { group: "Reports", items: [{ href: "/reports", label: "Reports", icon: "FileText" }] },
  {
    group: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: "User" },
      { href: "/notifications", label: "Notifications", icon: "Bell" },
      { href: "/settings", label: "Settings", icon: "Settings" },
    ],
  },
];

const MOBILE = [
  { href: "/overview", label: "Home", icon: LayoutGrid },
  { href: "/twin", label: "Twin", icon: Fingerprint },
  { href: "/scenarios", label: "Scenarios", icon: GitBranch },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/ai", label: "AI", icon: Sparkles },
];

export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="FinTwin home">
      <span className="relative grid h-8 w-8 place-items-center pill bg-ink">
        <span className="absolute h-3.5 w-3.5 pill border-2 border-accent" />
        <span className="absolute h-1.5 w-1.5 translate-x-[5px] -translate-y-[5px] pill bg-accent" />
      </span>
      <span className={`text-[16px] font-extrabold tracking-tight ${light ? "text-ink-fg" : ""}`}>FinTwin</span>
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ user, unread, children }: { user: ShellUser; unread: number; children: ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <CurrencyProvider currency={user.currency}>
      <div className="min-h-screen bg-page">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-line bg-canvas px-3 py-4 lg:flex no-print">
          <div className="px-2">
            <Logo />
          </div>
          <nav className="mt-6 flex-1 space-y-5 overflow-y-auto no-scrollbar pb-4" aria-label="Primary">
            {NAV.map((g) => (
              <div key={g.group}>
                <div className="label px-3 pb-1.5">{g.group}</div>
                <ul className="space-y-0.5">
                  {g.items.map((it) => {
                    const active = isActive(pathname, it.href);
                    return (
                      <li key={it.href}>
                        <Link href={it.href} className={`relative flex items-center gap-2.5 pill px-3 py-2 text-[13px] font-semibold transition-colors focus-ring ${active ? "text-ink-fg" : "text-muted hover:text-ink hover:bg-card2"}`}>
                          {active && <motion.span layoutId="nav-pill" className="absolute inset-0 pill bg-ink shadow-card" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                          <Icon name={it.icon} className="relative z-10 h-4 w-4" />
                          <span className="relative z-10 truncate">{it.label}</span>
                          {it.href === "/notifications" && unread > 0 && <span className="relative z-10 ml-auto grid h-4 min-w-4 place-items-center pill bg-accent px-1 text-[10px] font-bold text-accent-ink tnum">{unread}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-card p-2">
            <button onClick={toggle} className="grid h-8 w-8 place-items-center pill bg-card2 text-muted hover:text-ink press focus-ring" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link href="/settings" className="pill bg-card2 px-2.5 py-1.5 text-[11.5px] font-bold tnum hover:bg-card3" title="Currency">
              {user.currency}
            </Link>
            <Link href="/profile" className="ml-auto flex items-center gap-2 pill pr-2 hover:bg-card2" title="Profile">
              <Avatar name={user.name} size={30} />
            </Link>
          </div>
        </aside>

        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-page/80 px-4 backdrop-blur-md lg:ml-[232px] lg:px-7 no-print">
          <div className="lg:hidden">
            <Logo />
          </div>
          <button onClick={() => setPaletteOpen(true)} className="ml-auto hidden items-center gap-2 pill border border-line bg-card px-3.5 py-1.5 text-[12.5px] text-muted hover:text-ink hover:bg-card2 transition-colors sm:flex focus-ring">
            <Search className="h-3.5 w-3.5" />
            <span>Search or jump to…</span>
            <kbd className="ml-3 pill bg-card3 px-1.5 py-0.5 text-[10px] font-bold">⌘K</kbd>
          </button>
          <button onClick={() => setPaletteOpen(true)} className="ml-auto grid h-9 w-9 place-items-center pill text-muted sm:hidden" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <button onClick={toggle} className="grid h-9 w-9 place-items-center pill text-muted hover:text-ink hover:bg-card2 focus-ring lg:hidden" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link href="/notifications" className="relative grid h-9 w-9 place-items-center pill text-muted hover:text-ink hover:bg-card2 focus-ring" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }} className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center pill bg-accent px-1 text-[9.5px] font-bold text-accent-ink tnum">
                {unread}
              </motion.span>
            )}
          </Link>
          <Link href="/profile" className="hidden items-center gap-2 pill py-1 pl-1 pr-3 hover:bg-card2 sm:flex">
            <Avatar name={user.name} size={28} />
            <span className="text-[12.5px] font-semibold">{user.name.split(" ")[0]}</span>
          </Link>
        </header>

        {/* Content */}
        <main className="min-h-[calc(100vh-56px)] px-4 pb-28 pt-6 lg:ml-[232px] lg:px-7 lg:pb-12">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md lg:hidden no-print" aria-label="Mobile">
          <ul className="grid grid-cols-6">
            {MOBILE.map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <li key={it.href}>
                  <Link href={it.href} className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${active ? "text-ink" : "text-muted"}`}>
                    {active && <motion.span layoutId="mobile-pill" className="absolute top-1 h-7 w-12 pill bg-accent/40" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <it.icon className="relative z-10 h-4.5 w-4.5" strokeWidth={1.7} />
                    <span className="relative z-10">{it.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button onClick={() => setMoreOpen(true)} className="flex w-full flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-muted">
                <Menu className="h-4.5 w-4.5" strokeWidth={1.7} />
                More
              </button>
            </li>
          </ul>
        </nav>

        <AnimatePresence>
          {moreOpen && (
            <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
              <motion.div className="absolute inset-0 bg-ink-deep/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} />
              <motion.div className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-card p-5 pb-8 shadow-panel" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[15px] font-bold">More</span>
                  <button onClick={() => setMoreOpen(false)} className="grid h-8 w-8 place-items-center pill bg-card2" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ul className="divide-y divide-line">
                  {[
                    { href: "/accounts", label: "Accounts", icon: "Wallet" },
                    { href: "/transactions", label: "Transactions", icon: "ArrowLeftRight" },
                    { href: "/simulations", label: "Simulations", icon: "Activity" },
                    { href: "/analytics", label: "Analytics", icon: "BarChart3" },
                    { href: "/health", label: "Financial Health", icon: "HeartPulse" },
                    { href: "/economy", label: "Economic Environment", icon: "Globe" },
                    { href: "/reports", label: "Reports", icon: "FileText" },
                    { href: "/notifications", label: "Notifications", icon: "Bell" },
                    { href: "/settings", label: "Settings", icon: "Settings" },
                  ].map((it) => (
                    <li key={it.href}>
                      <Link href={it.href} className="flex items-center gap-3 py-3 text-[14px] font-semibold">
                        <span className="grid h-8 w-8 place-items-center pill bg-card3">
                          <Icon name={it.icon} className="h-4 w-4" />
                        </span>
                        {it.label}
                        <ChevronRight className="ml-auto h-4 w-4 text-subtle" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </CurrencyProvider>
  );
}
