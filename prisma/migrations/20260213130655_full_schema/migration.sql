-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "planId" TEXT NOT NULL DEFAULT 'free_trial',
    "maxActiveAdvertisers" INTEGER,
    "refreshFrequency" TEXT,
    "snapshotRetentionDays" INTEGER,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "stripePriceId" TEXT,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdYearly" TEXT,
    "priceMonthly" INTEGER NOT NULL DEFAULT 0,
    "priceYearly" INTEGER NOT NULL DEFAULT 0,
    "maxActiveAdvertisers" INTEGER NOT NULL,
    "refreshFrequency" TEXT NOT NULL,
    "maxCollections" INTEGER NOT NULL,
    "snapshotRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "impressionEstimates" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertiser" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyLogoUrl" TEXT,
    "companyUrl" TEXT,
    "industry" TEXT,
    "followerCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAdvertiser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "firstTrackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScrapedAt" TIMESTAMP(3),
    "nextScrapeAt" TIMESTAMP(3),
    "scrapeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAdvertiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "adLibraryUrl" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'active',
    "introText" TEXT NOT NULL,
    "ctaText" TEXT,
    "landingPageUrl" TEXT,
    "landingDomain" TEXT,
    "creativeMediaUrls" TEXT[],
    "creativeHash" TEXT NOT NULL DEFAULT '',
    "creativeThumbnailUrl" TEXT,
    "languages" TEXT[],
    "locations" TEXT[],
    "hasImpressions" BOOLEAN NOT NULL DEFAULT false,
    "impressionBucket" TEXT,
    "assumedImpressions" INTEGER,
    "countryData" JSONB,
    "firstSeenDate" TIMESTAMP(3) NOT NULL,
    "lastSeenDate" TIMESTAMP(3) NOT NULL,
    "runtimeDays" INTEGER NOT NULL DEFAULT 0,
    "firstScrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScrapedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "runtimeDays" INTEGER NOT NULL,
    "impressionBucket" TEXT,
    "assumedImpressions" INTEGER,
    "countryData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionAd" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "adsFound" INTEGER NOT NULL DEFAULT 0,
    "adsNew" INTEGER NOT NULL DEFAULT 0,
    "adsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "Advertiser_companyId_key" ON "Advertiser"("companyId");

-- CreateIndex
CREATE INDEX "Advertiser_companyId_idx" ON "Advertiser"("companyId");

-- CreateIndex
CREATE INDEX "Advertiser_companyName_idx" ON "Advertiser"("companyName");

-- CreateIndex
CREATE INDEX "UserAdvertiser_userId_status_idx" ON "UserAdvertiser"("userId", "status");

-- CreateIndex
CREATE INDEX "UserAdvertiser_status_nextScrapeAt_idx" ON "UserAdvertiser"("status", "nextScrapeAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAdvertiser_userId_advertiserId_key" ON "UserAdvertiser"("userId", "advertiserId");

-- CreateIndex
CREATE UNIQUE INDEX "Ad_adId_key" ON "Ad"("adId");

-- CreateIndex
CREATE UNIQUE INDEX "Ad_adLibraryUrl_key" ON "Ad"("adLibraryUrl");

-- CreateIndex
CREATE INDEX "Ad_adId_idx" ON "Ad"("adId");

-- CreateIndex
CREATE INDEX "Ad_advertiserId_idx" ON "Ad"("advertiserId");

-- CreateIndex
CREATE INDEX "Ad_status_idx" ON "Ad"("status");

-- CreateIndex
CREATE INDEX "Ad_format_idx" ON "Ad"("format");

-- CreateIndex
CREATE INDEX "Ad_firstSeenDate_idx" ON "Ad"("firstSeenDate");

-- CreateIndex
CREATE INDEX "Ad_assumedImpressions_idx" ON "Ad"("assumedImpressions");

-- CreateIndex
CREATE INDEX "Snapshot_adId_snapshotDate_idx" ON "Snapshot"("adId", "snapshotDate");

-- CreateIndex
CREATE INDEX "Snapshot_snapshotDate_idx" ON "Snapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "CollectionAd_collectionId_idx" ON "CollectionAd"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionAd_adId_idx" ON "CollectionAd"("adId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionAd_collectionId_adId_key" ON "CollectionAd"("collectionId", "adId");

-- CreateIndex
CREATE INDEX "ScrapeJob_advertiserId_idx" ON "ScrapeJob"("advertiserId");

-- CreateIndex
CREATE INDEX "ScrapeJob_status_idx" ON "ScrapeJob"("status");

-- CreateIndex
CREATE INDEX "ScrapeJob_createdAt_idx" ON "ScrapeJob"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAdvertiser" ADD CONSTRAINT "UserAdvertiser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAdvertiser" ADD CONSTRAINT "UserAdvertiser_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAd" ADD CONSTRAINT "CollectionAd_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAd" ADD CONSTRAINT "CollectionAd_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
