ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean DEFAULT false NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_unique" ON "user" ("username");
--> statement-breakpoint
UPDATE "user"
SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
WHERE "username" IS NULL;
--> statement-breakpoint
UPDATE "user" AS u
SET "banned" = false,
    "banReason" = NULL,
    "mustChangePassword" = true,
    "updatedAt" = now()
WHERE u."role" = 'leader'
  AND EXISTS (
    SELECT 1
    FROM "invitation" AS i
    WHERE i."userId" = u."id"
      AND i."status" = 'pending'
  );
