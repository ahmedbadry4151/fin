import { and, asc, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { applyPlanningStyle, DEFAULT_ASSUMPTIONS } from "../lib/economy";
import { computeMetrics, type TwinInput, type TwinMetrics } from "../lib/finance";
import { toISODate } from "../lib/format";
import { answerQuestion } from "../lib/intelligence";
import { runSimulation, type EconAssumptions, type ScenarioParams, type SimResults } from "../lib/simulation";
import { buildSimTwin } from "../lib/twin";
import type { DbClient } from "./client";
import {
  accounts,
  aiDailyUsage,
  aiMessages,
  assets,
  assumptions,
  categories,
  financialProfiles,
  goals,
  liabilities,
  notifications,
  passwordResetTokens,
  reports,
  scenarios,
  sessions,
  simulations,
  transactions,
  users,
  userSettings,
} from "./schema";
import { hashPassword } from "./seed";

export class DomainError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function assertFiniteNumber(val: unknown, name: string): number {
  const n = Number(val);
  if (!Number.isFinite(n)) throw new DomainError(400, `${name} must be a finite number.`);
  return n;
}

/* ---------------- Auth, Sessions & Password Reset ---------------- */

export async function signupUser(
  db: DbClient,
  input: { name: string; email: string; password: string; role?: "user" | "admin" },
) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email || input.password.length < 8) {
    throw new DomainError(400, "Name, valid email, and password of at least 8 characters are required.");
  }

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hashPassword(input.password),
        role: input.role ?? "user",
      })
      .returning();

    await tx.insert(userSettings).values({ userId: user.id });
    await tx.insert(financialProfiles).values({ userId: user.id });
    await tx.insert(assumptions).values({ userId: user.id, ...DEFAULT_ASSUMPTIONS, preset: "normal" });
    return user;
  });
}

export async function loginUser(db: DbClient, input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new DomainError(401, "Invalid email or password.");
  }
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: randomUUID(),
    userId: user.id,
    tokenHash: sha256(rawToken),
    expiresAt,
  });
  return { user, sessionToken: rawToken, expiresAt };
}

export async function requireSessionUser(db: DbClient, sessionToken: string | null | undefined) {
  if (!sessionToken) throw new DomainError(401, "Authentication required.");
  const hash = sha256(sessionToken);
  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, hash));

  if (!rows.length || rows[0].session.expiresAt <= new Date()) {
    throw new DomainError(401, "Session is invalid or expired.");
  }
  return rows[0].user;
}

export async function logoutSession(db: DbClient, sessionToken: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(sessionToken)));
}

export async function createPasswordResetToken(
  db: DbClient,
  email: string,
  ttlMs = 60 * 60 * 1000,
) {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  if (!user) throw new DomainError(404, "No account found for that email.");
  const rawToken = randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: sha256(rawToken),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return rawToken;
}

export async function consumePasswordResetToken(db: DbClient, rawToken: string, newPassword: string) {
  if (newPassword.length < 8) {
    throw new DomainError(400, "Password must be at least 8 characters.");
  }
  const hash = sha256(rawToken);
  return db.transaction(async (tx) => {
    const [tok] = await tx
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hash));

    if (!tok) throw new DomainError(400, "Invalid password reset token.");
    if (tok.usedAt !== null) throw new DomainError(400, "Password reset token has already been used.");
    if (tok.expiresAt <= new Date()) throw new DomainError(400, "Password reset token has expired.");

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tok.id));

    await tx
      .update(users)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(users.id, tok.userId));

    // Invalidate active sessions after password reset
    await tx.delete(sessions).where(eq(sessions.userId, tok.userId));
    return { ok: true, userId: tok.userId };
  });
}

/* ---------------- User Settings & Reminders ---------------- */

export async function getUserSettings(db: DbClient, userId: number) {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return row ?? null;
}

