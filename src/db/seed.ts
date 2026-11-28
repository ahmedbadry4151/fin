import { sql } from "drizzle-orm";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../lib/constants";
import {
  DEMO_ACCOUNTS,
  DEMO_ASSETS,
  DEMO_EXPENSES,
  DEMO_GOAL,
  DEMO_LIABILITIES,
  DEMO_PROFILE_NUMBERS,
  demoGoalTargetDate,
} from "../lib/demo";
import { DEFAULT_ASSUMPTIONS } from "../lib/economy";
import { toISODate } from "../lib/format";
import { templateByKey } from "../lib/scenarios";
import { runSimulation } from "../lib/simulation";
import { buildSimTwin } from "../lib/twin";
import type { DbClient } from "./client";
import {
  accounts,
  assumptions,
  assets,
  categories,
  financialProfiles,
  goals,
  liabilities,
  notifications,
  reports,
  scenarios,
  simulations,
  transactions,
  users,
  userSettings,
} from "./schema";
import { scryptSync, randomBytes } from "node:crypto";

export const SYSTEM_CATEGORIES: Array<{
  key: string;
  nameEn: string;
  nameAr: string;
  type: "expense" | "income" | "transfer";
  isEssential: boolean;
  icon: string;
  color: string;
}> = [
  { key: "housing", nameEn: "Housing", nameAr: "السكن والإيجار", type: "expense", isEssential: true, icon: "Home", color: "#0284c7" },
  { key: "food", nameEn: "Food", nameAr: "الطعام والبقالة", type: "expense", isEssential: true, icon: "Utensils", color: "#16a34a" },
  { key: "transportation", nameEn: "Transportation", nameAr: "المواصلات والوقود", type: "expense", isEssential: true, icon: "Car", color: "#d97706" },
  { key: "utilities", nameEn: "Utilities", nameAr: "المرافق والفواتير", type: "expense", isEssential: true, icon: "Zap", color: "#eab308" },
  { key: "healthcare", nameEn: "Healthcare", nameAr: "الرعاية الصحية", type: "expense", isEssential: true, icon: "HeartPulse", color: "#dc2626" },
  { key: "education", nameEn: "Education", nameAr: "التعليم", type: "expense", isEssential: true, icon: "GraduationCap", color: "#2563eb" },
  { key: "debt", nameEn: "Debt payments", nameAr: "سداد الديون والأقساط", type: "expense", isEssential: true, icon: "CreditCard", color: "#9333ea" },
  { key: "family", nameEn: "Family support", nameAr: "دعم الأسرة", type: "expense", isEssential: true, icon: "Users", color: "#0d9488" },
  { key: "entertainment", nameEn: "Entertainment", nameAr: "الترفيه", type: "expense", isEssential: false, icon: "Film", color: "#ec4899" },
  { key: "shopping", nameEn: "Shopping", nameAr: "التسوق", type: "expense", isEssential: false, icon: "ShoppingBag", color: "#f97316" },
  { key: "travel", nameEn: "Travel", nameAr: "السفر", type: "expense", isEssential: false, icon: "Plane", color: "#06b6d4" },
  { key: "subscriptions", nameEn: "Subscriptions", nameAr: "الاشتراكات", type: "expense", isEssential: false, icon: "Repeat", color: "#6366f1" },
  { key: "other", nameEn: "Other", nameAr: "أخرى", type: "expense", isEssential: false, icon: "Tag", color: "#64748b" },
  { key: "salary", nameEn: "Salary", nameAr: "الراتب", type: "income", isEssential: false, icon: "Briefcase", color: "#15803d" },
  { key: "freelance", nameEn: "Freelance", nameAr: "عمل حر", type: "income", isEssential: false, icon: "Laptop", color: "#059669" },
  { key: "income", nameEn: "Other income", nameAr: "دخل إضافي", type: "income", isEssential: false, icon: "Coins", color: "#10b981" },
  { key: "savings", nameEn: "Savings", nameAr: "تحويل للادخار", type: "transfer", isEssential: false, icon: "PiggyBank", color: "#0ea5e9" },
  { key: "investment", nameEn: "Investment", nameAr: "تحويل للاستثمار", type: "transfer", isEssential: false, icon: "TrendingUp", color: "#8b5cf6" },
  { key: "transfer", nameEn: "Transfer", nameAr: "تحويل داخلي", type: "transfer", isEssential: false, icon: "ArrowLeftRight", color: "#475569" },
];

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function seedCategories(db: DbClient) {
  for (const cat of SYSTEM_CATEGORIES) {
    await db
      .insert(categories)
      .values({ userId: null, ...cat })
      .onConflictDoNothing();
  }
  const rows = await db.select().from(categories).where(sql`${categories.userId} IS NULL`);
  return new Map(rows.map((r) => [r.key, r.id]));
}

