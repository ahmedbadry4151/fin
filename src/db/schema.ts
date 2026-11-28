import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("user"),
    age: integer("age"),
    country: text("country"),
    city: text("city"),
    currency: text("currency").notNull().default("EGP"),
    employment: text("employment"),
    planningStyle: text("planning_style").notNull().default("balanced"),
    onboarded: boolean("onboarded").notNull().default(false),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    check("users_role_chk", sql`${t.role} IN ('user', 'admin')`),
    check("users_planning_style_chk", sql`${t.planningStyle} IN ('conservative', 'balanced', 'growth')`),
    check("users_age_chk", sql`${t.age} IS NULL OR (${t.age} BETWEEN 13 AND 120)`),
  ],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notifFinancial: boolean("notif_financial").notNull().default(true),
    notifGoals: boolean("notif_goals").notNull().default(true),
    notifSimulation: boolean("notif_simulation").notNull().default(true),
    notifSystem: boolean("notif_system").notNull().default(true),
    reminderEnabled: boolean("reminder_enabled").notNull().default(false),
    reminderTime: text("reminder_time").notNull().default("20:00"),
    reminderTimezone: text("reminder_timezone").notNull().default("Africa/Cairo"),
    defaultPaths: integer("default_paths").notNull().default(600),
    aiTransparency: boolean("ai_transparency").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_settings_user_uq").on(t.userId),
    check("user_settings_reminder_time_chk", sql`${t.reminderTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
    check("user_settings_default_paths_chk", sql`${t.defaultPaths} BETWEEN 100 AND 5000`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pwd_reset_tokens_hash_uq").on(t.tokenHash),
    index("pwd_reset_tokens_user_idx").on(t.userId),
  ],
);

export const aiDailyUsage = pgTable(
  "ai_daily_usage",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    usageDate: date("usage_date", { mode: "string" }).notNull(),
    messageCount: integer("message_count").notNull().default(0),
    dailyLimit: integer("daily_limit").notNull().default(20),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.usageDate] }),
    check("ai_daily_usage_counts_chk", sql`${t.messageCount} >= 0 AND ${t.dailyLimit} > 0`),
  ],
);

export const financialProfiles = pgTable(
  "financial_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    monthlyIncome: doublePrecision("monthly_income").notNull().default(0),
    additionalIncome: doublePrecision("additional_income").notNull().default(0),
    incomeFrequency: text("income_frequency").notNull().default("monthly"),
    expenses: jsonb("expenses").$type<Record<string, number>>().notNull().default({}),
    cashSavings: doublePrecision("cash_savings").notNull().default(0),
    emergencySavings: doublePrecision("emergency_savings").notNull().default(0),
    monthlySavings: doublePrecision("monthly_savings").notNull().default(0),
    otherLiquid: doublePrecision("other_liquid").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("financial_profiles_user_uq").on(t.userId),
    check(
      "financial_profiles_nonneg_chk",
      sql`${t.monthlyIncome} >= 0 AND ${t.additionalIncome} >= 0 AND ${t.cashSavings} >= 0 AND ${t.emergencySavings} >= 0 AND ${t.monthlySavings} >= 0 AND ${t.otherLiquid} >= 0`,
    ),
  ],
);

export const assumptions = pgTable(
  "assumptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inflation: doublePrecision("inflation").notNull().default(0.12),
    incomeGrowth: doublePrecision("income_growth").notNull().default(0.08),
    expenseGrowth: doublePrecision("expense_growth").notNull().default(0.1),
    investmentReturn: doublePrecision("investment_return").notNull().default(0.11),
    volatility: doublePrecision("volatility").notNull().default(0.14),
    horizonYears: integer("horizon_years").notNull().default(10),
    preset: text("preset").notNull().default("normal"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("assumptions_user_uq").on(t.userId),
    check("assumptions_horizon_chk", sql`${t.horizonYears} BETWEEN 1 AND 30`),
    check("assumptions_volatility_chk", sql`${t.volatility} >= 0 AND ${t.volatility} <= 1`),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    balance: doublePrecision("balance").notNull().default(0),
    currency: text("currency").notNull().default("EGP"),
    institution: text("institution"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("accounts_id_user_uq").on(t.id, t.userId),
    index("accounts_user_idx").on(t.userId),
    check("accounts_type_chk", sql`${t.type} IN ('bank', 'savings', 'cash', 'investment', 'credit', 'wallet')`),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    type: text("type").notNull(),
    isEssential: boolean("is_essential").notNull().default(false),
    icon: text("icon").notNull().default("Tag"),
    color: text("color").notNull().default("#64748b"),
  },
  (t) => [
    uniqueIndex("categories_system_key_uq")
      .on(t.key)
      .where(sql`${t.userId} IS NULL`),
    uniqueIndex("categories_user_key_uq")
      .on(t.userId, t.key)
      .where(sql`${t.userId} IS NOT NULL`),
    index("categories_user_idx").on(t.userId),
    check("categories_type_chk", sql`${t.type} IN ('expense', 'income', 'transfer')`),
    check("categories_key_fmt_chk", sql`${t.key} ~ '^[a-z0-9_]+$'`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: integer("account_id").references(() => accounts.id, { onDelete: "set null" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    type: text("type").notNull(),
    amount: doublePrecision("amount").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date, t.id),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_category_idx").on(t.categoryId),
    check("transactions_type_chk", sql`${t.type} IN ('income', 'expense', 'transfer')`),
    check("transactions_amount_chk", sql`${t.amount} > 0`),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    value: doublePrecision("value").notNull().default(0),
  },
  (t) => [
    index("assets_user_idx").on(t.userId),
    check("assets_type_chk", sql`${t.type} IN ('cash', 'bank', 'investment', 'property', 'vehicle', 'business', 'other')`),
    check("assets_value_chk", sql`${t.value} >= 0`),
  ],
);

export const liabilities = pgTable(
  "liabilities",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    balance: doublePrecision("balance").notNull().default(0),
    monthlyPayment: doublePrecision("monthly_payment").notNull().default(0),
    interestRate: doublePrecision("interest_rate").notNull().default(0),
    remainingMonths: integer("remaining_months").notNull().default(0),
  },
  (t) => [
    index("liabilities_user_idx").on(t.userId),
    check("liabilities_type_chk", sql`${t.type} IN ('credit_card', 'personal_loan', 'mortgage', 'car_loan', 'student_loan', 'other')`),
    check(
      "liabilities_nonneg_chk",
      sql`${t.balance} >= 0 AND ${t.monthlyPayment} >= 0 AND ${t.interestRate} >= 0 AND ${t.remainingMonths} >= 0`,
    ),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    targetAmount: doublePrecision("target_amount").notNull(),
    currentAmount: doublePrecision("current_amount").notNull().default(0),
    targetDate: date("target_date", { mode: "string" }).notNull(),
    monthlyContribution: doublePrecision("monthly_contribution").notNull().default(0),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("goals_id_user_uq").on(t.id, t.userId),
    index("goals_user_idx").on(t.userId),
    check("goals_amounts_chk", sql`${t.targetAmount} > 0 AND ${t.currentAmount} >= 0 AND ${t.monthlyContribution} >= 0`),
    check("goals_status_chk", sql`${t.status} IN ('active', 'completed', 'paused')`),
  ],
);

export const scenarios = pgTable(
  "scenarios",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    templateKey: text("template_key"),
    description: text("description"),
    params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  },
  (t) => [
    unique("scenarios_id_user_uq").on(t.id, t.userId),
    index("scenarios_user_idx").on(t.userId),
  ],
);

export const simulations = pgTable(
  "simulations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scenarioId: integer("scenario_id").references(() => scenarios.id, { onDelete: "set null" }),
    goalId: integer("goal_id").references(() => goals.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    horizonYears: integer("horizon_years").notNull(),
    paths: integer("paths").notNull(),
    status: text("status").notNull().default("completed"),
    assumptions: jsonb("assumptions").$type<Record<string, number>>().notNull(),
    results: jsonb("results").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("simulations_user_created_idx").on(t.userId, t.createdAt),
    check("simulations_horizon_chk", sql`${t.horizonYears} BETWEEN 1 AND 30`),
    check("simulations_paths_chk", sql`${t.paths} BETWEEN 100 AND 5000`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: integer("goal_id").references(() => goals.id, { onDelete: "set null" }),
    dedupeKey: text("dedupe_key"),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("notifications_user_dedupe_uq")
      .on(t.userId, t.dedupeKey)
      .where(sql`${t.dedupeKey} IS NOT NULL`),
    index("notifications_user_read_idx").on(t.userId, t.read, t.createdAt),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_user_idx").on(t.userId)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_messages_user_created_idx").on(t.userId, t.createdAt),
    check("ai_messages_role_chk", sql`${t.role} IN ('user', 'assistant')`),
  ],
);