export async function updateUserSettings(
  db: DbClient,
  userId: number,
  patch: Partial<{
    notifFinancial: boolean;
    notifGoals: boolean;
    notifSimulation: boolean;
    notifSystem: boolean;
    reminderEnabled: boolean;
    reminderTime: string;
    reminderTimezone: string;
    defaultPaths: number;
    aiTransparency: boolean;
  }>,
) {
  const [updated] = await db
    .update(userSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId))
    .returning();
  return updated;
}

/* ---------------- Twin & Onboarding ---------------- */

export async function getDbTwin(db: DbClient, userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new DomainError(404, "User not found.");

  const [[profile], [assumptionRow], [settingsRow], accountRows, assetRows, liabilityRows, goalRows] =
    await Promise.all([
      db.select().from(financialProfiles).where(eq(financialProfiles.userId, userId)),
      db.select().from(assumptions).where(eq(assumptions.userId, userId)),
      db.select().from(userSettings).where(eq(userSettings.userId, userId)),
      db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.id)),
      db.select().from(assets).where(eq(assets.userId, userId)).orderBy(asc(assets.id)),
      db.select().from(liabilities).where(eq(liabilities.userId, userId)).orderBy(asc(liabilities.id)),
      db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.id)),
    ]);

  const prof = profile ?? {
    monthlyIncome: 0,
    additionalIncome: 0,
    incomeFrequency: "monthly",
    expenses: {},
    cashSavings: 0,
    emergencySavings: 0,
    monthlySavings: 0,
    otherLiquid: 0,
  };

  const baseEcon: EconAssumptions = assumptionRow
    ? {
        inflation: assumptionRow.inflation,
        incomeGrowth: assumptionRow.incomeGrowth,
        expenseGrowth: assumptionRow.expenseGrowth,
        investmentReturn: assumptionRow.investmentReturn,
        volatility: assumptionRow.volatility,
        horizonYears: assumptionRow.horizonYears,
      }
    : DEFAULT_ASSUMPTIONS;

  const input: TwinInput = {
    monthlyIncome: prof.monthlyIncome,
    additionalIncome: prof.additionalIncome,
    expenses: prof.expenses ?? {},
    cashSavings: prof.cashSavings,
    emergencySavings: prof.emergencySavings,
    monthlySavings: prof.monthlySavings,
    otherLiquid: prof.otherLiquid,
    accounts: accountRows.map((a) => ({ type: a.type, balance: a.balance })),
    assets: assetRows.map((a) => ({ type: a.type, value: a.value })),
    liabilities: liabilityRows.map((l) => ({
      balance: l.balance,
      monthlyPayment: l.monthlyPayment,
      interestRate: l.interestRate,
      remainingMonths: l.remainingMonths,
    })),
  };

  const metrics: TwinMetrics = computeMetrics(input);
  return {
    user,
    settings: settingsRow ?? null,
    profile,
    assumptions: assumptionRow ?? null,
    econ: applyPlanningStyle(baseEcon, user.planningStyle),
    accounts: accountRows,
    assets: assetRows,
    liabilities: liabilityRows,
    goals: goalRows,
    input,
    metrics,
  };
}