function rnd(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Idempotently seed system categories and the Nour Adel demo Financial Twin. */
export async function seedDatabase(db: DbClient) {
  const catMap = await seedCategories(db);

  const existing = await db.select().from(users).where(sql`${users.email} = ${DEMO_EMAIL}`);
  if (existing.length > 0) {
    return { demoUserId: existing[0].id, categoryCount: catMap.size, seeded: false };
  }

  return db.transaction(async (tx) => {
    const now = new Date();
    const y = now.getFullYear();

    const [user] = await tx
      .insert(users)
      .values({
        name: "Nour Adel",
        email: DEMO_EMAIL,
        passwordHash: hashPassword(DEMO_PASSWORD),
        role: "user",
        age: 31,
        country: "Egypt",
        city: "Cairo",
        currency: "EGP",
        employment: "employed",
        planningStyle: "balanced",
        onboarded: true,
        emailVerified: true,
      })
      .returning();

    await tx.insert(userSettings).values({
      userId: user.id,
      notifFinancial: true,
      notifGoals: true,
      notifSimulation: true,
      notifSystem: true,
      reminderEnabled: true,
      reminderTime: "20:00",
      reminderTimezone: "Africa/Cairo",
      defaultPaths: 600,
      aiTransparency: true,
    });

    await tx.insert(financialProfiles).values({
      userId: user.id,
      ...DEMO_PROFILE_NUMBERS,
      expenses: DEMO_EXPENSES,
    });

    await tx.insert(assumptions).values({
      userId: user.id,
      ...DEFAULT_ASSUMPTIONS,
      preset: "normal",
    });

    const accRows = await tx
      .insert(accounts)
      .values(
        DEMO_ACCOUNTS.map((a) => ({
          userId: user.id,
          name: a.name,
          type: a.type,
          balance: a.balance,
          currency: "EGP",
          institution: a.institution,
        })),
      )
      .returning();

    const ids = {
      bank: accRows.find((a) => a.name === "Main Bank")!.id,
      savings: accRows.find((a) => a.name === "Savings")!.id,
      credit: accRows.find((a) => a.name === "Credit Card")!.id,
    };

    await tx.insert(assets).values(DEMO_ASSETS.map((a) => ({ userId: user.id, ...a })));
    await tx.insert(liabilities).values(DEMO_LIABILITIES.map((l) => ({ userId: user.id, ...l })));

    const goalRows = await tx
      .insert(goals)
      .values([
        {
          userId: user.id,
          name: DEMO_GOAL.name,
          type: DEMO_GOAL.type,
          targetAmount: DEMO_GOAL.targetAmount,
          currentAmount: DEMO_GOAL.currentAmount,
          targetDate: demoGoalTargetDate(now),
          monthlyContribution: DEMO_GOAL.monthlyContribution,
          status: "active",
        },
        {
          userId: user.id,
          name: "Emergency Fund",
          type: "emergency",
          targetAmount: 110700,
          currentAmount: 88560,
          targetDate: `${y + 1}-06-01`,
          monthlyContribution: 1000,
          status: "active",
        },
        {
          userId: user.id,
          name: "Japan Trip",
          type: "travel",
          targetAmount: 60000,
          currentAmount: 18000,
          targetDate: `${y + 1}-11-01`,
          monthlyContribution: 1000,
          status: "active",
        },
      ])
      .returning();

    const homeGoal = goalRows[0];
    const emergencyGoal = goalRows[1];

    // Seed 7 months of transactions mapped to real category_id FKs
    const r = rnd(20240601);
    const txValues: Array<typeof transactions.$inferInsert> = [];
    const pushTx = (day: number, base: Date, description: string, catKey: string, type: "income" | "expense" | "transfer", amount: number, accountId: number) => {
      const d = new Date(base.getFullYear(), base.getMonth(), Math.min(day, 28));
      if (d > now) return;
      txValues.push({
        userId: user.id,
        accountId,
        categoryId: catMap.get(catKey)!,
        description,
        type,
        amount: Math.round(amount),
        date: toISODate(d),
        createdAt: d,
      });
    };

    for (let mo = 6; mo >= 0; mo--) {
      const base = new Date(now.getFullYear(), now.getMonth() - mo, 1);
      pushTx(1, base, "Salary — Horizon Digital", "salary", "income", 32000, ids.bank);
      pushTx(2, base, "Apartment rent", "housing", "expense", 7500, ids.bank);
      pushTx(3, base, "Transfer to savings", "savings", "transfer", 10000, ids.bank);
      pushTx(5, base, "Car loan instalment", "debt", "expense", 1250, ids.bank);
      pushTx(6, base, "Credit card payment", "debt", "expense", 500, ids.bank);
      pushTx(8, base, "Electricity & water", "utilities", "expense", 600 + r() * 150, ids.bank);
      pushTx(9, base, "Internet & mobile", "utilities", "expense", 450, ids.bank);
      pushTx(10, base, "Family support", "family", "expense", 1500, ids.bank);
      pushTx(11, base, "Pharmacy", "healthcare", "expense", 350 + r() * 400, ids.credit);
      [4, 11, 18, 25].forEach((day, i) => pushTx(day, base, i % 2 ? "Carrefour groceries" : "Local market", "food", "expense", 700 + r() * 300, ids.credit));
      [7, 21].forEach((day) => pushTx(day, base, "Fuel", "transportation", "expense", 800 + r() * 250, ids.credit));
      pushTx(12, base, "Netflix", "subscriptions", "expense", 165, ids.credit);
      pushTx(12, base, "Spotify", "subscriptions", "expense", 60, ids.credit);
      pushTx(13, base, "Gym membership", "subscriptions", "expense", 125, ids.credit);
      [14, 20, 27].forEach((day, i) => pushTx(day, base, ["Dinner with friends", "Coffee & brunch", "Cinema"][i], "entertainment", "expense", 220 + r() * 220, ids.credit));
      [16, 23].forEach((day, i) => pushTx(day, base, i ? "Clothing" : "Home items", "shopping", "expense", 300 + r() * 350, ids.credit));
      pushTx(19, base, "Ride hailing", "transportation", "expense", 150 + r() * 120, ids.credit);
      pushTx(22, base, "Miscellaneous", "other", "expense", 250 + r() * 300, ids.bank);
      if (mo === 3) pushTx(15, base, "Weekend trip — Dahab", "travel", "expense", 4200, ids.credit);
      if (mo === 1) pushTx(17, base, "Freelance design project", "freelance", "income", 6000, ids.bank);
      if (mo === 0) pushTx(9, base, "Annual car insurance", "transportation", "expense", 2400, ids.bank);
    }
    await tx.insert(transactions).values(txValues);

    const templates = ["lose-job", "save-more", "buy-home", "high-inflation", "have-child"].map((k) => templateByKey(k)!);
    const scRows = await tx
      .insert(scenarios)
      .values(
        templates.map((t) => ({
          userId: user.id,
          name: t.name,
          category: t.category,
          templateKey: t.key,
          description: t.description,
          params: t.params as unknown as Record<string, unknown>,
          lastRunAt: now,
        })),
      )
      .returning();

    const simInput = {
      ...DEMO_PROFILE_NUMBERS,
      expenses: DEMO_EXPENSES,
      accounts: DEMO_ACCOUNTS.map((a) => ({ type: a.type, balance: a.balance })),
      assets: DEMO_ASSETS.map((a) => ({ type: a.type, value: a.value })),
      liabilities: DEMO_LIABILITIES.map((l) => ({
        balance: l.balance,
        monthlyPayment: l.monthlyPayment,
        interestRate: l.interestRate,
        remainingMonths: l.remainingMonths,
      })),
    };
    const simTwin = buildSimTwin(simInput, {
      id: homeGoal.id,
      name: homeGoal.name,
      targetAmount: homeGoal.targetAmount,
      currentAmount: homeGoal.currentAmount,
      targetDate: String(homeGoal.targetDate),
      monthlyContribution: homeGoal.monthlyContribution,
    });

    const baseline = runSimulation(simTwin, { ...DEFAULT_ASSUMPTIONS }, {}, { paths: 600, seed: 1337, sensitivity: true, baseline: false });
    const simValues: Array<typeof simulations.$inferInsert> = [
      {
        userId: user.id,
        scenarioId: null,
        goalId: homeGoal.id,
        name: "Current Plan",
        horizonYears: 10,
        paths: 600,
        status: "completed",
        assumptions: { ...DEFAULT_ASSUMPTIONS },
        results: baseline as unknown as Record<string, unknown>,
      },
    ];
    for (const key of ["lose-job", "save-more"]) {
      const sc = scRows.find((s) => s.templateKey === key)!;
      const res = runSimulation(simTwin, { ...DEFAULT_ASSUMPTIONS }, templateByKey(key)!.params, {
        paths: 600,
        seed: 1337 + sc.id,
        sensitivity: true,
        baseline: true,
      });
      simValues.push({
        userId: user.id,
        scenarioId: sc.id,
        goalId: homeGoal.id,
        name: sc.name,
        horizonYears: 10,
        paths: 600,
        status: "completed",
        assumptions: { ...DEFAULT_ASSUMPTIONS },
        results: res as unknown as Record<string, unknown>,
      });
    }
    await tx.insert(simulations).values(simValues);

    await tx.insert(notifications).values([
      {
        userId: user.id,
        kind: "simulation",
        title: "Simulation finished",
        body: "“Save 15% More” completed with 600 paths. Goal probability moved up.",
        href: "/simulations",
        read: false,
      },
      {
        userId: user.id,
        goalId: emergencyGoal.id,
        dedupeKey: `goal:${emergencyGoal.id}:80pct`,
        kind: "goal",
        title: "Emergency Fund at 80%",
        body: "You are EGP 22,140 away from six months of essential expenses.",
        href: "/goals",
        read: false,
      },
      {
        userId: user.id,
        kind: "financial",
        title: "Transportation spending up",
        body: "Annual car insurance pushed transportation 2.3× above its monthly average.",
        href: "/analytics/spending",
        read: false,
      },
      {
        userId: user.id,
        kind: "system",
        title: "Financial Twin updated",
        body: "Your model now reflects 7 months of transactions.",
        href: "/twin",
        read: true,
      },
    ]);

    await tx.insert(reports).values([
      {
        userId: user.id,
        name: "Financial Snapshot — this month",
        type: "snapshot",
        config: { sections: ["summary", "snapshot", "charts", "goals", "assumptions"], range: "month" },
      },
      {
        userId: user.id,
        name: "Lose My Job — scenario report",
        type: "scenario",
        config: { sections: ["summary", "scenario", "charts", "assumptions", "ai"], scenarioKey: "lose-job" },
      },
    ]);

    return { demoUserId: user.id, categoryCount: catMap.size, seeded: true };
  });
}
