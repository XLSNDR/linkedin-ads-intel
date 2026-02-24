-- Bridge: Migrate Advertiser from old schema (companyId, companyName, companyUrl, ...) to new (linkedinCompanyId, name, linkedinUrl, ...).
-- Idempotent: only runs when old column "companyId" exists (e.g. shadow DB). Skips when DB already has linkedinCompanyId.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Advertiser' AND column_name = 'companyId'
  ) THEN
    -- Add new columns
    ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "linkedinCompanyId" TEXT;
    ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "name" TEXT;
    ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
    ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
    ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'approved';
    ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "lastScrapedAt" TIMESTAMP(3);
    ALTER TABLE "Advertiser" ADD COLUMN IF NOT EXISTS "totalAdsFound" INTEGER NOT NULL DEFAULT 0;

    -- Copy data from old columns
    UPDATE "Advertiser" SET
      "linkedinCompanyId" = "companyId",
      "name" = "companyName",
      "linkedinUrl" = "companyUrl",
      "logoUrl" = "companyLogoUrl"
    WHERE "linkedinCompanyId" IS NULL AND "companyId" IS NOT NULL;

    UPDATE "Advertiser" SET "name" = "companyName" WHERE "name" IS NULL AND "companyName" IS NOT NULL;

    -- Drop old columns
    ALTER TABLE "Advertiser" DROP COLUMN IF EXISTS "companyId";
    ALTER TABLE "Advertiser" DROP COLUMN IF EXISTS "companyName";
    ALTER TABLE "Advertiser" DROP COLUMN IF EXISTS "companyUrl";
    ALTER TABLE "Advertiser" DROP COLUMN IF EXISTS "companyLogoUrl";
    ALTER TABLE "Advertiser" DROP COLUMN IF EXISTS "industry";
    ALTER TABLE "Advertiser" DROP COLUMN IF EXISTS "followerCount";
  END IF;
END $$;
