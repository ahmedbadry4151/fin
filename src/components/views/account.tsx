"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Trash2, LogOut, Moon, Sun, ArrowUpRight } from "lucide-react";
import { Card, CardTitle, PageHeader, KeyValue } from "../ui/card";
import { Button } from "../ui/button";
import { Field, Input, Select, Toggle, OptionCard } from "../ui/field";
import { StatusBadge, PillTabs, FilterPill, SegmentedControl } from "../ui/pill";
import { ConfirmDialog } from "../ui/overlay";
import { Avatar, EmptyState, Icon } from "../ui/states";
import { Stagger, StaggerItem, EASE_OUT } from "../motion/stagger";
import { useToast } from "../motion/toast";
import { useTheme } from "../providers";
import { formatDate, relativeTime } from "@/lib/format";
import { CURRENCIES, EMPLOYMENT_TYPES } from "@/lib/finance";
import { PLANNING_STYLES } from "@/lib/economy";
import { exportAllData, exportReport } from "@/lib/client-api";
import { DEFAULT_ACCENT } from "@/lib/accent";

const PRESETS = ["#f3c142", "#f97316", "#ef4444", "#ec4899", "#a855f7", "#3b82f6", "#14b8a6", "#22c55e"];

type UserData = { name: string; email: string; age: number | null; country: string | null; city: string | null; currency: string; employment: string | null; planningStyle: string; emailVerified: boolean; createdAt: string; settings: Record<string, unknown> };

