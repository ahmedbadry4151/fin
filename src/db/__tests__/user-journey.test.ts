import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq, isNull, sql } from "drizzle-orm";
import * as schema from "../schema";
import type { DbClient } from "../client";
import { seedDatabase } from "../seed";
import {
  askAiWithQuota,
  completeOnboarding,
  consumePasswordResetToken,
  createCustomCategory,
  createPasswordResetToken,
  createReport,
  createTransaction,
  deleteTransaction,
  DomainError,
  duplicateScenario,
  exportSafeCsvReport,
  getDbTwin,
  getUserSettings,
  listCategoriesForUser,
  loginUser,
  logoutSession,
  requireSessionUser,
  runAndPersistSimulation,
  signupUser,
  updateGoalProgress,
  updateUserSettings,
} from "../services";

let pg: PGlite;
let db: DbClient;

async function expectPgError(fn: () => Promise<unknown>, expectedCode?: string) {
  let caught: unknown = null;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, "Expected PostgreSQL error to be thrown");
  const code =
    (caught as { code?: string; cause?: { code?: string } }).code ??
    (caught as { cause?: { code?: string } }).cause?.code;
  if (expectedCode) {
    assert.equal(code, expectedCode, `Expected SQLSTATE ${expectedCode}, got ${code}: ${String(caught)}`);
  }
}

