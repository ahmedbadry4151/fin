-- Enforce cross-table tenant ownership consistency directly in PostgreSQL
-- while preserving ON DELETE SET NULL for optional links (PG 15+ column-level syntax).

ALTER TABLE "transactions" DROP CONSTRAINT "transactions_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_owner_fk"
  FOREIGN KEY ("account_id", "user_id")
  REFERENCES "public"."accounts"("id", "user_id")
  ON DELETE SET NULL ("account_id")
  ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "simulations" DROP CONSTRAINT "simulations_scenario_id_scenarios_id_fk";--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_scenario_owner_fk"
  FOREIGN KEY ("scenario_id", "user_id")
  REFERENCES "public"."scenarios"("id", "user_id")
  ON DELETE SET NULL ("scenario_id")
  ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "simulations" DROP CONSTRAINT "simulations_goal_id_goals_id_fk";--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_goal_owner_fk"
  FOREIGN KEY ("goal_id", "user_id")
  REFERENCES "public"."goals"("id", "user_id")
  ON DELETE SET NULL ("goal_id")
  ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "notifications" DROP CONSTRAINT "notifications_goal_id_goals_id_fk";--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_goal_owner_fk"
  FOREIGN KEY ("goal_id", "user_id")
  REFERENCES "public"."goals"("id", "user_id")
  ON DELETE SET NULL ("goal_id")
  ON UPDATE no action;--> statement-breakpoint

-- Ensure transactions cannot reference another user's custom category
CREATE OR REPLACE FUNCTION check_tx_category_owner() RETURNS trigger AS $$
DECLARE
  cat_owner integer;
BEGIN
  SELECT user_id INTO cat_owner FROM categories WHERE id = NEW.category_id;
  IF cat_owner IS NOT NULL AND cat_owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Category % belongs to another user (%)', NEW.category_id, cat_owner
      USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER trg_transactions_category_owner
  BEFORE INSERT OR UPDATE OF category_id, user_id ON "transactions"
  FOR EACH ROW
  EXECUTE FUNCTION check_tx_category_owner();
