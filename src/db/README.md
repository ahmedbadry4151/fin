# FinTwin — Backend & PostgreSQL Database (`backend` branch)

طبقة قاعدة البيانات ومنطق الخادم لنظام **FinTwin** مبنية بـ **PostgreSQL 16** + **Drizzle ORM**، ومتوافقة 100% مع عقود البيانات والواجهات الحالية في `src/lib/` و`src/components/` دون كسر أي صفحة Frontend.

---

## 1. ملخص ما تم إضافته وتعديله

| المسار | الوصف |
|---|---|
| `src/db/schema.ts` | تعريف الـ **18 جدولاً** كاملةً مع علاقاتها، وقيود `CHECK` و`UNIQUE` و`PRIMARY KEY` والفهارس (`INDEX`). |
| `src/db/client.ts` | عميل الاتصال بـ PostgreSQL (`pg.Pool` + Drizzle ORM) عبر `DATABASE_URL`. |
| `src/db/seed.ts` | زرع **19 فئة نظام** (`categories` بالعربية والإنجليزية) + بيانات التوأم المالي التوضيحي (`Nour Adel`). |
| `src/db/run-seed.ts` | سكربت CLI لتطبيق الـ Migrations وتشغيل الـ Seed على قاعدة بيانات حية (`npm run db:setup`). |
| `src/db/services.ts` | طبقة خدمات الأعمال والتحقق والأمان (Auth/Sessions، Reset Tokens، Settings/Reminders، Transactions، 80% Goal Alert، Monte Carlo Simulations، AI Daily Quota، Safe CSV Export) مرتبطة مباشرةً بمحرك `src/lib/` (`computeMetrics`, `runSimulation`, `answerQuestion`). |
| `src/db/__tests__/user-journey.test.ts` | مجموعة اختبارات End-to-End (**9 اختبارات**) تحاكي رحلة مستخدم كاملة على PostgreSQL فعلي (`PGlite`). |
| `drizzle/0000_init_fintwin_schema.sql` | ملف الـ SQL Migration الأساسي لإنشاء الـ 18 جدولاً. |
| `drizzle/0001_ownership_consistency.sql` | قيود **Composite Foreign Keys** مع `ON DELETE SET NULL` للعمود الاختياري فقط + Trigger `trg_transactions_category_owner` لحماية تطابق المالك بين الجداول. |
| `drizzle.config.ts` | إعدادات `drizzle-kit` لتوليد وتطبيق الـ migrations وتشغيل Studio. |
| `docker-compose.yml` | حاوية `postgres:16-alpine` للتشغيل المحلي على المنفذ **`5433`** (لتفادي التعارض مع أي Postgres مثبت مسبقاً على `5432`). |
| `.env.example` | قالب متغيرات البيئة (`DATABASE_URL`, `SESSION_SECRET`) — بينما ملف `.env` محظور تماماً في `.gitignore`. |

---

## 2. الجداول الـ 18 والقيود المصممة

### أ) الجداول الأساسية (13 جدولاً متوافقة مع `src/lib/types.ts`)
- **`users`**: بيانات المستخدم + عمود `role` (`'user' | 'admin'`، الافتراضي `'user'`) + قيد `CHECK` على `age` و`planning_style` + `UNIQUE` على `email`.
- **`financial_profiles`** (`1:1` مع `users`): الدخل والمدخرات والمصروفات الـ 13 (`jsonb`).
- **`assumptions`** (`1:1` مع `users`): الافتراضات الاقتصادية + قيد `horizon_years BETWEEN 1 AND 30` و`volatility BETWEEN 0 AND 1`.
- **`accounts`** (`1:N` مع `users`): الحسابات المالية + قيد `UNIQUE (id, user_id)` لدعم التحقق المركّب للملكية.
- **`transactions`** (`1:N` مع `users`، `N:1` إجباري مع `categories`، `N:1` اختياري مع `accounts`):
  - `amount > 0`
  - **Composite FK** `(account_id, user_id) -> accounts(id, user_id) ON DELETE SET NULL ("account_id")`: يضمن أن المعاملة لا ترتبط أبداً بحساب مستخدم آخر، وعند حذف الحساب يتحول `account_id` إلى `NULL` مع بقاء `user_id` والمعاملة.
  - **Trigger `trg_transactions_category_owner`**: يمنع استخدام فئة مخصصة تابعة لمستخدم آخر.
- **`assets`**, **`liabilities`**, **`goals`**, **`scenarios`**, **`simulations`**, **`notifications`**, **`reports`**, **`ai_messages`**:
  - على `simulations`: **Composite FKs** `(scenario_id, user_id)` و`(goal_id, user_id)` مع `ON DELETE SET NULL` للعمود الاختياري، وقيد `horizon_years BETWEEN 1 AND 30` و`paths BETWEEN 100 AND 5000`.
  - على `notifications`: عمود `dedupe_key` مع فهرس فريد جزئي `UNIQUE (user_id, dedupe_key)` وComposite FK على `(goal_id, user_id)` — يضمن إرسال **تنبيه الـ 80%** للهدف **مرة واحدة فقط**.