export async function completeOnboarding(
  db: DbClient,
  userId: number,
  payload: {
    profile: { name: string; age?: number; country: string; city: string; currency: string; employment: string; planningStyle: string };
    income: { monthlyIncome: number; additionalIncome: number; incomeFrequency: string; incomeGrowth: number };
    expenses: Record<string, number>;
    savings: { cashSavings: number; emergencySavings: number; monthlySavings: number; otherLiquid: number };
    assets: Array<{ name: string; type: string; value: number }>;
    liabilities: Array<{ name: string; type: string; balance: number; monthlyPayment: number; interestRate: number; remainingMonths: number }>;
    goals: Array<{ name: string; type: string; targetAmount: number; currentAmount: number; targetDate: string; monthlyContribution: number }>;
    assumptions: { inflation: number; incomeGrowth: number; expenseGrowth: number; investmentReturn: number; volatility: number; horizonYears: number };
  },
) {
  const horizon = Math.round(assertFiniteNumber(payload.assumptions.horizonYears, "horizonYears"));
  if (horizon < 1 || horizon > 30) {
    throw new DomainError(400, "horizonYears must be between 1 and 30.");
  }

  return db.transaction(async (tx) => {
    const currency = payload.profile.currency || "EGP";
    await tx
      .update(users)
      .set({
        name: payload.profile.name,
        age: payload.profile.age ?? null,
        country: payload.profile.country,
        city: payload.profile.city,
        currency,
        employment: payload.profile.employment,
        planningStyle: payload.profile.planningStyle,
        onboarded: true,
      })
      .where(eq(users.id, userId));

    await tx
      .update(financialProfiles)
      .set({
        monthlyIncome: assertFiniteNumber(payload.income.monthlyIncome, "monthlyIncome"),
        additionalIncome: assertFiniteNumber(payload.income.additionalIncome, "additionalIncome"),
        incomeFrequency: payload.income.incomeFrequency,
        expenses: payload.expenses,
        cashSavings: assertFiniteNumber(payload.savings.cashSavings, "cashSavings"),
        emergencySavings: assertFiniteNumber(payload.savings.emergencySavings, "emergencySavings"),
        monthlySavings: assertFiniteNumber(payload.savings.monthlySavings, "monthlySavings"),
        otherLiquid: assertFiniteNumber(payload.savings.otherLiquid, "otherLiquid"),
        updatedAt: new Date(),
      })
      .where(eq(financialProfiles.userId, userId));

    await tx
      .update(assumptions)
      .set({
        inflation: assertFiniteNumber(payload.assumptions.inflation, "inflation"),
        incomeGrowth: assertFiniteNumber(payload.income.incomeGrowth ?? payload.assumptions.incomeGrowth, "incomeGrowth"),
        expenseGrowth: assertFiniteNumber(payload.assumptions.expenseGrowth, "expenseGrowth"),
        investmentReturn: assertFiniteNumber(payload.assumptions.investmentReturn, "investmentReturn"),
        volatility: assertFiniteNumber(payload.assumptions.volatility, "volatility"),
        horizonYears: horizon,
        preset: "custom",
        updatedAt: new Date(),
      })
      .where(eq(assumptions.userId, userId));

    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(assets).where(eq(assets.userId, userId));
    await tx.delete(liabilities).where(eq(liabilities.userId, userId));
    await tx.delete(goals).where(eq(goals.userId, userId));

    const liquidTypes = new Set(["cash", "bank", "investment"]);
    const accInserts = [
      ...(payload.savings.cashSavings > 0 ? [{ name: "Main account", type: "bank", balance: payload.savings.cashSavings }] : []),
      ...(payload.savings.emergencySavings > 0 ? [{ name: "Emergency savings", type: "savings", balance: payload.savings.emergencySavings }] : []),
      ...(payload.savings.otherLiquid > 0 ? [{ name: "Other liquid assets", type: "savings", balance: payload.savings.otherLiquid }] : []),
      ...payload.assets
        .filter((a) => liquidTypes.has(a.type))
        .map((a) => ({ name: a.name, type: a.type, balance: a.value })),
    ];
    if (accInserts.length) {
      await tx.insert(accounts).values(accInserts.map((a) => ({ userId, ...a, currency })));
    }

    const nonLiquid = payload.assets.filter((a) => !liquidTypes.has(a.type));
    if (nonLiquid.length) {
      await tx.insert(assets).values(nonLiquid.map((a) => ({ userId, ...a })));
    }
    if (payload.liabilities.length) {
      await tx.insert(liabilities).values(payload.liabilities.map((l) => ({ userId, ...l })));
    }
    if (payload.goals.length) {
      await tx.insert(goals).values(payload.goals.map((g) => ({ userId, ...g, status: "active" })));
    }

    await tx.insert(notifications).values({
      userId,
      kind: "system",
      title: "Your Financial Twin is ready",
      body: "Explore your overview, then test a decision with a scenario.",
      href: "/overview",
    });

    return { ok: true };
  });
}

