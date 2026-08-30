-- Add coordinatorId column to user table for Coordinator -> Leader -> Voter hierarchy
ALTER TABLE "user" ADD COLUMN "coordinatorId" text REFERENCES "user"("id") ON DELETE set null;

-- Add index for coordinator lookups
CREATE INDEX "user_coordinatorId_idx" ON "user" ("coordinatorId");
