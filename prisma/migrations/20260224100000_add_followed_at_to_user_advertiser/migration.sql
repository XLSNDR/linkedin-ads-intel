-- AlterTable (IF NOT EXISTS so deploy succeeds when column was added manually or in a previous run)
ALTER TABLE "UserAdvertiser" ADD COLUMN IF NOT EXISTS "followedAt" TIMESTAMP(3);