/* ---------------- Categories & Transactions ---------------- */

export async function listCategoriesForUser(db: DbClient, userId: number) {
  return db
    .select()
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)))
    .orderBy(asc(categories.id));
}

export async function createCustomCategory(
  db: DbClient,
  userId: number,
  input: { key: string; nameEn: string; nameAr: string; type: "expense" | "income" | "transfer"; isEssential?: boolean; icon?: string; color?: string },
) {
  const [row] = await db
    .insert(categories)
    .values({
      userId,
      key: input.key.trim().toLowerCase(),
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      type: input.type,
      isEssential: input.isEssential ?? false,
      icon: input.icon ?? "Tag",
      color: input.color ?? "#64748b",
    })
    .returning();
  return row;
}

export async function createTransaction(
  db: DbClient,
  userId: number,
  input: {
    description: string;
    categoryKey: string;
    type: "income" | "expense" | "transfer";
    amount: number;
    date: string;
    accountId?: number | null;
  },
) {
  const amount = assertFiniteNumber(input.amount, "amount");
  if (amount <= 0) throw new DomainError(400, "Transaction amount must be positive.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new DomainError(400, "Invalid date format.");

  return db.transaction(async (tx) => {
    const catRows = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.key, input.categoryKey), or(eq(categories.userId, userId), isNull(categories.userId))));
    const cat = catRows.find((c) => c.userId === userId) ?? catRows[0];
    if (!cat) throw new DomainError(400, `Unknown category: ${input.categoryKey}`);

    const [created] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId: input.accountId ?? null,
        categoryId: cat.id,
        description: input.description.trim(),
        type: input.type,
        amount,
        date: input.date,
      })
      .returning();

    if (created.accountId && (created.type === "income" || created.type === "expense")) {
      const delta = created.type === "income" ? created.amount : -created.amount;
      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${delta}`, updatedAt: new Date() })
        .where(and(eq(accounts.id, created.accountId), eq(accounts.userId, userId)));
    }
    return created;
  });
}

export async function deleteTransaction(db: DbClient, userId: number, txId: number) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)));
    if (!existing) throw new DomainError(404, "Transaction not found.");

    if (existing.accountId && (existing.type === "income" || existing.type === "expense")) {
      const reversal = existing.type === "income" ? -existing.amount : existing.amount;
      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${reversal}`, updatedAt: new Date() })
        .where(and(eq(accounts.id, existing.accountId), eq(accounts.userId, userId)));
    }
    await tx.delete(transactions).where(and(eq(transactions.id, txId), eq(transactions.userId, userId)));
    return { deleted: true };
  });
}

/* ---------------- Goals & Single-Send 80% Alert ---------------- */

export async function updateGoalProgress(
  db: DbClient,
  userId: number,
  goalId: number,
  currentAmount: number,
) {
  const amount = assertFiniteNumber(currentAmount, "currentAmount");
  if (amount < 0) throw new DomainError(400, "currentAmount cannot be negative.");

  return db.transaction(async (tx) => {
    const [goal] = await tx
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
    if (!goal) throw new DomainError(404, "Goal not found.");

    const status = amount >= goal.targetAmount ? "completed" : "active";
    const [updated] = await tx
      .update(goals)
      .set({ currentAmount: amount, status })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .returning();

    const pct = goal.targetAmount > 0 ? amount / goal.targetAmount : 0;
    let alertCreated = false;
    if (pct >= 0.8) {
      const inserted = await tx
        .insert(notifications)
        .values({
          userId,
          goalId: goal.id,
          dedupeKey: `goal:${goal.id}:80pct`,
          kind: "goal",
          title: `${goal.name} at ${Math.min(100, Math.round(pct * 100))}%`,
          body: `You reached ${Math.round(pct * 100)}% of your target (${goal.targetAmount}).`,
          href: `/goals/${goal.id}`,
        })
        .onConflictDoNothing()
        .returning();
      alertCreated = inserted.length > 0;
    }

    return { goal: updated, alertCreated };
  });
}

