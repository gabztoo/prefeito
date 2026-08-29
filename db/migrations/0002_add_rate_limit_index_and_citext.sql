CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registration_rate_limit_expiresAt_idx"
  ON "registration_rate_limit" USING btree ("expiresAt");
