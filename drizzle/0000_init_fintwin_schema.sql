CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"institution" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "accounts_type_chk" CHECK ("accounts"."type" IN ('bank', 'savings', 'cash', 'investment', 'credit', 'wallet'))
);
--> statement-breakpoint
CREATE TABLE "ai_daily_usage" (
	"user_id" integer NOT NULL,
	"usage_date" date NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"daily_limit" integer DEFAULT 20 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_daily_usage_user_id_usage_date_pk" PRIMARY KEY("user_id","usage_date"),
	CONSTRAINT "ai_daily_usage_counts_chk" CHECK ("ai_daily_usage"."message_count" >= 0 AND "ai_daily_usage"."daily_limit" > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_messages_role_chk" CHECK ("ai_messages"."role" IN ('user', 'assistant'))
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"value" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "assets_type_chk" CHECK ("assets"."type" IN ('cash', 'bank', 'investment', 'property', 'vehicle', 'business', 'other')),
	CONSTRAINT "assets_value_chk" CHECK ("assets"."value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"inflation" double precision DEFAULT 0.12 NOT NULL,
	"income_growth" double precision DEFAULT 0.08 NOT NULL,
	"expense_growth" double precision DEFAULT 0.1 NOT NULL,
	"investment_return" double precision DEFAULT 0.11 NOT NULL,
	"volatility" double precision DEFAULT 0.14 NOT NULL,
	"horizon_years" integer DEFAULT 10 NOT NULL,
	"preset" text DEFAULT 'normal' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assumptions_horizon_chk" CHECK ("assumptions"."horizon_years" BETWEEN 1 AND 30),
	CONSTRAINT "assumptions_volatility_chk" CHECK ("assumptions"."volatility" >= 0 AND "assumptions"."volatility" <= 1)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"key" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"type" text NOT NULL,
	"is_essential" boolean DEFAULT false NOT NULL,
	"icon" text DEFAULT 'Tag' NOT NULL,
	"color" text DEFAULT '#64748b' NOT NULL,
	CONSTRAINT "categories_type_chk" CHECK ("categories"."type" IN ('expense', 'income', 'transfer')),
	CONSTRAINT "categories_key_fmt_chk" CHECK ("categories"."key" ~ '^[a-z0-9_]+$')
);
--> statement-breakpoint
CREATE TABLE "financial_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"monthly_income" double precision DEFAULT 0 NOT NULL,
	"additional_income" double precision DEFAULT 0 NOT NULL,
	"income_frequency" text DEFAULT 'monthly' NOT NULL,
	"expenses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cash_savings" double precision DEFAULT 0 NOT NULL,
	"emergency_savings" double precision DEFAULT 0 NOT NULL,
	"monthly_savings" double precision DEFAULT 0 NOT NULL,
	"other_liquid" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_profiles_nonneg_chk" CHECK ("financial_profiles"."monthly_income" >= 0 AND "financial_profiles"."additional_income" >= 0 AND "financial_profiles"."cash_savings" >= 0 AND "financial_profiles"."emergency_savings" >= 0 AND "financial_profiles"."monthly_savings" >= 0 AND "financial_profiles"."other_liquid" >= 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"target_amount" double precision NOT NULL,
	"current_amount" double precision DEFAULT 0 NOT NULL,
	"target_date" date NOT NULL,
	"monthly_contribution" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "goals_amounts_chk" CHECK ("goals"."target_amount" > 0 AND "goals"."current_amount" >= 0 AND "goals"."monthly_contribution" >= 0),
	CONSTRAINT "goals_status_chk" CHECK ("goals"."status" IN ('active', 'completed', 'paused'))
);
--> statement-breakpoint
CREATE TABLE "liabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"monthly_payment" double precision DEFAULT 0 NOT NULL,
	"interest_rate" double precision DEFAULT 0 NOT NULL,
	"remaining_months" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "liabilities_type_chk" CHECK ("liabilities"."type" IN ('credit_card', 'personal_loan', 'mortgage', 'car_loan', 'student_loan', 'other')),
	CONSTRAINT "liabilities_nonneg_chk" CHECK ("liabilities"."balance" >= 0 AND "liabilities"."monthly_payment" >= 0 AND "liabilities"."interest_rate" >= 0 AND "liabilities"."remaining_months" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"goal_id" integer,
	"dedupe_key" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"template_key" text,
	"description" text,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_run_at" timestamp with time zone,
	CONSTRAINT "scenarios_id_user_uq" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"scenario_id" integer,
	"goal_id" integer,
	"name" text NOT NULL,
	"horizon_years" integer NOT NULL,
	"paths" integer NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"assumptions" jsonb NOT NULL,
	"results" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulations_horizon_chk" CHECK ("simulations"."horizon_years" BETWEEN 1 AND 30),
	CONSTRAINT "simulations_paths_chk" CHECK ("simulations"."paths" BETWEEN 100 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer,
	"category_id" integer NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_type_chk" CHECK ("transactions"."type" IN ('income', 'expense', 'transfer')),
	CONSTRAINT "transactions_amount_chk" CHECK ("transactions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notif_financial" boolean DEFAULT true NOT NULL,
	"notif_goals" boolean DEFAULT true NOT NULL,
	"notif_simulation" boolean DEFAULT true NOT NULL,
	"notif_system" boolean DEFAULT true NOT NULL,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"reminder_time" text DEFAULT '20:00' NOT NULL,
	"reminder_timezone" text DEFAULT 'Africa/Cairo' NOT NULL,
	"default_paths" integer DEFAULT 600 NOT NULL,
	"ai_transparency" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_reminder_time_chk" CHECK ("user_settings"."reminder_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "user_settings_default_paths_chk" CHECK ("user_settings"."default_paths" BETWEEN 100 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"age" integer,
	"country" text,
	"city" text,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"employment" text,
	"planning_style" text DEFAULT 'balanced' NOT NULL,
	"onboarded" boolean DEFAULT false NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_chk" CHECK ("users"."role" IN ('user', 'admin')),
	CONSTRAINT "users_planning_style_chk" CHECK ("users"."planning_style" IN ('conservative', 'balanced', 'growth')),
	CONSTRAINT "users_age_chk" CHECK ("users"."age" IS NULL OR ("users"."age" BETWEEN 13 AND 120))
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_daily_usage" ADD CONSTRAINT "ai_daily_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_messages_user_created_idx" ON "ai_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "assets_user_idx" ON "assets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assumptions_user_uq" ON "assumptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_system_key_uq" ON "categories" USING btree ("key") WHERE "categories"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_key_uq" ON "categories" USING btree ("user_id","key") WHERE "categories"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_profiles_user_uq" ON "financial_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "liabilities_user_idx" ON "liabilities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_dedupe_uq" ON "notifications" USING btree ("user_id","dedupe_key") WHERE "notifications"."dedupe_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pwd_reset_tokens_hash_uq" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "pwd_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_user_idx" ON "reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scenarios_user_idx" ON "scenarios" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "simulations_user_created_idx" ON "simulations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","date","id");--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_uq" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");