/* ---------------- Scenarios & Simulations ---------------- */

export async function duplicateScenario(db: DbClient, userId: number, scenarioId: number) {
  const [src] = await db
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.userId, userId)));
  if (!src) throw new DomainError(404, "Scenario not found.");
  const [copy] = await db
    .insert(scenarios)
    .values({
      userId,
      name: `${src.name} (copy)`,
      category: src.category,
      templateKey: src.templateKey,
      description: src.description,
      params: src.params,
      lastRunAt: null,
    })
    .returning();
  return copy;
}

export async function runAndPersistSimulation(
  db: DbClient,
  userId: number,
  opts: {
    scenarioId?: number | null;
    goalId?: number | null;
    paths?: number;
    horizonYears?: number;
    name?: string;
    seed?: number;
  } = {},
) {
  const twin = await getDbTwin(db, userId);

  let horizonYears = twin.econ.horizonYears;
  if (opts.horizonYears !== undefined) {
    horizonYears = Math.round(assertFiniteNumber(opts.horizonYears, "horizonYears"));
    if (horizonYears < 1 || horizonYears > 30) {
      throw new DomainError(400, "horizonYears must be between 1 and 30.");
    }
  }

  let paths = twin.settings?.defaultPaths ?? 600;
  if (opts.paths !== undefined) {
    paths = Math.round(assertFiniteNumber(opts.paths, "paths"));
  }
  paths = Math.min(5000, Math.max(100, paths));

  let scRow: typeof scenarios.$inferSelect | null = null;
  if (opts.scenarioId) {
    const [found] = await db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.id, opts.scenarioId), eq(scenarios.userId, userId)));
    if (!found) throw new DomainError(404, "Scenario not found.");
    scRow = found;
  }

  const goal = opts.goalId
    ? twin.goals.find((g) => g.id === opts.goalId) ?? null
    : twin.goals[0] ?? null;
  if (opts.goalId && !goal) throw new DomainError(404, "Goal not found.");

  const simTwin = buildSimTwin(
    twin.input,
    goal ? { ...goal, targetDate: String(goal.targetDate) } : null,
  );
  const econ: EconAssumptions = { ...twin.econ, horizonYears };
  const params: ScenarioParams = (scRow?.params ?? {}) as ScenarioParams;
  const seed = opts.seed ?? 1337;
  const results = runSimulation(simTwin, econ, params, {
    paths,
    seed,
    sensitivity: true,
    baseline: true,
  });

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(simulations)
      .values({
        userId,
        scenarioId: scRow?.id ?? null,
        goalId: goal?.id ?? null,
        name: opts.name ?? scRow?.name ?? "Current Plan",
        horizonYears,
        paths,
        status: "completed",
        assumptions: econ as unknown as Record<string, number>,
        results: results as unknown as Record<string, unknown>,
      })
      .returning();

    if (scRow) {
      await tx.update(scenarios).set({ lastRunAt: new Date() }).where(eq(scenarios.id, scRow.id));
    }

    await tx.insert(notifications).values({
      userId,
      kind: "simulation",
      title: "Simulation finished",
      body: `“${row.name}” completed with ${paths} paths over ${horizonYears} years.`,
      href: `/simulations/${row.id}`,
    });

    return { simulation: row, results };
  });
}

/* ---------------- AI Assistant & Daily Quota ---------------- */

