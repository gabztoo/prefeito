--> statement-breakpoint
UPDATE "user" SET "cpf" = NULLIF(regexp_replace("cpf", '[^0-9]', '', 'g'), '');
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_cpf_unique" ON "user" ("cpf");