### ب) الإضافات الـ 5 الجديدة
1. **`categories`**: فئات موحّدة (`name_en`, `name_ar`, `type`, `is_essential`, `icon`, `color`) تضم الـ 19 فئة الافتراضية (`user_id IS NULL`) والفئات المخصصة لكل مستخدم (`user_id IS NOT NULL`).
2. **`user_settings`** (`1:1` مع `users`): تفضيلات الإشعارات + إعدادات التذكير (`reminder_enabled`, `reminder_time`, `reminder_timezone`) + `default_paths` + `ai_transparency`.
3. **`sessions`**: جلسات الدخول الحقيقية عبر تخزين `token_hash` و`expires_at`.
4. **`password_reset_tokens`**: توكنات استرجاع كلمة المرور بانتهاء صلاحية واستخدام لمرة واحدة (`used_at`) مع إبطال الجلسات النشطة عند الاستخدام.
5. **`ai_daily_usage`**: عداد استخدام المساعد الذكي اليومي بمفتاح مركّب `(user_id, usage_date)` و`daily_limit` لمنع تجاوز الحد اليومي.

---

## 3. طريقة تشغيل وتجربة الداتابيز على جهازك

### الطريقة 1: تشغيل الاختبارات فوراً بدون Docker أو Postgres (الأسرع)
المشروع يستخدم `PGlite` (محرك PostgreSQL فعلي داخل Node.js) لتطبيق الـ migrations وتشغيل اختبارات رحلة المستخدم الكاملة تلقائياً:

```bash
npm install
npm test
```

- يشغّل **9 اختبارات شاملة** في [user-journey.test.ts](./__tests__/user-journey.test.ts) تغطي الـ 18 جدولاً، الـ Seed، التسجيل/الدخول، Reset Tokens، التوأم المالي، توازن الأرصدة الذري، منع تضارب الملكية، تنبيه الـ 80%، المحاكاة، عداد الـ AI اليومي، التصدير الآمن لـ CSV، و`ON DELETE CASCADE`.

---

### الطريقة 2: تشغيل PostgreSQL حقيقي محلياً عبر Docker + DBeaver / Drizzle Studio

1. تأكد أن **Docker Desktop** شغال على جهازك.
2. أنشئ ملف `.env` في جذر المشروع (انسخ من `.env.example`):
   ```bash
   cp .env.example .env
   ```
   *(محتواه الافتراضي: `DATABASE_URL="postgres://fintwin:fintwin_dev@127.0.0.1:5433/fintwin"`)*
3. شغّل حاوية PostgreSQL:
   ```bash
   docker compose up -d --wait
   ```
4. طبّق الـ Migrations وازرع البيانات التوضيحية (`19` فئة + بيانات `Nour Adel`):
   ```bash
   npm run db:setup
   ```
5. **استعراض الجداول والـ ER Diagram:**
   - **من المتصفح (Drizzle Studio):**
     ```bash
     npm run db:studio
     ```
   - **من DBeaver:** أنشئ اتصال **PostgreSQL** جديد بالبيانات التالية:
     - **Host:** `127.0.0.1`
     - **Port:** `5433`
     - **Database:** `fintwin`
     - **Username:** `fintwin`
     - **Password:** `fintwin_dev`
     - ثم افتح: `fintwin` → `Schemas` → `public` → دبل كليك على **`Tables`** → تبويب **`ER Diagram`**.

---

### الطريقة 3: استخدام قاعدة بيانات سحابية (Neon / Supabase)
1. أنشئ قاعدة بيانات PostgreSQL مجانية على Neon أو Supabase.
2. ضع رابط الاتصال داخل `.env` في المتغير `DATABASE_URL`.
3. نفّذ:
   ```bash
   npm run db:setup
   ```

---

## 4. الأوامر المتاحة

| الأمر | الوظيفة |
|---|---|
| `npm test` | تشغيل اختبارات الداتابيز الـ 9 على PostgreSQL (`PGlite`) |
| `npm run typecheck` | فحص TypeScript (`tsc --noEmit`) |
| `npm run build` | بناء تطبيق Next.js للإنتاج |
| `npm run db:generate` | توليد SQL Migration جديد عند تعديل `src/db/schema.ts` |
| `npm run db:migrate` | تطبيق الـ Migrations على `DATABASE_URL` |
| `npm run db:setup` | تطبيق الـ Migrations + تشغيل الـ Seed على `DATABASE_URL` |
| `npm run db:studio` | فتح واجهة تصفح الجداول من Drizzle في المتصفح |

> **تحذير أمني:** لا تقم أبداً برفع ملف `.env` على GitHub؛ ملف [.gitignore](../../.gitignore) يضمن حظره تلقائياً مع السماح فقط برفع `.env.example`.