async function patch(body: unknown) {
  return fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

/* ---------------- Profile ---------------- */
export function ProfileView({ user, edit = false }: { user: UserData; edit?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user.name, age: user.age ?? 0, country: user.country ?? "", city: user.city ?? "", currency: user.currency, planningStyle: user.planningStyle, employment: user.employment ?? "employed" });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(edit);
  async function save() {
    setSaving(true);
    await patch(form);
    setSaving(false);
    setEditing(false);
    toast({ title: "Profile saved" });
    router.refresh();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <>
      <PageHeader eyebrow="Account · Profile" title="Profile" actions={<><Button variant="secondary" onClick={() => setEditing((e) => !e)}>{editing ? "Cancel" : "Edit profile"}</Button><Button variant="ghost" onClick={logout} icon={<LogOut className="h-4 w-4" />}>Sign out</Button></>} />
      <Stagger stagger={0.06} className="space-y-5">
        <StaggerItem>
          <Card dark className="flex flex-wrap items-center gap-5">
            <Avatar name={user.name} size={72} className="!bg-accent !text-accent-ink text-[24px]" />
            <div className="min-w-0 flex-1"><div className="text-[24px] font-extrabold tracking-tight">{user.name}</div><div className="text-[13px] text-ink-fg/60">{user.email}</div><div className="mt-2 flex flex-wrap gap-2"><StatusBadge tone="accent" dot={false}>{user.currency}</StatusBadge><StatusBadge tone={user.emailVerified ? "good" : "warn"}>{user.emailVerified ? "Email verified" : "Email not verified"}</StatusBadge><StatusBadge tone="neutral" dot={false}>Member since {formatDate(user.createdAt, "month")}</StatusBadge></div></div>
          </Card>
        </StaggerItem>
        <div className="grid gap-5 lg:grid-cols-3">
          <StaggerItem><Card className="h-full"><CardTitle>Personal information</CardTitle>{editing ? <div className="space-y-3"><Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Age"><Input type="number" value={form.age || ""} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} /></Field><Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field><Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field></div> : <KeyValue rows={[{ k: "Name", v: user.name }, { k: "Age", v: user.age ?? "—" }, { k: "Country", v: user.country ?? "—" }, { k: "City", v: user.city ?? "—" }]} />}</Card></StaggerItem>
          <StaggerItem><Card className="h-full"><CardTitle>Financial preferences</CardTitle>{editing ? <div className="space-y-3"><Field label="Currency"><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{CURRENCIES.map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Employment"><Select value={form.employment} onChange={(e) => setForm({ ...form, employment: e.target.value })}>{EMPLOYMENT_TYPES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field><Field label="Planning style"><Select value={form.planningStyle} onChange={(e) => setForm({ ...form, planningStyle: e.target.value })}>{PLANNING_STYLES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field></div> : <KeyValue rows={[{ k: "Currency", v: user.currency }, { k: "Employment", v: EMPLOYMENT_TYPES.find((x) => x.key === user.employment)?.label ?? "—" }, { k: "Planning style", v: PLANNING_STYLES.find((x) => x.key === user.planningStyle)?.label ?? "Balanced" }, { k: "Simulation defaults", v: <Link href="/settings/simulation" className="underline-offset-2 hover:underline">Settings</Link> }]} />}</Card></StaggerItem>
          <StaggerItem><Card className="h-full"><CardTitle>Account security</CardTitle><KeyValue rows={[{ k: "Password", v: <Link href="/reset-password" className="font-semibold underline-offset-2 hover:underline">Change</Link> }, { k: "Email", v: user.email }, { k: "Verification", v: user.emailVerified ? "Verified" : <Link href="/verify-email" className="underline-offset-2 hover:underline">Verify now</Link> }]} /></Card></StaggerItem>
        </div>
        {editing && <StaggerItem><div className="flex justify-end"><Button onClick={save} loading={saving}>Save profile</Button></div></StaggerItem>}
      </Stagger>
    </>
  );
}

/* ---------------- Notifications ---------------- */
type Notif = { id: number; kind: string; title: string; body: string; href: string | null; read: boolean; createdAt: string };
const KIND_ICON: Record<string, string> = { financial: "Wallet", goal: "Target", simulation: "Activity", system: "Bell" };

export function NotificationsView({ items }: { items: Notif[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [list, setList] = useState(items);
  const shown = list.filter((n) => filter === "all" || n.kind === filter);
  async function markAll() {
    setList((l) => l.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    router.refresh();
  }
  async function open(n: Notif) {
    setList((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
    router.refresh();
    if (n.href) router.push(n.href);
  }
  async function remove(id: number) {
    setList((l) => l.filter((x) => x.id !== id));
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  }
  return (
    <>
      <PageHeader eyebrow="Account · Notifications" title="Notifications" actions={<><Button variant="secondary" href="/settings/notifications">Preferences</Button><Button onClick={markAll} disabled={!list.some((n) => !n.read)}>Mark all read</Button></>} />
      <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">{["all", "financial", "goal", "simulation", "system"].map((k) => <FilterPill key={k} active={filter === k} onClick={() => setFilter(k)}><span className="capitalize">{k}</span></FilterPill>)}</div>
      {shown.length === 0 ? (
        <EmptyState icon="Bell" title="You're all caught up" description="Simulation results, goal milestones and data events will appear here." compact />
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {shown.map((n, i) => (
              <motion.li key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, delay: i * 0.03, ease: EASE_OUT }}>
                <div className={`card flex items-start gap-3 p-4 ${n.read ? "" : "ring-1 ring-accent/60"}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center pill ${n.read ? "bg-card3" : "bg-accent text-accent-ink"}`}><Icon name={KIND_ICON[n.kind] ?? "Bell"} className="h-4 w-4" /></span>
                  <button onClick={() => open(n)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><span className="text-[13.5px] font-bold">{n.title}</span>{!n.read && <span className="h-1.5 w-1.5 pill bg-accent" />}</div><div className="text-[12.5px] text-muted">{n.body}</div><div className="mt-1 text-[11px] text-subtle capitalize">{n.kind} · {relativeTime(n.createdAt)}</div></button>
                  {n.href && <Link href={n.href} className="grid h-8 w-8 place-items-center pill text-muted hover:bg-card2" aria-label="Open"><ArrowUpRight className="h-4 w-4" /></Link>}
                  <button onClick={() => remove(n.id)} className="grid h-8 w-8 place-items-center pill text-subtle hover:bg-bad-soft hover:text-bad" aria-label="Dismiss"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}

/* ---------------- Settings ---------------- */
const SETTINGS_TABS = [{ href: "/settings", label: "Account & appearance" }, { href: "/settings/notifications", label: "Notifications" }, { href: "/settings/simulation", label: "Simulation" }, { href: "/settings/ai", label: "AI" }, { href: "/settings/privacy", label: "Privacy" }, { href: "/settings/data", label: "Data" }];

function SettingsShell({ current, title, description, children }: { current: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Account · Settings" title={title} description={description} />
      <PillTabs items={SETTINGS_TABS} current={current} layoutId="settings-tabs" className="mb-5" />
      {children}
    </>
  );
}

export function SettingsView({ user }: { user: UserData }) {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme, yellowColor, setYellowColor } = useTheme();
  const [currency, setCurrency] = useState(user.currency);
  async function saveCurrency(v: string) {
    setCurrency(v);
    await patch({ currency: v });
    toast({ title: `Currency set to ${v}` });
    router.refresh();
  }
  return (
    <SettingsShell current="/settings" title="Settings" description="Appearance, currency, security — and the deeper simulation, AI, privacy and data controls.">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardTitle>Appearance</CardTitle><div className="grid grid-cols-2 gap-2"><OptionCard selected={theme === "light"} onClick={() => setTheme("light")} title="Light" hint="Warm cream surfaces" icon={<Sun className="h-4 w-4" />} /><OptionCard selected={theme === "dark"} onClick={() => setTheme("dark")} title="Dark" hint="Charcoal with luminous amber" icon={<Moon className="h-4 w-4" />} /></div><div className="mt-4"><label className="text-xs font-medium text-muted block mb-1">Accent color</label><div className="flex flex-wrap items-center gap-2">{PRESETS.map((c) => <button key={c} type="button" aria-label={`Accent ${c}`} onClick={() => setYellowColor(c)} className={`h-8 w-8 rounded-full border-2 press ${yellowColor.toLowerCase() === c.toLowerCase() ? "border-ink" : "border-transparent"}`} style={{ background: c }} />)}<input type="color" value={yellowColor} onChange={e => setYellowColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-2 border-transparent p-0" aria-label="Custom accent color" /></div></div><div className="mt-3"><Button size="sm" variant="secondary" onClick={() => { setYellowColor(DEFAULT_ACCENT); toast({ title: "Accent reset to default" }); }}>Reset to default</Button></div><p className="mt-3 text-[11.5px] text-muted">Buttons, charts, notifications, selects, highlights — the whole site follows this color.</p></Card>
        <Card><CardTitle>Currency</CardTitle><div className="flex flex-wrap gap-1.5">{CURRENCIES.map((x) => <FilterPill key={x} active={currency === x} onClick={() => saveCurrency(x)}>{x}</FilterPill>)}</div><p className="mt-3 text-[11.5px] text-muted">Display currency for every value. Amounts are not converted.</p></Card>
        <Card><CardTitle>Account</CardTitle><KeyValue rows={[{ k: "Name", v: user.name }, { k: "Email", v: user.email }, { k: "Member since", v: formatDate(user.createdAt) }]} /><div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" href="/profile?edit=1">Edit profile</Button><Button size="sm" variant="secondary" href="/reset-password">Change password</Button></div></Card>
        <Card><CardTitle>Security</CardTitle><KeyValue rows={[{ k: "Email verification", v: user.emailVerified ? <StatusBadge tone="good">Verified</StatusBadge> : <Link href="/verify-email" className="font-semibold">Verify</Link> }, { k: "Sessions", v: "This device" }, { k: "Session length", v: "30 days" }]} /></Card>
      </div>
    </SettingsShell>
  );
}

export function NotificationSettingsView({ settings }: { settings: Record<string, unknown> }) {
  const router = useRouter();
  const { toast } = useToast();
  const initial = (settings.notifications as Record<string, boolean> | undefined) ?? { financial: true, goals: true, simulation: true, system: true };
  const [prefs, setPrefs] = useState(initial);
  async function set(k: string, v: boolean) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    await patch({ settings: { notifications: next } });
    toast({ title: "Notification preferences saved" });
    router.refresh();
  }
  return (
    <SettingsShell current="/settings/notifications" title="Notification settings">
      <Card className="divide-y divide-line">
        {[{ k: "financial", label: "Financial", hint: "Spending changes, low balances, income changes" }, { k: "goals", label: "Goals", hint: "Progress, risk and milestones" }, { k: "simulation", label: "Simulation", hint: "Finished runs and scenario updates" }, { k: "system", label: "System", hint: "Imports and data validation" }].map((x) => <Toggle key={x.k} className="py-3.5" checked={prefs[x.k] !== false} onChange={(v) => set(x.k, v)} label={x.label} description={x.hint} />)}
      </Card>
    </SettingsShell>
  );
}

export function SimulationSettingsView({ settings, planningStyle, horizon }: { settings: Record<string, unknown>; planningStyle: string; horizon: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [paths, setPaths] = useState(String((settings.defaultPaths as number | undefined) ?? 600));
  const [style, setStyle] = useState(planningStyle);
  async function save() {
    await patch({ planningStyle: style, settings: { defaultPaths: Number(paths) } });
    toast({ title: "Simulation defaults saved" });
    router.refresh();
  }
  return (
    <SettingsShell current="/settings/simulation" title="Simulation settings">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardTitle>Default paths</CardTitle><SegmentedControl layoutId="settings-paths" value={paths} onChange={setPaths} options={[100, 300, 600, 1000, 5000].map((n) => ({ value: String(n), label: n.toLocaleString() }))} /><p className="mt-3 text-[12px] text-muted">Used when you start a new simulation. Horizon currently {horizon} years — change it in the <Link href="/economy" className="font-semibold underline-offset-2 hover:underline">Economic Environment</Link>.</p></Card>
        <Card><CardTitle>Planning style</CardTitle><div className="space-y-2">{PLANNING_STYLES.map((s) => <OptionCard key={s.key} compact selected={style === s.key} onClick={() => setStyle(s.key)} title={s.label} hint={s.hint} />)}</div><p className="mt-3 text-[11.5px] text-muted">Changes model assumptions and scenario ranges. It does not predict your future or provide investment advice.</p></Card>
      </div>
      <div className="mt-4 flex justify-end"><Button onClick={save}>Save defaults</Button></div>
    </SettingsShell>
  );
}

export function AiSettingsView({ settings }: { settings: Record<string, unknown> }) {
  const router = useRouter();
  const { toast } = useToast();
  const initial = (settings.ai as Record<string, boolean> | undefined) ?? { transparency: true, followUps: true, autoSimulate: true };
  const [prefs, setPrefs] = useState(initial);
  async function set(k: string, v: boolean) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    await patch({ settings: { ai: next } });
    toast({ title: "AI settings saved" });
    router.refresh();
  }
  return (
    <SettingsShell current="/settings/ai" title="AI settings" description="The intelligence layer only reads your Financial Twin and simulations. Nothing is sent to third parties.">
      <Card className="divide-y divide-line">
        <Toggle className="py-3.5" checked={prefs.transparency !== false} onChange={(v) => set("transparency", v)} label="Show model context by default" description="Expand data, assumptions and simulation details under every answer" />
        <Toggle className="py-3.5" checked={prefs.followUps !== false} onChange={(v) => set("followUps", v)} label="Suggest follow-up questions" />
        <Toggle className="py-3.5" checked={prefs.autoSimulate !== false} onChange={(v) => set("autoSimulate", v)} label="Run quick simulations inside answers" description="Uses 300 preview paths; full runs stay in the Simulation Lab" />
      </Card>
    </SettingsShell>
  );
}

export function PrivacyView() {
  return (
    <SettingsShell current="/settings/privacy" title="Privacy">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardTitle>What FinTwin stores</CardTitle><ul className="space-y-2 text-[13px] text-muted">{["Your profile, currency and planning preferences", "The Financial Twin: income, expenses, accounts, assets, liabilities, goals", "Transactions you add or import", "Scenarios, simulation results and their assumptions", "AI questions and the grounded answers"].map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />{x}</li>)}</ul></Card>
        <Card><CardTitle>What it does not do</CardTitle><ul className="space-y-2 text-[13px] text-muted">{["Connect to your bank without your action", "Sell or share your data", "Send your model to external AI providers", "Make predictions it presents as certain"].map((x) => <li key={x} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 pill bg-accent" />{x}</li>)}</ul><Button className="mt-4" variant="secondary" href="/settings/data">Manage your data</Button></Card>
      </div>
    </SettingsShell>
  );
}

export function DataManagementView({ isDemo }: { isDemo: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<null | "transactions" | "profile" | "account">(null);
  const [busy, setBusy] = useState(false);
  async function run(scope: "transactions" | "profile" | "account") {
    setBusy(true);
    const r = await fetch("/api/data", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope }) });
    setBusy(false);
    setConfirm(null);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      return toast({ title: d.error ?? "Couldn't complete that action", tone: "warn" });
    }
    toast({ title: scope === "transactions" ? "Transactions deleted" : scope === "profile" ? "Financial profile deleted" : "Account deleted" });
    router.push(scope === "account" ? "/" : scope === "profile" ? "/onboarding" : "/transactions");
    router.refresh();
  }
  return (
    <SettingsShell current="/settings/data" title="Data management" description="Export everything, import, back up, or remove data. Destructive actions ask for confirmation.">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardTitle>Export & backup</CardTitle><div className="flex flex-wrap gap-2"><Button icon={<Download className="h-4 w-4" />} onClick={() => exportAllData()}>Export all data (JSON)</Button><Button variant="secondary" onClick={() => exportReport("csv")}>Export CSV</Button><Button variant="secondary" href="/transactions/import">Import data</Button></div><p className="mt-3 text-[12px] text-muted">A JSON export doubles as a backup; re-import transactions from CSV at any time. Restore uses the same import flow.</p></Card>
        <Card><CardTitle>Danger zone</CardTitle><div className="space-y-2">
          <div className="flex items-center justify-between rounded-2xl bg-card2 p-3"><div><div className="text-[13px] font-semibold">Delete transactions</div><div className="text-[11.5px] text-muted">Keeps accounts and the Twin model.</div></div><Button size="sm" variant="danger" onClick={() => setConfirm("transactions")}>Delete</Button></div>
          <div className="flex items-center justify-between rounded-2xl bg-card2 p-3"><div><div className="text-[13px] font-semibold">Delete financial profile</div><div className="text-[11.5px] text-muted">Removes the Twin, goals, scenarios and simulations. You'll rebuild from onboarding.</div></div><Button size="sm" variant="danger" onClick={() => setConfirm("profile")}>Delete</Button></div>
          <div className="flex items-center justify-between rounded-2xl bg-card2 p-3"><div><div className="text-[13px] font-semibold">Delete account</div><div className="text-[11.5px] text-muted">{isDemo ? "Not available for the shared demo account." : "Everything, permanently."}</div></div><Button size="sm" variant="danger" disabled={isDemo} onClick={() => setConfirm("account")}>Delete</Button></div>
        </div></Card>
      </div>
      <ConfirmDialog open={confirm !== null} onClose={() => setConfirm(null)} onConfirm={() => confirm && run(confirm)} loading={busy} destructive confirmLabel={confirm === "account" ? "Delete my account" : "Delete permanently"} title={confirm === "transactions" ? "Delete all transactions?" : confirm === "profile" ? "Delete your financial profile?" : "Delete your account?"} description={confirm === "transactions" ? "All recorded transactions will be removed. Account balances stay as they are." : confirm === "profile" ? "Your Financial Twin, goals, scenarios, simulations and reports will be removed. This cannot be undone." : "Your account and every piece of data associated with it will be deleted. This cannot be undone."} />
    </SettingsShell>
  );
}
