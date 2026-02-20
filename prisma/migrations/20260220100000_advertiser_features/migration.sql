-- Advertiser features: Plan limits (add/follow), Advertiser scheduling + optional linkedinCompanyId, UserAdvertiser status (added|following|archived)

-- Plan: add maxFollowedAdvertisers, then rename maxActiveAdvertisers -> maxAddedAdvertisers
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxFollowedAdvertisers" INTEGER NOT NULL DEFAULT 0;
UPDATE "Plan" SET "maxFollowedAdvertisers" = 0 WHERE "name" = 'free_trial';
UPDATE "Plan" SET "maxFollowedAdvertisers" = 5 WHERE "name" = 'starter';
UPDATE "Plan" SET "maxFollowedAdvertisers" = 25 WHERE "name" = 'pro';
UPDATE "Plan" SET "maxFollowedAdvertisers" = 100 WHERE "name" = 'agency';
ALTER TABLE "Plan" RENAME COLUMN "maxActiveAdvertisers" TO "maxAddedAdvertisers";
UPDATE "Plan" SET "maxAddedAdvertisers" = 3 WHERE "name" = 'free_trial';
UPDATE "Plan" SET "maxAddedAdvertisers" = 10 WHERE "name" = 'starter';
UPDATE "Plan" SET "maxAddedAdvertisers" = 50 WHERE "name" = 'pro';
UPDATE "Plan" SET "maxAddedAdvertisers" = 999 WHERE "name" = 'agency';

-- Create admin plan if not exists (unlimited)
INSERT INTO "Plan" ("id", "name", "displayName", "priceMonthly", "priceYearly", "maxAddedAdvertisers", "maxFollowedAdvertisers", "refreshFrequency", "maxCollections", "snapshotRetentionDays", "impressionEstimates", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES ('admin', 'admin', 'Admin', 0, 0, 999, 999, 'weekly', -1, 365, true, true, 99, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "maxAddedAdvertisers" = 999, "maxFollowedAdvertisers" = 999;

-- User: add maxAddedAdvertisers and maxFollowedAdvertisers overrides (nullable), rename existing override
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxAddedAdvertisers" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxFollowedAdvertisers" INTEGER;
UPDATE "User" SET "maxAddedAdvertisers" = "maxActiveAdvertisers" WHERE "maxActiveAdvertisers" IS NOT NULL;
ALTER TABLE "User" DROP COLUMN IF EXISTS "maxActiveAdvertisers";

-- Advertiser: linkedinCompanyId optional, linkedinUrl unique, add scrape scheduling
ALTER TABLE "Advertiser" ALTER COLUMN "linkedinCompanyId" DROP NOT NULL;
ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "scrapeFrequency" TEXT;
ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "nextScrapeAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Advertiser_linkedinUrl_key" ON "Advertiser"("linkedinUrl") WHERE "linkedinUrl" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Advertiser_linkedinUrl_idx" ON "Advertiser"("linkedinUrl");
CREATE INDEX IF NOT EXISTS "Advertiser_scrapeFrequency_nextScrapeAt_idx" ON "Advertiser"("scrapeFrequency", "nextScrapeAt");

-- UserAdvertiser: status added|following|archived (migrate active -> added)
UPDATE "UserAdvertiser" SET "status" = 'added' WHERE "status" = 'active';
ALTER TABLE "UserAdvertiser" ALTER COLUMN "status" SET DEFAULT 'added';
