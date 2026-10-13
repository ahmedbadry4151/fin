/**
 * Plain in-memory row types. These mirror the shapes the old Drizzle/Postgres
 * schema returned (timestamps are Date objects, date columns are strings) so
 * pages and views keep working unchanged without a backend or database.
 */

export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  age: number | null;
  country: string | null;
  city: string | null;
  currency: string;
  employment: string | null;
  planningStyle: string;
  onboarded: boolean;
  emailVerified: boolean;
  settings: Record<string, unknown> | null;
  createdAt: Date;
};

export type FinancialProfile = {
  id: number;
  userId: number;
  monthlyIncome: number;
  additionalIncome: number;
  incomeFrequency: string;
  expenses: Record<string, number>;
  cashSavings: number;
  emergencySavings: number;
  monthlySavings: number;
  otherLiquid: number;
  updatedAt: Date;
};

export type Assumptions = {
  id: number;
  userId: number;
  inflation: number;
  incomeGrowth: number;
  expenseGrowth: number;
  investmentReturn: number;
  volatility: number;
  horizonYears: number;
  preset: string;
  updatedAt: Date;
};

export type Account = {
  id: number;
  userId: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  institution: string | null;
  updatedAt: Date;
};

export type Transaction = {
  id: number;
  userId: number;
  accountId: number | null;
  description: string;
  category: string;
  type: string;
  amount: number;
  date: string;
  createdAt: Date;
};

export type Asset = {
  id: number;
  userId: number;
  name: string;
  type: string;
  value: number;
};

export type Liability = {
  id: number;
  userId: number;
  name: string;
  type: string;
  balance: number;
  monthlyPayment: number;
  interestRate: number;
  remainingMonths: number;
};

export type Goal = {
  id: number;
  userId: number;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  status: string;
  createdAt: Date;
};

export type Scenario = {
  id: number;
  userId: number;
  name: string;
  category: string;
  templateKey: string | null;
  description: string | null;
  params: Record<string, unknown>;
  createdAt: Date;
  lastRunAt: Date | null;
};

export type Simulation = {
  id: number;
  userId: number;
  scenarioId: number | null;
  goalId: number | null;
  name: string;
  horizonYears: number;
  paths: number;
  status: string;
  assumptions: Record<string, number>;
  results: Record<string, unknown> | null;
  createdAt: Date;
};

export type Notification = {
  id: number;
  userId: number;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: Date;
};

export type Report = {
  id: number;
  userId: number;
  name: string;
  type: string;
  config: Record<string, unknown>;
  createdAt: Date;
};

export type AiMessage = {
  id: number;
  userId: number;
  role: string;
  content: string;
  meta: Record<string, unknown> | null;
  createdAt: Date;
};
