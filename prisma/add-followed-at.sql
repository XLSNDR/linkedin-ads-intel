-- Add followedAt to UserAdvertiser if missing (run this if you get "column does not exist")
ALTER TABLE "UserAdvertiser" ADD COLUMN IF NOT EXISTS "followedAt" TIMESTAMP(3);
