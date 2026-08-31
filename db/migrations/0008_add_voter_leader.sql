-- Add leaderId column to voter table for independent voter registration
ALTER TABLE "voter" ADD COLUMN "leaderId" text REFERENCES "user"("id") ON DELETE SET NULL;

-- Make campaignId and campaignLeaderId nullable for independent voters
ALTER TABLE "voter" ALTER COLUMN "campaignId" DROP NOT NULL;
ALTER TABLE "voter" ALTER COLUMN "campaignLeaderId" DROP NOT NULL;

-- Add leaderId column to registration_token for voter link generation
ALTER TABLE "registration_token" ADD COLUMN "leaderId" text REFERENCES "user"("id") ON DELETE SET NULL;

-- Add index for leaderId in registration_token
CREATE INDEX "registration_token_leaderId_idx" ON "registration_token" ("leaderId");
