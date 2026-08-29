ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;
--> statement-breakpoint
UPDATE "account"
SET "issuer" = 'local:credential'
WHERE "providerId" = 'credential'
  AND "issuer" IS NULL;
