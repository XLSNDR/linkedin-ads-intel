/**
 * Full test: scrape LinkedIn Ads Library → upload images → save to DB.
 *
 * 1. In Supabase Dashboard → Storage, create a bucket named "ad-creatives" (public).
 * 2. Add to .env:
 *    NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 * 3. Get a company ID from https://www.linkedin.com/ad-library/ (authorCompanyId in URL).
 * 4. Replace TEST_COMPANY_ID below, then run:
 *    npx tsx scripts/test-scraper.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { scrapeAdvertiser } from "../src/lib/scraper/linkedin-scraper";
import { saveAdvertiserAds } from "../src/lib/db/save-ad";
import { detectAdFormat } from "../src/lib/scraper/format-detector";

const TEST_COMPANY_ID = "69255797"; // ELIX – from LinkedIn Ads Library
const TEST_COMPANY_NAME = "ELIX";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("Scraping company:", TEST_COMPANY_ID, TEST_COMPANY_NAME);
  const { ads, title } = await scrapeAdvertiser(TEST_COMPANY_ID, {
    limit: 3, // First 3 ELIX ads: Video, Event, Single Image
    detailLimit: 3, // Visit each detail page for full copy, runtime, impressions, targeting
    screenshotPath: "scraper-debug-screenshot.png",
  });

  console.log("Page title:", title);
  console.log("Ads scraped:", ads.length);

  const formats = ads.map((ad) =>
    detectAdFormat({
      aboutTheAdFormat: ad.aboutTheAdFormat,
      hasPromotedBy: ad.hasPromotedBy,
      hasImageFile: !!ad.imageUrl,
    })
  );
  console.log("Formats detected:", formats);

  if (ads.length === 0) {
    console.log("No ads to save. Check SELECTORS in linkedin-scraper.ts for your LinkedIn page.");
    await prisma.$disconnect();
    return;
  }

  const { saved, advertiserId } = await saveAdvertiserAds(
    prisma,
    TEST_COMPANY_ID,
    TEST_COMPANY_NAME,
    ads
  );

  console.log("Saved", saved, "ads for advertiser", advertiserId);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
