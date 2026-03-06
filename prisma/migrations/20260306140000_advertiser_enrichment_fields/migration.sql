-- AlterTable
ALTER TABLE "Advertiser" ADD COLUMN     "headquartersState" TEXT,
ADD COLUMN     "followers" INTEGER,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "specialties" JSONB,
ADD COLUMN     "funding" JSONB;
