"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Mail } from "lucide-react";
import { Logo } from "../shell/app-shell";
import { Button } from "../ui/button";
import { Field, Input, Checkbox } from "../ui/field";
import { EASE_OUT } from "../motion/stagger";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/constants";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="glow grid min-h-screen place-items-center bg-page px-4 py-10">
      <motion.div layoutId="auth-card" className="w-full max-w-[420px]" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
        <div className="mb-6 flex justify-center">
          <motion.div initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}>
            <Logo />
          </motion.div>
        </div>
        <div className="card p-7">
          <h1 className="text-[24px] font-extrabold tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13px] text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-[12.5px] text-muted">{footer}</div>}
      </motion.div>
    </div>
  );
}

async function post(action: string, body: unknown) {
  const r = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, ...d } as { ok: boolean; error?: string; next?: string; message?: string };
}

export function SignUpView() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await post("signup", form);
    setLoading(false);
    if (!r.ok) return setError(r.error ?? "Something went wrong.");
    router.push(r.next ?? "/verify-email");
    router.refresh();
  }
  return (
    <AuthShell title="Create your FinTwin" subtitle="Start with a few details. Your Financial Twin comes next." footer={<>Already have an account? <Link href="/login" className="font-bold text-ink">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required /></Field>
        <Field label="Password" hint="At least 8 characters."><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} /></Field>
        {error && <div className="rounded-xl bg-warn-soft px-3 py-2 text-[12px] font-medium text-warn">{error}</div>}
        <Button type="submit" className="w-full" size="lg" loading={loading} iconRight={<ArrowRight className="h-4 w-4" />}>Continue</Button>
        <div className="flex items-center gap-3 text-[11px] text-subtle"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <Button type="button" variant="secondary" className="w-full" onClick={() => setError("Google sign-in isn't configured in this environment yet. Use email instead.")}>Continue with Google</Button>
        <p className="text-center text-[11px] text-subtle">We'll send a verification email. Educational tool — not financial advice.</p>
      </form>
    </AuthShell>
  );
}

export function LoginView() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    const r = await post("login", form);
    setLoading(false);
    if (!r.ok) return setError(r.error ?? "Couldn't log in.");
    router.push(r.next ?? "/overview");
    router.refresh();
  }
  async function demo() {
    setLoading(true);
    const r = await post("demo", {});
    setLoading(false);
    router.push(r.next ?? "/overview");
    router.refresh();
  }
  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue exploring your financial future." footer={<>New here? <Link href="/signup" className="font-bold text-ink">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input autoFocus type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required /></Field>
        <Field label="Password" right={<Link href="/forgot-password" className="text-[12px] font-semibold text-muted hover:text-ink">Forgot password?</Link>}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
        <Checkbox checked={form.remember} onChange={(v) => setForm({ ...form, remember: v })} label="Remember me" />
        {error && <div className="rounded-xl bg-warn-soft px-3 py-2 text-[12px] font-medium text-warn">{error}</div>}
        <Button type="submit" className="w-full" size="lg" loading={loading}>Log in</Button>
        <button type="button" onClick={demo} className="w-full rounded-2xl border border-dashed border-line-strong bg-card2 px-4 py-3 text-left transition-colors hover:bg-card3">
          <div className="text-[12.5px] font-bold">Explore the demo Twin</div>
          <div className="text-[11.5px] text-muted tnum">{DEMO_EMAIL} · {DEMO_PASSWORD}</div>
        </button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await post("forgot", { email });
    setLoading(false);
    setSent(true);
  }
  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send a reset link." footer={<Link href="/login" className="font-bold text-ink">Back to log in</Link>}>
      {sent ? (
        <div className="text-center"><motion.span className="mx-auto grid h-12 w-12 place-items-center pill bg-ink text-accent" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}><Mail className="h-5 w-5" /></motion.span><p className="mt-4 text-[13.5px] text-muted">If an account exists for <b className="text-ink">{email}</b>, a reset link is on its way.</p><Button className="mt-5" variant="secondary" href="/reset-password">I have a reset link</Button></div>
      ) : (
        <form onSubmit={submit} className="space-y-4"><Field label="Email"><Input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field><Button type="submit" className="w-full" size="lg" loading={loading}>Send reset link</Button></form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordView() {
  const router = useRouter();
  const [pw, setPw] = useState({ a: "", b: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.a !== pw.b) return setError("Passwords don't match.");
    setLoading(true);
    const r = await post("reset", { password: pw.a });
    setLoading(false);
    if (!r.ok) return setError(r.error ?? "Couldn't reset password.");
    router.push("/login");
  }
  return (
    <AuthShell title="Choose a new password" footer={<Link href="/login" className="font-bold text-ink">Back to log in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" hint="At least 8 characters."><Input autoFocus type="password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} minLength={8} required /></Field>
        <Field label="Confirm password"><Input type="password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} required /></Field>
        {error && <div className="rounded-xl bg-warn-soft px-3 py-2 text-[12px] font-medium text-warn">{error}</div>}
        <Button type="submit" className="w-full" size="lg" loading={loading}>Update password</Button>
      </form>
    </AuthShell>
  );
}

export function VerifyEmailView({ email }: { email: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [state, setState] = useState<"waiting" | "verifying" | "done">(sp.get("token") ? "verifying" : "waiting");
  useEffect(() => {
    if (state !== "verifying") return;
    post("verify", {}).then((r) => {
      setState("done");
      setTimeout(() => {
        router.push(r.next ?? "/onboarding");
        router.refresh();
      }, 1400);
    });
  }, [state, router]);
  return (
    <AuthShell title={state === "done" ? "Email verified" : state === "verifying" ? "Verifying…" : "Check your inbox"} subtitle={state === "waiting" ? `We sent a verification link to ${email}.` : undefined}>
      <div className="grid place-items-center py-4 text-center">
        <motion.span key={state} className="grid h-16 w-16 place-items-center pill bg-ink text-accent" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
          {state === "done" ? <Check className="h-7 w-7" strokeWidth={2.5} /> : state === "verifying" ? <motion.span className="h-6 w-6 pill border-2 border-accent border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} /> : <Mail className="h-6 w-6" />}
        </motion.span>
        {state === "waiting" && <><p className="mt-4 text-[13px] text-muted">Click the link in the email to continue. In this environment, you can simulate the click:</p><Button className="mt-4" onClick={() => setState("verifying")}>I clicked the link</Button><Link href="/onboarding" className="mt-3 text-[12px] font-semibold text-muted hover:text-ink">Skip for now</Link></>}
        {state === "done" && <p className="mt-4 text-[13px] text-muted">Taking you to onboarding…</p>}
      </div>
    </AuthShell>
  );
}
