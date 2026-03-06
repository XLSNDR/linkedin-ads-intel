-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "linkedinScraper" TEXT NOT NULL DEFAULT 'apify',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Advertiser" ADD COLUMN     "description" TEXT,
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "headquartersCity" TEXT,
ADD COLUMN     "headquartersCountry" TEXT,
ADD COLUMN     "slogan" TEXT,
ADD COLUMN     "coverImageUrl" TEXT;
