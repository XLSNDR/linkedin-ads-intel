-- ScrapeRun.jobType: "initial" | "scheduled" for storeAds and Advertiser schedule updates
ALTER TABLE "ScrapeRun" ADD COLUMN IF NOT EXISTS "jobType" TEXT;