export async function askAiWithQuota(
  db: DbClient,
  userId: number,
  question: string,
  usageDate = toISODate(new Date()),
  dailyLimit = 20,
) {
  const q = question.trim().slice(0, 500);
  if (!q) throw new DomainError(400, "Ask a question first.");

  const twin = await getDbTwin(db, userId);
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = toISODate(since);

  const [txRows, scenarioRows, latestSims] = await Promise.all([
    db
      .select({
        description: transactions.description,
        category: categories.key,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), gte(transactions.date, sinceStr)))
      .orderBy(desc(transactions.date))
      .limit(1000),
    db.select().from(scenarios).where(eq(scenarios.userId, userId)),
    db.select().from(simulations).where(eq(simulations.userId, userId)).orderBy(desc(simulations.createdAt)).limit(1),
  ]);

  const latest = latestSims[0] ?? null;
  const latestResults = (latest?.results as unknown as SimResults | null) ?? null;

  return db.transaction(async (tx) => {
    await tx
      .insert(aiDailyUsage)
      .values({ userId, usageDate, messageCount: 0, dailyLimit })
      .onConflictDoNothing();

    const bumped = await tx
      .update(aiDailyUsage)
      .set({ messageCount: sql`${aiDailyUsage.messageCount} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(aiDailyUsage.userId, userId),
          eq(aiDailyUsage.usageDate, usageDate),
          sql`${aiDailyUsage.messageCount} < ${aiDailyUsage.dailyLimit}`,
        ),
      )
      .returning();

    if (!bumped.length) {
      throw new DomainError(429, "Daily AI message limit reached. Try again tomorrow.");
    }

    const answer = answerQuestion(q, {
      currency: twin.user.currency,
      input: twin.input,
      metrics: twin.metrics,
      econ: twin.econ,
      goals: twin.goals.map((g) => ({ ...g, targetDate: String(g.targetDate) })),
      recentTransactions: txRows.map((t) => ({ ...t, date: String(t.date) })),
      scenarios: scenarioRows.map((sc) => ({ id: sc.id, name: sc.name, params: sc.params as ScenarioParams })),
      latestSimulation: latest && latestResults ? { id: latest.id, name: latest.name, results: latestResults } : null,
    });

    await tx.insert(aiMessages).values([
      { userId, role: "user", content: q, meta: null },
      { userId, role: "assistant", content: answer.text, meta: answer as unknown as Record<string, unknown> },
    ]);

    return {
      answer,
      usage: {
        date: usageDate,
        count: bumped[0].messageCount,
        limit: bumped[0].dailyLimit,
      },
    };
  });
}

/* ---------------- Reports, Safe CSV Export & Search ---------------- */

function csvCell(raw: unknown): string {
  let s = String(raw ?? "");
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export async function createReport(
  db: DbClient,
  userId: number,
  input: { name: string; type: string; config?: Record<string, unknown> },
) {
  const [row] = await db
    .insert(reports)
    .values({ userId, name: input.name, type: input.type, config: input.config ?? {} })
    .returning();
  return row;
}

export async function exportSafeCsvReport(db: DbClient, userId: number): Promise<string> {
  const twin = await getDbTwin(db, userId);
  const txRows = await db
    .select({
      date: transactions.date,
      description: transactions.description,
      category: categories.key,
      type: transactions.type,
      amount: transactions.amount,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(2000);

  const m = twin.metrics;
  const lines = [
    "section,key,value",
    `snapshot,net_worth,${m.netWorth}`,
    `snapshot,monthly_income,${m.income}`,
    `snapshot,monthly_expenses,${m.expenses}`,
    `snapshot,monthly_savings,${m.savings}`,
    `snapshot,emergency_coverage_months,${m.emergencyCoverage.toFixed(2)}`,
    ...twin.goals.map((g) => `goal,${csvCell(g.name)},${g.currentAmount}/${g.targetAmount}`),
    ...Object.entries(twin.econ).map(([k, v]) => `assumption,${csvCell(k)},${v}`),
    "",
    "date,description,category,type,amount",
    ...txRows.map((t) =>
      [csvCell(t.date), csvCell(t.description), csvCell(t.category), csvCell(t.type), t.amount].join(","),
    ),
  ];
  return lines.join("\n");
}