describe("FinTwin 18-Entity PostgreSQL Database — Full User Journey", () => {
  before(async () => {
    pg = new PGlite();
    const pgliteDb = drizzle(pg, { schema });
    await migrate(pgliteDb, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    db = pgliteDb as unknown as DbClient;
  });

  after(async () => {
    await pg.close();
  });

  it("1. Migrates all 18 ERD tables and idempotently seeds system categories + Nour Adel demo twin", async () => {
    const res = await pg.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    const tableNames = res.rows.map((r) => r.table_name).filter((n) => n !== "__drizzle_migrations");
    assert.deepEqual(tableNames, [
      "accounts",
      "ai_daily_usage",
      "ai_messages",
      "assets",
      "assumptions",
      "categories",
      "financial_profiles",
      "goals",
      "liabilities",
      "notifications",
      "password_reset_tokens",
      "reports",
      "scenarios",
      "sessions",
      "simulations",
      "transactions",
      "user_settings",
      "users",
    ]);

    const first = await seedDatabase(db);
    assert.equal(first.seeded, true);
    assert.equal(first.categoryCount, 19);

    // Running seed a second time must be idempotent
    const second = await seedDatabase(db);
    assert.equal(second.seeded, false);
    assert.equal(second.demoUserId, first.demoUserId);

    const demoTwin = await getDbTwin(db, first.demoUserId);
    assert.equal(demoTwin.user.name, "Nour Adel");
    assert.equal(demoTwin.user.role, "user");
    assert.equal(demoTwin.metrics.income, 32000);
    assert.equal(demoTwin.metrics.expenses, 21400);
    assert.equal(demoTwin.metrics.savings, 10600);
    assert.equal(demoTwin.accounts.length, 4);
    assert.equal(demoTwin.goals.length, 3);
  });

  it("2. Simulates signup, role validation, login, sessions, and user settings + reminder schedule", async () => {
    const user = await signupUser(db, {
      name: "Omar Hassan",
      email: "Omar@Example.com",
      password: "Password123!",
    });
    assert.equal(user.email, "omar@example.com");
    assert.equal(user.role, "user");

    const admin = await signupUser(db, {
      name: "Admin User",
      email: "admin@example.com",
      password: "AdminPass123!",
      role: "admin",
    });
    assert.equal(admin.role, "admin");

    // Duplicate email rejected
    await assert.rejects(
      () => signupUser(db, { name: "Dup", email: "omar@example.com", password: "Password123!" }),
    );

    // Invalid role blocked by PostgreSQL CHECK constraint
    await expectPgError(
      () =>
        db.insert(schema.users).values({
          name: "Bad",
          email: "badrole@example.com",
          passwordHash: "x",
          role: "superuser",
        }),
      "23514",
    );

    // 1:1 constraint on user_settings prevents duplicate settings row
    await expectPgError(
      () => db.insert(schema.userSettings).values({ userId: user.id }),
      "23505",
    );

    // Settings validation & reminder update
    const updatedSettings = await updateUserSettings(db, user.id, {
      reminderEnabled: true,
      reminderTime: "09:30",
      reminderTimezone: "Africa/Cairo",
      notifGoals: false,
      defaultPaths: 800,
    });
    assert.equal(updatedSettings.reminderEnabled, true);
    assert.equal(updatedSettings.reminderTime, "09:30");
    assert.equal(updatedSettings.notifGoals, false);
    assert.equal(updatedSettings.defaultPaths, 800);

    // Invalid reminder time blocked by regex CHECK
    await expectPgError(
      () => db.update(schema.userSettings).set({ reminderTime: "25:99" }).where(eq(schema.userSettings.userId, user.id)),
      "23514",
    );

    // Login & session verification
    await assert.rejects(
      () => loginUser(db, { email: "omar@example.com", password: "WrongPassword!" }),
      (e: DomainError) => e.status === 401,
    );

    const { sessionToken } = await loginUser(db, {
      email: "omar@example.com",
      password: "Password123!",
    });
    const sessionUser = await requireSessionUser(db, sessionToken);
    assert.equal(sessionUser.id, user.id);

    await logoutSession(db, sessionToken);
    await assert.rejects(
      () => requireSessionUser(db, sessionToken),
      (e: DomainError) => e.status === 401,
    );
  });

  it("3. Enforces password reset token expiry, single-use, and session invalidation", async () => {
    const { sessionToken } = await loginUser(db, {
      email: "omar@example.com",
      password: "Password123!",
    });

    // Expired token rejected
    const expiredToken = await createPasswordResetToken(db, "omar@example.com", -5_000);
    await assert.rejects(
      () => consumePasswordResetToken(db, expiredToken, "NewPass123!"),
      (e: DomainError) => e.status === 400 && /expired/i.test(e.message),
    );

    // Valid token works once, invalidates active sessions, and fails on replay
    const validToken = await createPasswordResetToken(db, "omar@example.com", 60_000);
    await consumePasswordResetToken(db, validToken, "NewPass456!");

    // Old session was revoked
    await assert.rejects(
      () => requireSessionUser(db, sessionToken),
      (e: DomainError) => e.status === 401,
    );

    // Replay rejected
    await assert.rejects(
      () => consumePasswordResetToken(db, validToken, "Another789!"),
      (e: DomainError) => e.status === 400 && /already been used/i.test(e.message),
    );

    // Can log in with new password
    const login2 = await loginUser(db, { email: "omar@example.com", password: "NewPass456!" });
    assert.equal(login2.user.email, "omar@example.com");
  });

  it("4. Completes onboarding, enforces horizonYears bounds (F-02), and computes Twin metrics", async () => {
    const [omar] = await db.select().from(schema.users).where(eq(schema.users.email, "omar@example.com"));

    // Unbounded / invalid horizonYears rejected by domain validation
    await assert.rejects(
      () =>
        completeOnboarding(db, omar.id, {
          profile: { name: "Omar Hassan", age: 29, country: "Egypt", city: "Giza", currency: "EGP", employment: "employed", planningStyle: "balanced" },
          income: { monthlyIncome: 25000, additionalIncome: 2000, incomeFrequency: "monthly", incomeGrowth: 0.08 },
          expenses: { housing: 6000, food: 4000, transportation: 1500, utilities: 900, entertainment: 1000 },
          savings: { cashSavings: 30000, emergencySavings: 50000, monthlySavings: 8000, otherLiquid: 0 },
          assets: [{ name: "Gold bar", type: "other", value: 40000 }],
          liabilities: [{ name: "Laptop loan", type: "personal_loan", balance: 12000, monthlyPayment: 1000, interestRate: 0.1, remainingMonths: 12 }],
          goals: [{ name: "Marriage Fund", type: "marriage", targetAmount: 200000, currentAmount: 40000, targetDate: "2028-06-01", monthlyContribution: 5000 }],
          assumptions: { inflation: 0.14, incomeGrowth: 0.08, expenseGrowth: 0.12, investmentReturn: 0.12, volatility: 0.15, horizonYears: 1e7 },
        }),
      (e: DomainError) => e.status === 400,
    );

    // Also verify Postgres CHECK blocks out-of-range horizonYears directly
    await expectPgError(
      () => db.update(schema.assumptions).set({ horizonYears: 50 }).where(eq(schema.assumptions.userId, omar.id)),
      "23514",
    );

    // Valid onboarding
    await completeOnboarding(db, omar.id, {
      profile: { name: "Omar Hassan", age: 29, country: "Egypt", city: "Giza", currency: "EGP", employment: "employed", planningStyle: "balanced" },
      income: { monthlyIncome: 25000, additionalIncome: 2000, incomeFrequency: "monthly", incomeGrowth: 0.08 },
      expenses: { housing: 6000, food: 4000, transportation: 1500, utilities: 900, entertainment: 1000 },
      savings: { cashSavings: 30000, emergencySavings: 50000, monthlySavings: 8000, otherLiquid: 0 },
      assets: [{ name: "Gold bar", type: "other", value: 40000 }],
      liabilities: [{ name: "Laptop loan", type: "personal_loan", balance: 12000, monthlyPayment: 1000, interestRate: 0.1, remainingMonths: 12 }],
      goals: [{ name: "Marriage Fund", type: "marriage", targetAmount: 200000, currentAmount: 40000, targetDate: "2028-06-01", monthlyContribution: 5000 }],
      assumptions: { inflation: 0.14, incomeGrowth: 0.08, expenseGrowth: 0.12, investmentReturn: 0.12, volatility: 0.15, horizonYears: 5 },
    });

    const twin = await getDbTwin(db, omar.id);
    assert.equal(twin.user.onboarded, true);
    assert.equal(twin.metrics.income, 27000);
    assert.equal(twin.metrics.expenses, 13400);
    assert.equal(twin.metrics.cash, 80000); // 30k + 50k liquid accounts
    assert.equal(twin.metrics.totalDebt, 12000);
    assert.equal(twin.metrics.netWorth, 80000 + 40000 - 12000);
  });

  it("5. Tests custom categories, atomic transaction balances, nullable accountId, and cross-tenant Composite FK", async () => {
    const [omar] = await db.select().from(schema.users).where(eq(schema.users.email, "omar@example.com"));
    const [admin] = await db.select().from(schema.users).where(eq(schema.users.email, "admin@example.com"));

    // Omar sees 19 system categories, creates a custom one
    const baseCats = await listCategoriesForUser(db, omar.id);
    assert.equal(baseCats.length, 19);

    const customCat = await createCustomCategory(db, omar.id, {
      key: "coffee_shops",
      nameEn: "Coffee Shops",
      nameAr: "الكافيهات",
      type: "expense",
      isEssential: false,
      icon: "Coffee",
      color: "#78350f",
    });

    // Duplicate custom category key for same user fails
    await expectPgError(
      () =>
        createCustomCategory(db, omar.id, {
          key: "coffee_shops",
          nameEn: "Dup",
          nameAr: "مكرر",
          type: "expense",
        }),
      "23505",
    );

    const [omarBank] = await db
      .select()
      .from(schema.accounts)
      .where(and(eq(schema.accounts.userId, omar.id), eq(schema.accounts.name, "Main account")));
    const startBalance = omarBank.balance;

    // Create expense -> balance decreases atomically
    const tx1 = await createTransaction(db, omar.id, {
      description: "Morning espresso",
      categoryKey: "coffee_shops",
      type: "expense",
      amount: 250,
      date: "2026-11-27",
      accountId: omarBank.id,
    });
    const [afterSpend] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, omarBank.id));
    assert.equal(afterSpend.balance, startBalance - 250);

    // Delete transaction -> balance restores atomically
    await deleteTransaction(db, omar.id, tx1.id);
    const [afterDelete] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, omarBank.id));
    assert.equal(afterDelete.balance, startBalance);

    // Create transaction WITHOUT an account (accountId = null) -> succeeds
    const txNoAcc = await createTransaction(db, omar.id, {
      description: "Cash taxi",
      categoryKey: "transportation",
      type: "expense",
      amount: 120,
      date: "2026-11-27",
      accountId: null,
    });
    assert.equal(txNoAcc.accountId, null);

    // Cross-tenant Composite FK: Admin CANNOT attach a transaction to Omar's account!
    const foodCat = baseCats.find((c) => c.key === "food")!;
    await expectPgError(
      () =>
        db.insert(schema.transactions).values({
          userId: admin.id,
          accountId: omarBank.id,
          categoryId: foodCat.id,
          description: "Cross-tenant hijack attempt",
          type: "expense",
          amount: 500,
          date: "2026-11-27",
        }),
      "23503",
    );

    // Cross-tenant Trigger: Admin CANNOT use Omar's custom category!
    await expectPgError(
      () =>
        db.insert(schema.transactions).values({
          userId: admin.id,
          accountId: null,
          categoryId: customCat.id,
          description: "Hijack custom category",
          type: "expense",
          amount: 100,
          date: "2026-11-27",
        }),
      "23503",
    );

    // Negative / zero amount blocked by CHECK
    await expectPgError(
      () =>
        db.insert(schema.transactions).values({
          userId: omar.id,
          accountId: null,
          categoryId: foodCat.id,
          description: "Zero",
          type: "expense",
          amount: 0,
          date: "2026-11-27",
        }),
      "23514",
    );

    // Deleting an account sets transactions.account_id = NULL while preserving transaction and user_id
    const [tempAcc] = await db
      .insert(schema.accounts)
      .values({ userId: omar.id, name: "Temp Wallet", type: "wallet", balance: 1000, currency: "EGP" })
      .returning();
    const txTemp = await createTransaction(db, omar.id, {
      description: "Wallet top-up spend",
      categoryKey: "food",
      type: "expense",
      amount: 100,
      date: "2026-11-27",
      accountId: tempAcc.id,
    });
    await db.delete(schema.accounts).where(eq(schema.accounts.id, tempAcc.id));
    const [orphanedTx] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, txTemp.id));
    assert.equal(orphanedTx.accountId, null);
    assert.equal(orphanedTx.userId, omar.id);
  });

  it("6. Fires 80% goal notification strictly ONCE even across repeated threshold crossings", async () => {
    const [omar] = await db.select().from(schema.users).where(eq(schema.users.email, "omar@example.com"));
    const [goal] = await db.select().from(schema.goals).where(eq(schema.goals.userId, omar.id));

    // 75% -> no alert
    const r75 = await updateGoalProgress(db, omar.id, goal.id, 150000);
    assert.equal(r75.alertCreated, false);

    // 82% -> 80% alert created!
    const r82 = await updateGoalProgress(db, omar.id, goal.id, 164000);
    assert.equal(r82.alertCreated, true);

    // Drop to 78% then re-cross to 85% -> MUST NOT duplicate!
    await updateGoalProgress(db, omar.id, goal.id, 156000);
    const r85 = await updateGoalProgress(db, omar.id, goal.id, 170000);
    assert.equal(r85.alertCreated, false);

    const notifs = await db
      .select()
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, omar.id), eq(schema.notifications.dedupeKey, `goal:${goal.id}:80pct`)));
    assert.equal(notifs.length, 1);

    // Reaching 100% marks goal completed
    const r100 = await updateGoalProgress(db, omar.id, goal.id, 200000);
    assert.equal(r100.goal.status, "completed");
  });

  it("7. Runs Monte Carlo simulations on DB Twin, updates scenarios, and blocks cross-tenant simulation links", async () => {
    const [omar] = await db.select().from(schema.users).where(eq(schema.users.email, "omar@example.com"));
    const [admin] = await db.select().from(schema.users).where(eq(schema.users.email, "admin@example.com"));
    const [omarGoal] = await db.select().from(schema.goals).where(eq(schema.goals.userId, omar.id));

    const [sc] = await db
      .insert(schema.scenarios)
      .values({
        userId: omar.id,
        name: "High Inflation 25%",
        category: "macro",
        params: { inflationDelta: 0.11 },
      })
      .returning();

    const copy = await duplicateScenario(db, omar.id, sc.id);
    assert.equal(copy.name, "High Inflation 25% (copy)");

    const simOut = await runAndPersistSimulation(db, omar.id, {
      scenarioId: sc.id,
      goalId: omarGoal.id,
      paths: 200,
      horizonYears: 5,
      seed: 1337,
    });
    assert.equal(simOut.simulation.paths, 200);
    assert.equal(simOut.simulation.horizonYears, 5);
    assert.ok(simOut.results.final.p50 > 0);

    // Cross-tenant Composite FK: Admin CANNOT point simulation at Omar's scenario or goal!
    await expectPgError(
      () =>
        db.insert(schema.simulations).values({
          userId: admin.id,
          scenarioId: sc.id,
          goalId: null,
          name: "Cross-tenant scenario",
          horizonYears: 5,
          paths: 100,
          assumptions: { inflation: 0.12 },
        }),
      "23503",
    );
    await expectPgError(
      () =>
        db.insert(schema.simulations).values({
          userId: admin.id,
          scenarioId: null,
          goalId: omarGoal.id,
          name: "Cross-tenant goal",
          horizonYears: 5,
          paths: 100,
          assumptions: { inflation: 0.12 },
        }),
      "23503",
    );
  });

  it("8. Grounded AI answers + Daily AI message quota enforcement and next-day reset", async () => {
    const [omar] = await db.select().from(schema.users).where(eq(schema.users.email, "omar@example.com"));

    const q1 = await askAiWithQuota(db, omar.id, "How long could my savings cover my expenses?", "2026-11-28", 2);
    assert.equal(q1.usage.count, 1);
    assert.ok(q1.answer.text.length > 20);

    const q2 = await askAiWithQuota(db, omar.id, "What if I save 15% more?", "2026-11-28", 2);
    assert.equal(q2.usage.count, 2);

    // 3rd question on same day exceeds daily limit of 2 -> 429!
    await assert.rejects(
      () => askAiWithQuota(db, omar.id, "One more question", "2026-11-28", 2),
      (e: DomainError) => e.status === 429,
    );

    // Next day resets cleanly
    const qNextDay = await askAiWithQuota(db, omar.id, "What is my net worth?", "2026-11-29", 2);
    assert.equal(qNextDay.usage.count, 1);

    const msgs = await db.select().from(schema.aiMessages).where(eq(schema.aiMessages.userId, omar.id));
    assert.equal(msgs.length, 6); // 3 successful questions * (user + assistant)
  });

  it("9. Reports, formula-injection-safe CSV export (F-03), and full ON DELETE CASCADE cleanup", async () => {
    const [omar] = await db.select().from(schema.users).where(eq(schema.users.email, "omar@example.com"));

    // Insert dangerous spreadsheet payload + quotes/commas into transaction description
    await createTransaction(db, omar.id, {
      description: `=HYPERLINK("http://evil.example","Click")`,
      categoryKey: "food",
      type: "expense",
      amount: 55,
      date: "2026-11-28",
      accountId: null,
    });
    await createTransaction(db, omar.id, {
      description: `Coffee, "Special"`,
      categoryKey: "food",
      type: "expense",
      amount: 75,
      date: "2026-11-28",
      accountId: null,
    });

    const rep = await createReport(db, omar.id, { name: "November Check", type: "snapshot" });
    assert.equal(rep.userId, omar.id);

    const csv = await exportSafeCsvReport(db, omar.id);
    assert.ok(csv.includes(`"'=HYPERLINK(""http://evil.example"",""Click"")"`), "CSV must neutralize leading '=' and escape quotes");
    assert.ok(csv.includes(`"Coffee, ""Special"""`), "CSV must properly RFC-4180 quote commas and internal quotes");

    // Delete Omar -> ON DELETE CASCADE wipes all Omar data, keeps 19 system categories & Nour Adel intact
    await db.delete(schema.users).where(eq(schema.users.id, omar.id));

    const [
      omarSettings,
      omarTx,
      omarCats,
      omarUsage,
      omarSims,
      omarGoals,
      omarMsgs,
      omarNotifs,
      systemCats,
    ] = await Promise.all([
      getUserSettings(db, omar.id),
      db.select().from(schema.transactions).where(eq(schema.transactions.userId, omar.id)),
      db.select().from(schema.categories).where(eq(schema.categories.userId, omar.id)),
      db.select().from(schema.aiDailyUsage).where(eq(schema.aiDailyUsage.userId, omar.id)),
      db.select().from(schema.simulations).where(eq(schema.simulations.userId, omar.id)),
      db.select().from(schema.goals).where(eq(schema.goals.userId, omar.id)),
      db.select().from(schema.aiMessages).where(eq(schema.aiMessages.userId, omar.id)),
      db.select().from(schema.notifications).where(eq(schema.notifications.userId, omar.id)),
      db.select().from(schema.categories).where(isNull(schema.categories.userId)),
    ]);

    assert.equal(omarSettings, null);
    assert.equal(omarTx.length, 0);
    assert.equal(omarCats.length, 0);
    assert.equal(omarUsage.length, 0);
    assert.equal(omarSims.length, 0);
    assert.equal(omarGoals.length, 0);
    assert.equal(omarMsgs.length, 0);
    assert.equal(omarNotifs.length, 0);
    assert.equal(systemCats.length, 19);

    const [nourCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(eq(schema.users.email, "demo@fintwin.app"));
    assert.equal(nourCount.count, 1);
  });
});
